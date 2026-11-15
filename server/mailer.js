// Sending email.
//
// The game sends three kinds of email, all of them about a player's own
// account: "confirm your email address", "choose a new password" and "your
// password was changed". What they say and when they are sent is decided in
// accounts.js. This file only hands a finished message to the company that
// delivers it (Brevo).
//
// HOW IT IS SENT
// With one ordinary web request to Brevo's address, the same way a browser
// asks for a page. No library is needed for that. (The classic way to send
// email uses other "doors" of the internet, which our hosting company keeps
// shut on its free plan.)
//
// THE KEY
// Brevo only accepts messages that come with our secret key. The key is a
// setting kept outside the code (BREVO_API_KEY, see start.js). It is never
// written to the log and never sent anywhere but to Brevo.
//
// A "mailer" is anything with send({ to, subject, text }). There are two:
// the real one, and a pretend one that prints the message in the terminal
// instead of sending it (for "npm run start:pretend" and for the tests).

import { checkEmail } from "../shared/account-rules.js";

const BREVO_ADDRESS = "https://api.brevo.com/v3/smtp/email";

/** The name our emails come from. */
export const SENDER_NAME = "Nova SBE kart racer";

/**
 * Makes the real mailer.
 *   apiKey         our secret key at Brevo
 *   from           the address our emails come from. It has to be one that
 *                  was confirmed at Brevo
 *   fetchFunction  the tool for web requests. Only the tests change it
 *   timeoutMs      how long to wait for Brevo before giving up
 *
 * send() gives true when Brevo took the message. Otherwise it fails with
 * an error that says what went wrong, without the key and without the
 * address of the person the message was for.
 */
export function createBrevoMailer({ apiKey, from, fetchFunction = fetch, timeoutMs = 10_000 }) {
  if (typeof apiKey !== "string" || apiKey === "") {
    throw new Error("Mailer: the key of the email service is missing");
  }
  if (checkEmail(from) !== null) {
    throw new Error("Mailer: the address our emails come from is not an email address");
  }
  return {
    async send({ to, subject, text }) {
      if (checkEmail(to) !== null || typeof subject !== "string" || typeof text !== "string") {
        throw new Error("Mailer: a message needs an email address, a subject and a text");
      }
      let response;
      try {
        response = await fetchFunction(BREVO_ADDRESS, {
          method: "POST",
          headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            sender: { name: SENDER_NAME, email: from },
            to: [{ email: to.trim() }],
            subject,
            textContent: text,
            htmlContent: htmlFromText(text),
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch {
        // Nothing of the original error is passed on: it could name the address or the key.
        throw new Error("the email service could not be reached");
      }
      if (!response.ok) {
        throw new Error(`the email service answered with number ${response.status}`);
      }
      return true;
    },
  };
}

/**
 * Makes a pretend mailer: it sends nothing and prints each message instead,
 * so that the links can be tried on a laptop without an email service.
 */
export function createPretendMailer(log = console.log) {
  return {
    async send({ to, subject, text }) {
      log(`\n--- PRETEND EMAIL (nothing was sent) ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n--- end of the pretend email ---\n`);
      return true;
    },
  };
}

/**
 * The same message as a small web page, which is what most email programs
 * show. Every character of the text that means something in HTML is
 * replaced by its harmless spelling first, so nothing in a message can
 * ever act as code. Then line breaks become line breaks, and an address
 * that starts with http:// or https:// becomes a link.
 */
export function htmlFromText(text) {
  const harmless = String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
  const withLinks = harmless.replace(/https?:\/\/[^\s<]+/g, (address) => `<a href="${address}">${address}</a>`);
  return `<p>${withLinks.replaceAll("\n\n", "</p><p>").replaceAll("\n", "<br>")}</p>`;
}

/**
 * The address of our own site, checked, for writing links into emails:
 * "https://novasbe-kart.onrender.com". Gives null for anything that is not
 * a plain http or https address.
 *
 * Links in emails are always built from this setting and never from what a
 * browser says our name is. A request can claim any name, and a link built
 * from it would send a player's secret link to someone else's site.
 */
export function siteAddressFrom(setting) {
  if (typeof setting !== "string" || setting === "") {
    return null;
  }
  try {
    const address = new URL(setting);
    return address.protocol === "https:" || address.protocol === "http:" ? address.origin : null;
  } catch {
    return null;
  }
}

/**
 * Reads the settings for email (see start.js) and gives { mailer,
 * siteAddress }, or null when email is not set up. Then the game runs
 * without email: accounts work as before, and nothing can be reset.
 *   BREVO_API_KEY   our secret key at Brevo
 *   EMAIL_FROM      the address our emails come from
 *   PUBLIC_URL      the address of our site. On Render it is not needed:
 *                   Render tells the server its own address (RENDER_EXTERNAL_URL)
 * A value that still says "replace-with..." (copied from .env.example) counts as missing.
 */
export function emailFromSettings(settings) {
  const real = (value) => (typeof value === "string" && value !== "" && !value.startsWith("replace-with") ? value : null);
  const apiKey = real(settings.BREVO_API_KEY);
  const from = real(settings.EMAIL_FROM);
  const siteAddress = siteAddressFrom(real(settings.PUBLIC_URL) ?? real(settings.RENDER_EXTERNAL_URL));
  if (apiKey === null || from === null || siteAddress === null || checkEmail(from) !== null) {
    return null;
  }
  return { mailer: createBrevoMailer({ apiKey, from: from.trim() }), siteAddress };
}
