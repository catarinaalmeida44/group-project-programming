// Tests for the NOVA SBE logo on the menu (client/index.html,
// client/style.css and client/images/nova-sbe-logo.png).
//
// The menu used to show "Nova SBE" as words on a red label. It now shows
// the school's own logo, in white for the dark menu. These tests check:
//   - the logo is on the menu, from our own site (the page may load nothing
//     from another website), and the file is really there and is a PNG;
//   - it still says "Nova SBE" for screen readers and if the picture fails;
//   - it has a width and height, so the menu does not jump as it loads;
//   - the old red label is gone, and "kart racer" is still under the logo.
// How it looks is checked by eye in a browser.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";

const CLIENT_FOLDER = new URL("../client/", import.meta.url);
const read = (name) => readFileSync(new URL(name, CLIENT_FOLDER), "utf8");

/**
 * The text without its comments, so explanations in comments are not taken
 * for parts of the page. It walks through the text instead of using one
 * search-and-replace: a replace can leave a new "<!--" behind where two
 * pieces meet (GitHub's code scanning warned about that), and a comment
 * that is never closed runs to the end, as it does in a browser.
 */
function withoutComments(text, open, close) {
  // Taking one comment out can join the pieces around it into a new
  // opening, so go again until none is left.
  let before;
  do {
    before = text;
    text = cutCommentsOnce(text, open, close);
  } while (text !== before);
  return text;
}

function cutCommentsOnce(text, open, close) {
  let kept = "";
  let at = 0;
  for (;;) {
    const start = text.indexOf(open, at);
    if (start === -1) return kept + text.slice(at);
    kept += text.slice(at, start);
    const end = text.indexOf(close, start + open.length);
    if (end === -1) return kept;
    at = end + close.length;
  }
}

const page = withoutComments(read("index.html"), "<!--", "-->");
const style = withoutComments(read("style.css"), "/*", "*/");
const title = page.match(/<h1 class="game-title">([\s\S]*?)<\/h1>/)?.[1] ?? "";
const logo = title.match(/<img\b[^>]*>/)?.[0] ?? "";
const attribute = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1] ?? null;

describe("taking the comments out before checking", () => {
  it("leaves no comment opening behind, even where pieces meet or one is never closed", () => {
    expect(withoutComments("a<!-- x -->b", "<!--", "-->")).toBe("ab");
    expect(withoutComments("<!<!-- x -->-- y -->", "<!--", "-->")).not.toContain("<!--");
    expect(withoutComments("a<!-- never closed <img>", "<!--", "-->")).toBe("a");
    expect(withoutComments("a/* x */b", "/*", "*/")).toBe("ab");
  });
});

describe("the NOVA SBE logo on the menu", () => {
  it("is a picture inside the game title", () => {
    expect(title).not.toBe("");
    expect(logo).not.toBe("");
    expect(attribute(logo, "class")).toBe("title-logo");
  });

  it("comes from our own site, from a file that is really there", () => {
    const source = attribute(logo, "src");
    expect(source).toBe("images/nova-sbe-logo.png");
    expect(source).not.toMatch(/^(https?:)?\/\//);
    const file = new URL(source, CLIENT_FOLDER);
    expect(existsSync(file)).toBe(true);
    // Every PNG file starts with these eight bytes.
    expect([...readFileSync(file).subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  it("still says Nova SBE to screen readers and when the picture cannot load", () => {
    expect(attribute(logo, "alt")).toBe("Nova SBE");
  });

  it("has its width and height written down, so the menu does not jump while it loads", () => {
    expect(Number(attribute(logo, "width"))).toBeGreaterThan(0);
    expect(Number(attribute(logo, "height"))).toBeGreaterThan(0);
  });

  it("keeps its shape: the style sets its width and lets the height follow", () => {
    const rule = style.match(/\.title-logo\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(rule).toMatch(/width:/);
    expect(rule).toMatch(/height:\s*auto/);
  });

  it("does not show the old red Nova SBE label any more", () => {
    expect(page).not.toContain("title-place");
    expect(style).not.toContain(".title-place");
  });

  it("keeps the words kart racer under the logo", () => {
    expect(title).toContain('class="title-name"');
    expect(title.indexOf("<img")).toBeLessThan(title.indexOf("title-name"));
  });
});
