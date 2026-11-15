// Tests for email on the pages, without a browser:
//   shared/account-rules.js  what counts as an email address
//   client/email-view.js     the words, the forms, and reading a link
//   client/account.js        asking the server, with a pretend server
//
// (The server's side is in email.test.js and api-email.test.js.)

import { describe, it, expect } from "vitest";
import { checkEmail, emailKey, EMAIL_MAX, PASSWORD_MIN } from "../shared/account-rules.js";
import {
  readLink,
  emailStatusText,
  emailFormErrors,
  removeEmailErrors,
  forgotFormErrors,
  resetFormErrors,
  emailRefusalErrors,
  resetRefusalErrors,
  resetDoneText,
  NO_EMAIL_TEXT,
  EMAIL_OFF_TEXT,
} from "../client/email-view.js";
import { NO_ERRORS, hasErrors } from "../client/account-view.js";
import { NO_REASON } from "../client/answers.js";
import { createAccount } from "../client/account.js";

/** A password that is long enough. It only ever exists in these tests. */
const PASSWORD = "correct horse battery";

describe("what counts as an email address", () => {
  it("accepts ordinary addresses, and forgives a space before or after", () => {
    for (const email of ["ana@example.com", "Ana.Silva+kart@novasbe.pt", "a_b-c@sub.domain.example", "  ana@example.com  ", "12345@students.novasbe.pt"]) {
      expect(checkEmail(email), email).toBe(null);
    }
  });

  it("refuses what is not one, with a sentence for the player", () => {
    for (const email of ["", "   ", "ana", "ana@", "@example.com", "ana@example", "ana@.com", "ana@example.", "ana example@x.com", "ana@exam ple.com", "a@b@c.com", "<ana@example.com>", "ana@example.com,eve@example.com", "ana@example.com\nBcc: eve@example.com", 'ana"@example.com', "ana@exa_mple.com"]) {
      expect(typeof checkEmail(email), JSON.stringify(email)).toBe("string");
    }
    for (const notText of [undefined, null, 42, {}, ["ana@example.com"], true]) {
      expect(typeof checkEmail(notText)).toBe("string");
    }
  });

  it("refuses an address that is too long", () => {
    const longest = `${"a".repeat(EMAIL_MAX - "@example.com".length)}@example.com`;
    expect(longest).toHaveLength(EMAIL_MAX);
    expect(checkEmail(longest)).toBe(null);
    expect(checkEmail(`a${longest}`)).toContain("at most");
  });

  it("treats two spellings of one address as the same", () => {
    expect(emailKey(" Ana@Example.COM ")).toBe("ana@example.com");
    expect(emailKey("ana@example.com")).toBe("ana@example.com");
  });
});

describe("reading a link from the end of the page's address", () => {
  const secret = "aB3_-".repeat(8) + "xyz"; // 43 characters, like the server makes

  it("finds the kind and the secret of our two kinds of link", () => {
    expect(readLink(`#confirm=${secret}`)).toEqual({ kind: "confirm", secret });
    expect(readLink(`#reset=${secret}`)).toEqual({ kind: "reset", secret });
  });

  it("gives null for anything else, so that nothing odd is ever sent to the server", () => {
    for (const hash of ["", "#", `#delete=${secret}`, `confirm=${secret}`, "#confirm=", "#confirm=short", `#confirm=${secret}&x=1`, `#confirm=${secret} `, `#reset=${"a".repeat(51)}`, `#reset=${secret.slice(0, 20)}<script>`, `#confirm=${secret}#reset=${secret}`, null, undefined, 42, {}]) {
      expect(readLink(hash), String(hash)).toBe(null);
    }
  });
});

describe("what 'Your account' says about the email address", () => {
  it("shows the address, or that there is none, or that this server cannot send email", () => {
    expect(emailStatusText({ available: true, email: "ana@example.com" })).toBe("Your email address: ana@example.com");
    expect(emailStatusText({ available: true, email: null })).toBe(NO_EMAIL_TEXT);
    expect(emailStatusText({ available: false, email: null })).toBe(EMAIL_OFF_TEXT);
    // An address that is already there is still shown when email is switched off: it can be taken away.
    expect(emailStatusText({ available: false, email: "ana@example.com" })).toContain("ana@example.com");
  });

  it("says email is not set up when the answer is missing or strange", () => {
    for (const strange of [null, undefined, "yes", 42, {}, { available: "true" }, { available: true, email: 42 }]) {
      const text = emailStatusText(strange);
      expect([EMAIL_OFF_TEXT, NO_EMAIL_TEXT], JSON.stringify(strange)).toContain(text);
    }
    expect(emailStatusText(null)).toBe(EMAIL_OFF_TEXT);
  });
});

describe("what is wrong with an email form, before anything is sent", () => {
  it("finds nothing wrong with an address and a password that keep the rules", () => {
    expect(hasErrors(emailFormErrors(PASSWORD, "ana@example.com"))).toBe(false);
    expect(hasErrors(removeEmailErrors(PASSWORD))).toBe(false);
    expect(hasErrors(forgotFormErrors("ana@example.com"))).toBe(false);
    expect(hasErrors(resetFormErrors(PASSWORD))).toBe(false);
  });

  it("says what is wrong under the box it is about", () => {
    expect(emailFormErrors(PASSWORD, "ana").email).toContain("email address");
    expect(emailFormErrors(PASSWORD, "ana").password).toBe(null);
    expect(emailFormErrors("", "ana@example.com").password).toContain(`at least ${PASSWORD_MIN}`);
    expect(removeEmailErrors("short").password).toContain(`at least ${PASSWORD_MIN}`);
    expect(forgotFormErrors("").email).toBe("Type an email address.");
    expect(resetFormErrors("short").newPassword).toContain(`at least ${PASSWORD_MIN}`);
    expect(resetFormErrors(undefined).newPassword).toContain(`at least ${PASSWORD_MIN}`);
  });

  it("shows a 'no' about the address under the email box, and any other for the form as a whole", () => {
    for (const code of ["invalid_email", "same_email", "email_taken"]) {
      expect(emailRefusalErrors({ ok: false, code, message: "No." }), code).toEqual({ ...NO_ERRORS, email: "No." });
    }
    for (const code of ["wrong_login", "locked", "too_many_emails", "too_many_attempts", "email_unavailable", "not_signed_in", "offline", "something_new"]) {
      expect(emailRefusalErrors({ ok: false, code, message: "No." }), code).toEqual({ ...NO_ERRORS, form: "No." });
    }
    expect(emailRefusalErrors(null).form).toBe(NO_REASON);
  });

  it("shows a 'no' about the new password under its box, and a link that no longer works for the form as a whole", () => {
    expect(resetRefusalErrors({ ok: false, code: "invalid_password", message: "Too short." })).toEqual({ ...NO_ERRORS, newPassword: "Too short." });
    expect(resetRefusalErrors({ ok: false, code: "bad_link", message: "This link does not work any more." })).toEqual({
      ...NO_ERRORS,
      form: "This link does not work any more.",
    });
    expect(resetRefusalErrors(undefined).form).toBe(NO_REASON);
  });

  it("names the account after a new password was set, when the server said whose it is", () => {
    expect(resetDoneText("Ana")).toContain("for Ana");
    expect(resetDoneText("Ana")).toContain("sign in again");
    for (const strange of [undefined, null, "", 42]) {
      expect(resetDoneText(strange)).not.toContain(" for ");
    }
  });
});

describe("email, with a pretend server", () => {
  /** An account with a pretend api that writes down what it was asked. */
  function setUp(answers = {}) {
    const asked = [];
    const changes = [];
    const api = {};
    for (const name of ["setEmail", "removeEmail", "forgotPassword"]) {
      api[name] = async (...sent) => {
        asked.push({ name, sent });
        const prepared = answers[name];
        return typeof prepared === "function" ? prepared(...sent) : prepared;
      };
    }
    const account = createAccount({ api, onChange: (me) => changes.push(me) });
    return { account, asked, changes };
  }

  it("sends the password and the address to add an email, without the spaces typed round the address", async () => {
    const { account, asked, changes } = setUp({ setEmail: { ok: true } });
    expect(await account.setEmail(PASSWORD, "  ana@example.com ")).toEqual({ ok: true, errors: NO_ERRORS });
    expect(asked).toEqual([{ name: "setEmail", sent: [PASSWORD, "ana@example.com"] }]);
    expect(changes).toEqual([]); // nothing about who is signed in changed
  });

  it("sends nothing when the address or the password is not usable", async () => {
    const { account, asked } = setUp({ setEmail: { ok: true }, removeEmail: { ok: true }, forgotPassword: { ok: true } });
    expect((await account.setEmail(PASSWORD, "ana")).errors.email).toContain("email address");
    expect((await account.setEmail("", "ana@example.com")).errors.password).toContain(`at least ${PASSWORD_MIN}`);
    expect((await account.removeEmail("")).errors.password).toContain(`at least ${PASSWORD_MIN}`);
    expect((await account.forgotPassword("ana@")).errors.email).toContain("email address");
    expect(asked).toEqual([]);
  });

  it("shows the server's sentence where it belongs when it says no", async () => {
    const taken = { ok: false, code: "same_email", message: "That is already the email address of your account." };
    const wrong = { ok: false, code: "wrong_login", message: "That is not your password." };
    const first = setUp({ setEmail: taken });
    expect((await first.account.setEmail(PASSWORD, "ana@example.com")).errors).toEqual({ ...NO_ERRORS, email: taken.message });
    const second = setUp({ setEmail: wrong, removeEmail: wrong });
    expect((await second.account.setEmail(PASSWORD, "ana@example.com")).errors).toEqual({ ...NO_ERRORS, form: wrong.message });
    expect((await second.account.removeEmail(PASSWORD)).errors).toEqual({ ...NO_ERRORS, form: wrong.message });
  });

  it("takes the address off with only the password", async () => {
    const { account, asked } = setUp({ removeEmail: { ok: true } });
    expect((await account.removeEmail(PASSWORD)).ok).toBe(true);
    expect(asked).toEqual([{ name: "removeEmail", sent: [PASSWORD] }]);
  });

  it("asks for a link with only the address, and nobody has to be signed in", async () => {
    const { account, asked, changes } = setUp({ forgotPassword: { ok: true } });
    expect(await account.forgotPassword(" Ana@Example.com ")).toEqual({ ok: true, errors: NO_ERRORS });
    expect(asked).toEqual([{ name: "forgotPassword", sent: ["Ana@Example.com"] }]);
    expect(changes).toEqual([]);
  });

  it("shows a calm sentence when the server cannot be reached or answers nonsense", async () => {
    for (const broken of [null, undefined, "no", { ok: "yes" }, () => Promise.reject(new Error("offline"))]) {
      const { account } = setUp({ setEmail: broken, forgotPassword: broken });
      expect((await account.setEmail(PASSWORD, "ana@example.com")).errors.form).toBe(NO_REASON);
      expect((await account.forgotPassword("ana@example.com")).errors.form).toBe(NO_REASON);
    }
  });

  it("never gives the password back, in anything it returns or tells the page", async () => {
    const secret = "my-very-secret-password";
    for (const prepared of [{ ok: true }, { ok: false, code: "wrong_login", message: "That is not your password." }, null]) {
      const { account, changes } = setUp({ setEmail: prepared, removeEmail: prepared });
      const results = [await account.setEmail(secret, "ana@example.com"), await account.setEmail(secret, "ana"), await account.removeEmail(secret)];
      expect(JSON.stringify(results)).not.toContain(secret);
      expect(JSON.stringify(changes)).not.toContain(secret);
    }
  });
});
