// Tests for server/mailer.js: handing a finished email to the company that
// delivers it. No email is ever sent here: the "web request" is a pretend
// one that writes down what it was asked.

import { describe, it, expect } from "vitest";
import {
  createBrevoMailer,
  createPretendMailer,
  htmlFromText,
  siteAddressFrom,
  emailFromSettings,
  SENDER_NAME,
} from "../server/mailer.js";

const KEY = "pretend-key-0123456789"; // a made-up key, only for these tests
const MESSAGE = { to: "ana@example.com", subject: "Hello", text: "First line\nSecond line" };

/** A pretend web request tool. "answer" is what the service says back, or an error to fail with. */
function pretendFetch(answer = { ok: true, status: 201 }) {
  const asked = [];
  const fetchFunction = async (address, options) => {
    asked.push({ address, options });
    if (answer instanceof Error) {
      throw answer;
    }
    return answer;
  };
  return { asked, fetchFunction };
}

describe("sending an email through the service", () => {
  it("hands over the message in the service's format, with our key in a header", async () => {
    const { asked, fetchFunction } = pretendFetch();
    const mailer = createBrevoMailer({ apiKey: KEY, from: "game@example.com", fetchFunction });
    expect(await mailer.send(MESSAGE)).toBe(true);

    expect(asked).toHaveLength(1);
    expect(asked[0].address).toBe("https://api.brevo.com/v3/smtp/email");
    expect(asked[0].options.method).toBe("POST");
    expect(asked[0].options.headers["api-key"]).toBe(KEY);
    expect(asked[0].options.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(asked[0].options.body)).toEqual({
      sender: { name: SENDER_NAME, email: "game@example.com" },
      to: [{ email: "ana@example.com" }],
      subject: "Hello",
      textContent: "First line\nSecond line",
      htmlContent: "<p>First line<br>Second line</p>",
    });
  });

  it("puts the key in the header only, never in the message", async () => {
    const { asked, fetchFunction } = pretendFetch();
    await createBrevoMailer({ apiKey: KEY, from: "game@example.com", fetchFunction }).send(MESSAGE);
    expect(asked[0].options.body).not.toContain(KEY);
  });

  it("gives up waiting after a while instead of hanging", async () => {
    const { asked, fetchFunction } = pretendFetch();
    await createBrevoMailer({ apiKey: KEY, from: "game@example.com", fetchFunction }).send(MESSAGE);
    expect(asked[0].options.signal).toBeInstanceOf(AbortSignal);
  });

  it("refuses to be made without a key, or with a sender that is not an email address", () => {
    for (const apiKey of [undefined, null, "", 42]) {
      expect(() => createBrevoMailer({ apiKey, from: "game@example.com" })).toThrow();
    }
    for (const from of [undefined, "", "not-an-address", "a@b", "two words@example.com"]) {
      expect(() => createBrevoMailer({ apiKey: KEY, from })).toThrow();
    }
  });

  it("refuses a message without a usable address, subject or text, and sends nothing", async () => {
    const { asked, fetchFunction } = pretendFetch();
    const mailer = createBrevoMailer({ apiKey: KEY, from: "game@example.com", fetchFunction });
    for (const broken of [
      { ...MESSAGE, to: "not-an-address" },
      { ...MESSAGE, to: "ana@example.com, eve@example.com" }, // two addresses in one: refused
      { ...MESSAGE, to: null },
      { ...MESSAGE, subject: undefined },
      { ...MESSAGE, text: 42 },
    ]) {
      await expect(mailer.send(broken)).rejects.toThrow();
    }
    expect(asked).toEqual([]);
  });

  it("fails with the service's number when the service says no, without the key or the reader's address", async () => {
    for (const status of [400, 401, 429, 500]) {
      const { fetchFunction } = pretendFetch({ ok: false, status });
      const mailer = createBrevoMailer({ apiKey: KEY, from: "game@example.com", fetchFunction });
      const error = await mailer.send(MESSAGE).catch((caught) => caught);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain(String(status));
      expect(error.message).not.toContain(KEY);
      expect(error.message).not.toContain("ana@example.com");
    }
  });

  it("fails calmly when the service cannot be reached, and passes nothing of the original error on", async () => {
    const leaky = new Error(`connect failed for ana@example.com with key ${KEY}`);
    const { fetchFunction } = pretendFetch(leaky);
    const mailer = createBrevoMailer({ apiKey: KEY, from: "game@example.com", fetchFunction });
    const error = await mailer.send(MESSAGE).catch((caught) => caught);
    expect(error.message).toBe("the email service could not be reached");
  });
});

describe("the pretend mailer", () => {
  it("sends nothing and prints the message instead, with its link", async () => {
    const printed = [];
    const mailer = createPretendMailer((text) => printed.push(text));
    expect(await mailer.send({ to: "ana@example.com", subject: "Confirm", text: "Open http://localhost:3000/link.html#confirm=abc" })).toBe(true);
    expect(printed).toHaveLength(1);
    expect(printed[0]).toContain("PRETEND EMAIL");
    expect(printed[0]).toContain("ana@example.com");
    expect(printed[0]).toContain("http://localhost:3000/link.html#confirm=abc");
  });
});

describe("the message as a small web page", () => {
  it("turns line breaks into line breaks, empty lines into paragraphs, and addresses into links", () => {
    expect(htmlFromText("Hello Ana,\n\nOpen this:\nhttps://kart.example/link.html#reset=abc_-123\n\nBye")).toBe(
      '<p>Hello Ana,</p><p>Open this:<br><a href="https://kart.example/link.html#reset=abc_-123">https://kart.example/link.html#reset=abc_-123</a></p><p>Bye</p>',
    );
  });

  it("makes every character that means something in HTML harmless, so text can never act as code", () => {
    const html = htmlFromText(`<script>alert("x")</script> & 'quotes' <img src=x onerror=alert(1)>`);
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;quotes&#39;");
  });

  it("does not let an address break out of its link", () => {
    const html = htmlFromText('https://kart.example/"onmouseover="alert(1) and <b>more</b>');
    expect(html).not.toContain('"onmouseover="');
    expect(html).not.toContain("<b>");
    expect(html.match(/<a /g)).toHaveLength(1);
  });
});

describe("the address of our own site, for links in emails", () => {
  it("keeps the plain address and drops anything after it", () => {
    expect(siteAddressFrom("https://novasbe-kart.onrender.com")).toBe("https://novasbe-kart.onrender.com");
    expect(siteAddressFrom("https://novasbe-kart.onrender.com/")).toBe("https://novasbe-kart.onrender.com");
    expect(siteAddressFrom("https://novasbe-kart.onrender.com/some/page?x=1#y")).toBe("https://novasbe-kart.onrender.com");
    expect(siteAddressFrom("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("gives null for anything that is not a plain web address", () => {
    for (const bad of [undefined, null, "", 42, {}, "novasbe-kart.onrender.com", "javascript:alert(1)", "ftp://example.com", "mailto:a@b.c", "not an address"]) {
      expect(siteAddressFrom(bad), String(bad)).toBe(null);
    }
  });
});

describe("reading the settings for email", () => {
  const full = { BREVO_API_KEY: KEY, EMAIL_FROM: "game@example.com", PUBLIC_URL: "https://kart.example" };

  it("sets email up when the key, the sender and the address of the site are all there", () => {
    const email = emailFromSettings(full);
    expect(email.siteAddress).toBe("https://kart.example");
    expect(typeof email.mailer.send).toBe("function");
  });

  it("takes the address of the site from the hosting company when we did not set one, and ours wins when we did", () => {
    const hosted = { BREVO_API_KEY: KEY, EMAIL_FROM: "game@example.com", RENDER_EXTERNAL_URL: "https://novasbe-kart.onrender.com" };
    expect(emailFromSettings(hosted).siteAddress).toBe("https://novasbe-kart.onrender.com");
    expect(emailFromSettings({ ...hosted, PUBLIC_URL: "https://kart.example" }).siteAddress).toBe("https://kart.example");
  });

  it("runs without email when any of the three is missing, empty or not usable", () => {
    expect(emailFromSettings({})).toBe(null);
    for (const name of Object.keys(full)) {
      for (const value of [undefined, "", null]) {
        expect(emailFromSettings({ ...full, [name]: value }), `${name}=${value}`).toBe(null);
      }
    }
    expect(emailFromSettings({ ...full, EMAIL_FROM: "not-an-address" })).toBe(null);
    expect(emailFromSettings({ ...full, PUBLIC_URL: "javascript:alert(1)" })).toBe(null);
  });

  it("does not take the made-up values of the example file for real ones", () => {
    expect(emailFromSettings({ ...full, BREVO_API_KEY: "replace-with-the-key-from-brevo" })).toBe(null);
    expect(emailFromSettings({ ...full, EMAIL_FROM: "replace-with-the-sender-address@example.com" })).toBe(null);
  });
});
