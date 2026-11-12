// Tests for how the menu page is put together: client/index.html,
// client/style.css and client/page-parts.js.
//
// These tests read the files as text and check rules that keep the page
// safe and usable. How the menu looks is checked by eye in a browser.
//
// Why these rules:
//   - The server will tell browsers to run only code that comes from our own
//     files (a "Content-Security-Policy"). So the page may hold no code and
//     no styles of its own, and may load nothing from another website.
//   - Names and times from the server are other people's text. They must be
//     put on the page as plain text, never as HTML, so they cannot become
//     part of the page.
//   - A password must never end up in an address, and every box needs a
//     label that screen readers can read out.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { makePart } from "../client/page-parts.js";

const CLIENT_FOLDER = new URL("../client/", import.meta.url);

function readClientFile(name) {
  return readFileSync(new URL(name, CLIENT_FOLDER), "utf8");
}

const page = readClientFile("index.html");
const style = readClientFile("style.css");

/** The page without its comments, so that explanations in comments are not mistaken for parts of the page. */
const pageWithoutComments = page.replace(/<!--[\s\S]*?-->/g, "");

/** Every opening tag of one kind in the page, such as all "<input ...>". */
function tags(name) {
  return pageWithoutComments.match(new RegExp(`<${name}\\b[^>]*>`, "g")) ?? [];
}

/** The value of an attribute in a tag, or null: attribute('<a href="/x">', "href") is "/x". */
function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return match ? match[1] : null;
}

/** The part of the page from the opening tag with this id up to the matching closing tag name. */
function partWithId(id, tagName) {
  const start = pageWithoutComments.indexOf(`id="${id}"`);
  expect(start, `id="${id}" is in the page`).toBeGreaterThan(-1);
  const end = pageWithoutComments.indexOf(`</${tagName}>`, start);
  return pageWithoutComments.slice(start, end);
}

describe("making parts of the page from code", () => {
  /** A pretend page: it makes plain objects instead of real parts. */
  const fakePage = { createElement: (tag) => ({ tag, className: "", textContent: "" }) };

  it("makes a part with its kind, its look and its text", () => {
    expect(makePart(fakePage, "span", "row-name", "Ana")).toEqual({ tag: "span", className: "row-name", textContent: "Ana" });
    expect(makePart(fakePage, "li")).toEqual({ tag: "li", className: "", textContent: "" });
  });

  it("puts text that looks like HTML in as plain text, unchanged", () => {
    for (const nasty of ['<img src=x onerror="alert(1)">', "<script>alert(1)</script>", "</span><b>bold", "a & b < c"]) {
      const part = makePart(fakePage, "span", "row-name", nasty);
      expect(part.textContent).toBe(nasty);
      // Nothing else was set on the part: only its kind, its look and its text.
      expect(Object.keys(part).sort()).toEqual(["className", "tag", "textContent"]);
    }
  });

  it("turns a number into text", () => {
    expect(makePart(fakePage, "span", "row-rank", 7).textContent).toBe("7");
  });
});

describe("the code of the pages never builds HTML out of text", () => {
  it("uses none of the browser's ways of turning text into parts of the page, or into code", () => {
    const risky = /innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function\b|setAttribute\(\s*["']on/;
    const codeFiles = readdirSync(CLIENT_FOLDER).filter((name) => name.endsWith(".js"));
    expect(codeFiles.length).toBeGreaterThan(10);
    for (const name of codeFiles) {
      const match = readClientFile(name).match(risky);
      expect(match, `${name} uses ${match?.[0]}: put text on the page with textContent instead (see client/page-parts.js)`).toBeNull();
    }
  });
});

describe("the menu page holds no code or styles of its own, and loads nothing from elsewhere", () => {
  it("has no code written into the page: every script comes from a file of ours", () => {
    const scripts = tags("script");
    expect(scripts.length).toBeGreaterThan(0);
    for (const script of scripts) {
      expect(attribute(script, "src"), script).toMatch(/^\/[a-z-]+\.js$/);
    }
  });

  it("has no code in attributes such as onclick", () => {
    expect(pageWithoutComments).not.toMatch(/<[^>]*\son[a-z]+\s*=/i);
    expect(pageWithoutComments).not.toMatch(/javascript:/i);
  });

  it("has no styles written into the page", () => {
    expect(pageWithoutComments).not.toMatch(/<style\b/i);
    expect(pageWithoutComments).not.toMatch(/<[^>]*\sstyle\s*=/i);
  });

  it("loads nothing from another website", () => {
    expect(pageWithoutComments).not.toMatch(/https?:\/\//i);
    expect(pageWithoutComments).not.toMatch(/(src|href)="\/\//i);
    // Everything the page links to is an address on our own server, or a part of the page itself.
    for (const tag of [...tags("link"), ...tags("script"), ...tags("a")]) {
      const address = attribute(tag, "href") ?? attribute(tag, "src");
      expect(address, tag).toMatch(/^\/(?!\/)/); // one slash at the start: a file on our own server
    }
  });

  it("has no styles that load something: no web fonts and no pictures from files", () => {
    expect(style).not.toMatch(/@import/i);
    expect(style).not.toMatch(/url\(/i);
    expect(style).not.toMatch(/https?:\/\//i);
  });
});

describe("the parts of the menu page fit together", () => {
  it("uses every id only once", () => {
    const ids = [...pageWithoutComments.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const twice = ids.filter((id, index) => ids.indexOf(id) !== index);
    expect(twice).toEqual([]);
  });

  it("gives every panel a title that screen readers read out", () => {
    const panels = tags("dialog");
    expect(panels.length).toBeGreaterThanOrEqual(6);
    for (const panel of panels) {
      const titleId = attribute(panel, "aria-labelledby");
      expect(titleId, panel).not.toBeNull();
      expect(pageWithoutComments, `the title of ${panel}`).toMatch(new RegExp(`<h2 id="${titleId}">[^<]+</h2>`));
    }
  });

  it("ties every 'described by' and 'labelled by' to a part that exists", () => {
    for (const name of ["aria-describedby", "aria-labelledby"]) {
      for (const match of pageWithoutComments.matchAll(new RegExp(`\\s${name}="([^"]+)"`, "g"))) {
        for (const id of match[1].split(" ")) {
          expect(pageWithoutComments, `${name}="${id}"`).toContain(`id="${id}"`);
        }
      }
    }
  });

  it("gives every box of a form a label of its own", () => {
    const boxes = tags("input").filter((box) => attribute(box, "id") !== null);
    expect(boxes.length).toBeGreaterThanOrEqual(8);
    for (const box of boxes) {
      expect(pageWithoutComments, `a label for ${box}`).toContain(`<label for="${attribute(box, "id")}">`);
    }
  });

  it("gives every button words that say what it does", () => {
    const buttons = [...pageWithoutComments.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
    expect(buttons.length).toBeGreaterThan(10);
    for (const [whole, attributes, inside] of buttons) {
      const words = inside.replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<[^>]+>/g, "").trim();
      const hasName = words !== "" || /\saria-label="[^"]+"/.test(attributes) || inside.includes('id="account-name"');
      expect(hasName, whole).toBe(true);
    }
  });

  it("says messages aloud: the account corner, the forms and the leaderboard have live places for them", () => {
    expect(tags("p").filter((tag) => attribute(tag, "role") === "status").length).toBeGreaterThanOrEqual(6);
    expect(pageWithoutComments).toMatch(/<p id="account-status"[^>]*role="status"/);
    expect(pageWithoutComments).toMatch(/<p id="shared-status"[^>]*role="status"/);
  });
});

describe("the account forms on the menu page", () => {
  const forms = {
    "sign-in-form": partWithId("sign-in-form", "form"),
    "sign-up-form": partWithId("sign-up-form", "form"),
    "delete-account-form": partWithId("delete-account-form", "form"),
  };

  it("can never put a password in the address of the page, even if our code did not load", () => {
    // A form without method="post" would add everything typed to the address.
    for (const id of Object.keys(forms)) {
      const tag = tags("form").find((form) => attribute(form, "id") === id);
      expect(attribute(tag, "method"), id).toBe("post");
    }
    // Every other form on the page only closes a panel.
    for (const tag of tags("form").filter((form) => attribute(form, "id") === null)) {
      expect(attribute(tag, "method")).toBe("dialog");
    }
  });

  it("asks for a user name and a password only: no email, nothing else to type", () => {
    expect(pageWithoutComments).not.toMatch(/type="email"/);
    for (const [id, form] of Object.entries(forms)) {
      const typed = (form.match(/<input\b[^>]*>/g) ?? []).filter((box) => attribute(box, "type") !== "checkbox");
      expect(typed.map((box) => attribute(box, "name")), id).toEqual(["username", "password"]);
    }
  });

  it("hides every password as it is typed", () => {
    for (const form of Object.values(forms)) {
      const password = form.match(/<input\b[^>]*name="password"[^>]*>/)[0];
      expect(attribute(password, "type")).toBe("password");
    }
  });

  it("tells the browser's password manager what each box is", () => {
    const autocomplete = (form, name) => attribute(form.match(new RegExp(`<input\\b[^>]*name="${name}"[^>]*>`))[0], "autocomplete");
    expect(autocomplete(forms["sign-in-form"], "username")).toBe("username");
    expect(autocomplete(forms["sign-in-form"], "password")).toBe("current-password");
    expect(autocomplete(forms["sign-up-form"], "username")).toBe("username");
    expect(autocomplete(forms["sign-up-form"], "password")).toBe("new-password");
    expect(autocomplete(forms["delete-account-form"], "username")).toBe("username");
    expect(autocomplete(forms["delete-account-form"], "password")).toBe("current-password");
  });

  it("has a place for what is wrong under each box, and one for the form as a whole", () => {
    expect(forms["sign-in-form"].match(/data-error-for="(\w+)"/g)).toEqual([
      'data-error-for="username"',
      'data-error-for="password"',
      'data-error-for="form"',
    ]);
    expect(forms["sign-up-form"].match(/data-error-for="(\w+)"/g)).toEqual([
      'data-error-for="username"',
      'data-error-for="password"',
      'data-error-for="form"',
    ]);
    expect(forms["delete-account-form"].match(/data-error-for="(\w+)"/g)).toEqual([
      'data-error-for="password"',
      'data-error-for="confirm"',
      'data-error-for="form"',
    ]);
  });

  it("makes deleting an account ask for the password and a tick, and says what will be deleted", () => {
    const panel = partWithId("your-account", "dialog");
    expect(panel).toContain("deletes your account and all your saved results");
    expect(panel).toContain("cannot be");
    expect(forms["delete-account-form"]).toMatch(/<input id="delete-confirm" name="confirm" type="checkbox"/);
    expect(forms["delete-account-form"]).toMatch(/name="password" type="password"/);
  });
});

describe("the colours and the motion of the pages", () => {
  /** The named colours at the top of style.css: { "--navy": "#10202b", ... }. */
  const colours = Object.fromEntries([...style.matchAll(/(--[a-z-]+):\s*(#[0-9a-f]{6})\b/g)].map((match) => [match[1], match[2]]));

  /**
   * How different two colours are, by the rule of the web accessibility
   * guidelines (WCAG): from 1 (the same) to 21 (black on white). Small text
   * needs at least 4.5 to be easy to read.
   */
  function contrast(first, second) {
    const brightness = (hex) => {
      const part = (start) => {
        const value = parseInt(hex.slice(start, start + 2), 16) / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * part(1) + 0.7152 * part(3) + 0.0722 * part(5);
    };
    const [lighter, darker] = [brightness(first), brightness(second)].sort((a, b) => b - a);
    return (lighter + 0.05) / (darker + 0.05);
  }

  it("measures contrast the way the guidelines do", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it("keeps every pair of colours used for text easy to read (at least 4.5 to 1)", () => {
    const textOnGround = [
      ["--text", "--navy"],
      ["--text", "--navy-deep"],
      ["--text", "--navy-raised"],
      ["--text", "--navy-hover"],
      ["--text-quiet", "--navy"],
      ["--text-quiet", "--navy-deep"],
      ["--text-quiet", "--navy-raised"],
      ["--text-quiet", "--navy-hover"],
      ["--navy", "--yellow"], //       the yellow buttons and the chosen track
      ["--navy", "--yellow-light"],
      ["--navy", "--silver"], //       the podium
      ["--navy", "--bronze"],
      ["--red-soft", "--navy"], //     what is wrong in a form
      ["--red-soft", "--navy-raised"],
      ["--sky", "--navy"], //          links
      ["--sky", "--navy-raised"],
    ];
    for (const [text, ground] of textOnGround) {
      expect(colours[text], text).toBeDefined();
      expect(colours[ground], ground).toBeDefined();
      expect(contrast(colours[text], colours[ground]), `${text} on ${ground}`).toBeGreaterThanOrEqual(4.5);
    }
    // White on the deep red of the "Nova SBE" label and the delete button.
    expect(contrast("#ffffff", colours["--red-deep"])).toBeGreaterThanOrEqual(4.5);
  });

  it("makes the border of a typing box stand out from what is around it (at least 3 to 1)", () => {
    expect(contrast(colours["--line-strong"], colours["--navy"])).toBeGreaterThanOrEqual(3);
    expect(contrast(colours["--line-strong"], colours["--navy-deep"])).toBeGreaterThanOrEqual(3);
  });

  it("stops all motion for players who asked their computer for less motion", () => {
    const start = style.indexOf("@media (prefers-reduced-motion: reduce)");
    expect(start).toBeGreaterThan(-1);
    const rule = style.slice(start);
    expect(rule).toMatch(/animation:\s*none\s*!important/);
    expect(rule).toMatch(/transition:\s*none\s*!important/);
    // It is the last thing in the file, so nothing after it can switch motion back on.
    expect(style.slice(start).match(/@keyframes|animation:(?!\s*none)/)).toBeNull();
  });
});
