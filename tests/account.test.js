// Tests for accounts in the menu, without a browser:
//   client/answers.js       reading an answer from the server carefully
//   client/account-view.js  the words for the account corner and the forms
//   client/account.js       signing up, in and out, and deleting the account
//
// The server is a pretend one: an "api" object with the same functions as
// client/account-api.js, which writes down what it was asked and gives the
// answers the test prepared.

import { describe, it, expect } from "vitest";
import { saidYes, reasonCode, reasonText, NO_REASON } from "../client/answers.js";
import {
  readMe,
  accountCorner,
  accountFormErrors,
  deleteFormErrors,
  refusalErrors,
  hasErrors,
  NO_ERRORS,
  CHECKING_TEXT,
  UNAVAILABLE_TEXT,
  CONFIRM_TEXT,
  STILL_WAITING_TEXT,
  USERNAME_HINT,
  PASSWORD_HINT,
  NEW_PASSWORD_HINT,
  SAME_PASSWORD_TEXT,
  changeFormErrors,
  changeRefusalErrors,
} from "../client/account-view.js";
import { createAccount } from "../client/account.js";
import { USERNAME_MIN, USERNAME_MAX, PASSWORD_MIN } from "../shared/account-rules.js";

const SIGNED_OUT = { available: true, signedIn: false, username: null };
const NO_ACCOUNTS = { available: false, signedIn: false, username: null };

/** A password that is long enough. It only ever exists in these tests. */
const PASSWORD = "correct horse battery";

describe("reading an answer from the server", () => {
  it("only takes a real 'ok: true' as a yes", () => {
    expect(saidYes({ ok: true })).toBe(true);
    for (const answer of [{ ok: false }, { ok: "true" }, { ok: 1 }, {}, null, undefined, "ok", true, 1, []]) {
      expect(saidYes(answer), JSON.stringify(answer)).toBe(false);
    }
  });

  it("gives the short word for the reason, or nothing", () => {
    expect(reasonCode({ ok: false, code: "wrong_login" })).toBe("wrong_login");
    for (const answer of [{ ok: false }, { code: 42 }, { code: null }, null, undefined, "wrong_login", 7]) {
      expect(reasonCode(answer)).toBe("");
    }
  });

  it("shows the server's own sentence when there is one", () => {
    expect(reasonText({ ok: false, code: "locked", message: "Too many wrong passwords. Wait 10 minutes." })).toBe(
      "Too many wrong passwords. Wait 10 minutes.",
    );
  });

  it("shows a calm sentence of ours when the answer has no usable sentence", () => {
    for (const answer of [null, undefined, "no", 42, {}, { message: "" }, { message: "   " }, { message: 42 }, { message: null }, { message: ["a"] }]) {
      expect(reasonText(answer), JSON.stringify(answer)).toBe(NO_REASON);
    }
  });
});

describe("the account corner of the menu", () => {
  it("says it is checking while we wait for the server", () => {
    expect(accountCorner(null)).toEqual({ kind: "checking", username: null, text: CHECKING_TEXT });
  });

  it("offers to sign in or create an account when nobody is signed in", () => {
    expect(accountCorner(SIGNED_OUT)).toEqual({ kind: "signedOut", username: null, text: "" });
  });

  it("shows the player's name when someone is signed in", () => {
    expect(accountCorner({ available: true, signedIn: true, username: "Catarina_44" })).toEqual({
      kind: "signedIn",
      username: "Catarina_44",
      text: "",
    });
  });

  it("says calmly that accounts are not available when the server has none", () => {
    expect(accountCorner(NO_ACCOUNTS)).toEqual({ kind: "unavailable", username: null, text: UNAVAILABLE_TEXT });
    expect(UNAVAILABLE_TEXT).toContain("not available");
    expect(UNAVAILABLE_TEXT).toContain("You can still race");
  });

  it("treats anything that is not a clear answer as 'not available', and nobody as signed in", () => {
    for (const strange of [undefined, "signed in", 42, [], {}, { signedIn: true, username: "Ana" }, { available: "yes", signedIn: true, username: "Ana" }]) {
      expect(accountCorner(strange).kind, JSON.stringify(strange)).toBe("unavailable");
    }
  });

  it("does not believe 'signed in' without a name", () => {
    for (const username of [null, undefined, "", 42, ["Ana"]]) {
      expect(readMe({ available: true, signedIn: true, username })).toEqual(SIGNED_OUT);
    }
    expect(readMe({ available: true, signedIn: "yes", username: "Ana" })).toEqual(SIGNED_OUT);
  });

  it("keeps a name with code-like text in it exactly as it is, to be shown as plain text", () => {
    const nasty = "<script>alert(1)</script>";
    expect(accountCorner({ available: true, signedIn: true, username: nasty }).username).toBe(nasty);
  });
});

describe("what is wrong with a form, before anything is sent", () => {
  it("finds nothing wrong with a good user name and password", () => {
    expect(accountFormErrors("Catarina_44", PASSWORD)).toEqual(NO_ERRORS);
    expect(hasErrors(NO_ERRORS)).toBe(false);
  });

  it("says what is wrong with the user name, under the user name", () => {
    const errors = accountFormErrors("ab", PASSWORD);
    expect(errors.username).toContain(`at least ${USERNAME_MIN}`);
    expect(errors.password).toBeNull();
    expect(hasErrors(errors)).toBe(true);
    expect(accountFormErrors("x".repeat(USERNAME_MAX + 1), PASSWORD).username).toContain(`at most ${USERNAME_MAX}`);
    expect(accountFormErrors("ana maria", PASSWORD).username).toContain("letters");
    expect(accountFormErrors("<b>ana</b>", PASSWORD).username).not.toBeNull();
  });

  it("says what is wrong with the password, under the password", () => {
    const errors = accountFormErrors("Catarina_44", "1234567");
    expect(errors.username).toBeNull();
    expect(errors.password).toContain(`at least ${PASSWORD_MIN}`);
  });

  it("says both when both are wrong", () => {
    const errors = accountFormErrors("", "");
    expect(errors.username).not.toBeNull();
    expect(errors.password).not.toBeNull();
  });

  it("explains the rules under the boxes with the numbers from the rules themselves", () => {
    expect(USERNAME_HINT).toContain(`${USERNAME_MIN} to ${USERNAME_MAX}`);
    expect(PASSWORD_HINT).toContain(`At least ${PASSWORD_MIN}`);
  });

  it("needs both the password and the tick to delete an account", () => {
    expect(deleteFormErrors(PASSWORD, true)).toEqual(NO_ERRORS);
    expect(deleteFormErrors(PASSWORD, false)).toEqual({ ...NO_ERRORS, confirm: CONFIRM_TEXT });
    expect(deleteFormErrors("", true).password).toContain(`at least ${PASSWORD_MIN}`);
    // Only a real "true" counts as the tick.
    for (const notTicked of [undefined, null, "true", 1, "on"]) {
      expect(deleteFormErrors(PASSWORD, notTicked).confirm).toBe(CONFIRM_TEXT);
    }
  });
});

describe("where a 'no' from the server is shown", () => {
  it("puts a reason about the user name under the user name", () => {
    const taken = { ok: false, code: "username_taken", message: "Someone already has that user name." };
    expect(refusalErrors(taken)).toEqual({ ...NO_ERRORS, username: "Someone already has that user name." });
    const invalid = { ok: false, code: "invalid_username", message: "A user name needs at least 3 characters." };
    expect(refusalErrors(invalid).username).toBe("A user name needs at least 3 characters.");
  });

  it("puts a reason about the password under the password", () => {
    const invalid = { ok: false, code: "invalid_password", message: "A password needs at least 8 characters." };
    expect(refusalErrors(invalid)).toEqual({ ...NO_ERRORS, password: "A password needs at least 8 characters." });
  });

  it("shows every other reason for the form as a whole, in the server's words", () => {
    for (const code of ["wrong_login", "locked", "too_many_attempts", "not_signed_in", "unavailable", "offline", "something_new"]) {
      const message = `The server's sentence for ${code}.`;
      expect(refusalErrors({ ok: false, code, message })).toEqual({ ...NO_ERRORS, form: message });
    }
  });

  it("shows a calm sentence for an answer that is not in our format", () => {
    for (const strange of [null, undefined, "no", 42, {}, { ok: false }, { ok: false, code: 7, message: 7 }]) {
      expect(refusalErrors(strange)).toEqual({ ...NO_ERRORS, form: NO_REASON });
    }
  });
});

// Added on 13 November 2026.
describe("the 'change my password' form", () => {
  it("finds nothing wrong with a current password and a different new one that keeps the rules", () => {
    expect(changeFormErrors(PASSWORD, "another long password")).toEqual({ ...NO_ERRORS, newPassword: null });
    expect(hasErrors(changeFormErrors(PASSWORD, "another long password"))).toBe(false);
  });

  it("says what is wrong under the box it is about", () => {
    expect(changeFormErrors("", "another long password").password).toContain(`at least ${PASSWORD_MIN}`);
    expect(changeFormErrors(PASSWORD, "short").newPassword).toContain(`at least ${PASSWORD_MIN}`);
    expect(changeFormErrors(PASSWORD, "x".repeat(201)).newPassword).toContain("at most");
    expect(changeFormErrors(PASSWORD, PASSWORD).newPassword).toBe(SAME_PASSWORD_TEXT);
    for (const strange of [undefined, null, 12345678, {}]) {
      expect(hasErrors(changeFormErrors(strange, strange))).toBe(true);
    }
  });

  it("puts the hint for the new password together from the rules", () => {
    expect(NEW_PASSWORD_HINT).toContain(String(PASSWORD_MIN));
  });

  it("shows a 'no' about the new password under its box, and any other for the form as a whole", () => {
    const text = "A password needs at least 8 characters.";
    expect(changeRefusalErrors({ ok: false, code: "invalid_password", message: text })).toEqual({ ...NO_ERRORS, newPassword: text });
    expect(changeRefusalErrors({ ok: false, code: "same_password", message: text })).toEqual({ ...NO_ERRORS, newPassword: text });
    for (const code of ["wrong_login", "locked", "too_many_attempts", "not_signed_in", "unavailable", "offline", "something_new"]) {
      expect(changeRefusalErrors({ ok: false, code, message: "No." }), code).toEqual({ ...NO_ERRORS, form: "No." });
    }
    expect(changeRefusalErrors(null).form).toBe(NO_REASON);
  });
});

describe("accounts, with a pretend server", () => {
  /**
   * An account with a pretend api. "answers" says what each function of the
   * api gives back: a value, or a function that works one out. Gives the
   * account, everything the api was asked, and everything onChange was told.
   */
  function setUp(answers = {}) {
    const asked = [];
    const changes = [];
    const api = {};
    for (const name of ["getMe", "signUp", "logIn", "logOut", "deleteAccount", "changePassword"]) {
      api[name] = async (...sent) => {
        asked.push({ name, sent });
        const prepared = answers[name];
        return typeof prepared === "function" ? prepared(...sent) : prepared;
      };
    }
    const account = createAccount({ api, onChange: (me) => changes.push(me) });
    return { account, asked, changes, last: () => changes[changes.length - 1] };
  }

  describe("asking who is signed in", () => {
    it("says 'checking' first, then who is signed in", async () => {
      const { account, changes } = setUp({ getMe: { available: true, signedIn: true, username: "Ana" } });
      const done = account.check();
      expect(changes).toEqual([null]); // null means: still waiting
      await done;
      expect(changes).toEqual([null, { available: true, signedIn: true, username: "Ana" }]);
    });

    it("says nobody is signed in when the server says so", async () => {
      const { account, last } = setUp({ getMe: SIGNED_OUT });
      await account.check();
      expect(last()).toEqual(SIGNED_OUT);
    });

    it("says accounts are not available when the server has none", async () => {
      const { account, last } = setUp({ getMe: NO_ACCOUNTS });
      await account.check();
      expect(last()).toEqual(NO_ACCOUNTS);
    });

    it("says 'not available', and does not break, when the answer is strange or the api fails", async () => {
      const strangeAnswers = [
        undefined,
        null,
        "hello",
        42,
        {},
        () => {
          throw new Error("broken");
        },
      ];
      for (const getMe of strangeAnswers) {
        const { account, last } = setUp({ getMe });
        await account.check();
        expect(last()).toEqual(NO_ACCOUNTS);
      }
    });

    it("says 'not available' when there is no api at all", async () => {
      const changes = [];
      const account = createAccount({ api: null, onChange: (me) => changes.push(me) });
      await account.check();
      expect(changes).toEqual([null, NO_ACCOUNTS]);
      // And trying to sign in gives a calm sentence instead of breaking.
      const result = await account.signIn("Catarina_44", PASSWORD);
      expect(result).toEqual({ ok: false, errors: { ...NO_ERRORS, form: NO_REASON } });
    });
  });

  describe("creating an account", () => {
    it("sends the user name and the password, and then shows the player as signed in", async () => {
      const { account, asked, last } = setUp({ signUp: { ok: true, username: "Catarina_44" } });
      const result = await account.signUp("Catarina_44", PASSWORD);
      expect(result).toEqual({ ok: true, errors: NO_ERRORS });
      expect(asked).toEqual([{ name: "signUp", sent: ["Catarina_44", PASSWORD] }]);
      expect(last()).toEqual({ available: true, signedIn: true, username: "Catarina_44" });
    });

    it("sends nothing when the user name or the password breaks the rules, and says what is wrong", async () => {
      const { account, asked, changes } = setUp({ signUp: { ok: true, username: "x" } });
      const badName = await account.signUp("ab", PASSWORD);
      expect(badName.ok).toBe(false);
      expect(badName.errors.username).toContain("at least 3");

      const badPassword = await account.signUp("Catarina_44", "short");
      expect(badPassword.ok).toBe(false);
      expect(badPassword.errors.password).toContain("at least 8");

      const notText = await account.signUp(undefined, undefined);
      expect(notText.ok).toBe(false);

      expect(asked).toEqual([]);
      expect(changes).toEqual([]); // still nobody signed in
    });

    it("shows the server's sentence under the user name when the name is taken", async () => {
      const taken = { ok: false, code: "username_taken", message: "Someone already has that user name." };
      const { account, changes } = setUp({ signUp: taken });
      const result = await account.signUp("Catarina_44", PASSWORD);
      expect(result).toEqual({ ok: false, errors: { ...NO_ERRORS, username: "Someone already has that user name." } });
      expect(changes).toEqual([]);
    });

    it("drops spaces typed by accident around the user name, but never touches the password", async () => {
      const { account, asked } = setUp({ signUp: { ok: true, username: "Catarina_44" } });
      await account.signUp("  Catarina_44 ", "  spaces stay  ");
      expect(asked[0].sent).toEqual(["Catarina_44", "  spaces stay  "]);
    });

    it("shows the name the way the server spells it, or the typed one if the server sends none", async () => {
      const spelled = setUp({ signUp: { ok: true, username: "Catarina_44" } });
      await spelled.account.signUp("catarina_44", PASSWORD);
      expect(spelled.last().username).toBe("Catarina_44");

      for (const username of [undefined, "", 42, null]) {
        const unnamed = setUp({ signUp: { ok: true, username } });
        await unnamed.account.signUp("catarina_44", PASSWORD);
        expect(unnamed.last().username).toBe("catarina_44");
      }
    });
  });

  describe("signing in", () => {
    it("sends the user name and the password, and then shows the player as signed in", async () => {
      const { account, asked, last } = setUp({ logIn: { ok: true, username: "Catarina_44" } });
      const result = await account.signIn("catarina_44", PASSWORD);
      expect(result.ok).toBe(true);
      expect(asked).toEqual([{ name: "logIn", sent: ["catarina_44", PASSWORD] }]);
      expect(last()).toEqual({ available: true, signedIn: true, username: "Catarina_44" });
    });

    it("shows the server's sentence, and signs nobody in, when the password is wrong", async () => {
      const wrong = { ok: false, code: "wrong_login", message: "Wrong user name or password." };
      const { account, changes } = setUp({ logIn: wrong });
      const result = await account.signIn("Catarina_44", PASSWORD);
      expect(result).toEqual({ ok: false, errors: { ...NO_ERRORS, form: "Wrong user name or password." } });
      expect(changes).toEqual([]);
    });

    it("shows the server's sentence when the account is locked, or the server cannot be reached", async () => {
      const refusals = [
        { ok: false, code: "locked", message: "Too many wrong passwords. Try again in 10 minutes." },
        { ok: false, code: "too_many_attempts", message: "Too many tries. Wait a minute." },
        { ok: false, code: "offline", message: "The server could not be reached. Try again in a moment." },
        { ok: false, code: "unavailable", message: "Accounts are not available on this server right now." },
      ];
      for (const refusal of refusals) {
        const { account } = setUp({ logIn: refusal });
        const result = await account.signIn("Catarina_44", PASSWORD);
        expect(result).toEqual({ ok: false, errors: { ...NO_ERRORS, form: refusal.message } });
      }
    });

    it("sends nothing for a password too short to be anyone's, so it does not count as a wrong try", async () => {
      const { account, asked } = setUp({ logIn: { ok: true, username: "Catarina_44" } });
      const result = await account.signIn("Catarina_44", "1234567");
      expect(result.errors.password).toContain("at least 8");
      expect(asked).toEqual([]);
    });

    it("does not break on an answer that is not in our format, or an api that fails", async () => {
      const strangeAnswers = [
        undefined,
        null,
        "welcome",
        42,
        {},
        { ok: "true" },
        () => {
          throw new Error("broken");
        },
      ];
      for (const logIn of strangeAnswers) {
        const { account, changes } = setUp({ logIn });
        const result = await account.signIn("Catarina_44", PASSWORD);
        expect(result).toEqual({ ok: false, errors: { ...NO_ERRORS, form: NO_REASON } });
        expect(changes).toEqual([]); // nobody was signed in
      }
    });
  });

  describe("signing out", () => {
    it("asks the server, and then shows nobody as signed in", async () => {
      const { account, asked, last } = setUp({ logOut: { ok: true } });
      const result = await account.signOut();
      expect(result.ok).toBe(true);
      expect(asked).toEqual([{ name: "logOut", sent: [] }]);
      expect(last()).toEqual(SIGNED_OUT);
    });

    it("stays signed in, and says why, when the server could not be reached", async () => {
      const offline = { ok: false, code: "offline", message: "The server could not be reached. Try again in a moment." };
      const { account, changes } = setUp({ logOut: offline });
      const result = await account.signOut();
      expect(result).toEqual({ ok: false, errors: { ...NO_ERRORS, form: offline.message } });
      expect(changes).toEqual([]); // nothing changed: still signed in
    });
  });

  describe("deleting the account", () => {
    it("sends only the password, and then shows nobody as signed in", async () => {
      const { account, asked, last } = setUp({ deleteAccount: { ok: true } });
      const result = await account.deleteAccount(PASSWORD, true);
      expect(result.ok).toBe(true);
      expect(asked).toEqual([{ name: "deleteAccount", sent: [PASSWORD] }]);
      expect(last()).toEqual(SIGNED_OUT);
    });

    it("sends nothing without the tick that confirms it", async () => {
      const { account, asked, changes } = setUp({ deleteAccount: { ok: true } });
      for (const notTicked of [false, undefined, null, "true", 1]) {
        const result = await account.deleteAccount(PASSWORD, notTicked);
        expect(result).toEqual({ ok: false, errors: { ...NO_ERRORS, confirm: CONFIRM_TEXT } });
      }
      expect(asked).toEqual([]);
      expect(changes).toEqual([]);
    });

    it("sends nothing without a password", async () => {
      const { account, asked } = setUp({ deleteAccount: { ok: true } });
      const result = await account.deleteAccount("", true);
      expect(result.ok).toBe(false);
      expect(result.errors.password).toContain("at least 8");
      expect(asked).toEqual([]);
    });

    it("keeps the account, and shows the server's sentence, when the password is wrong", async () => {
      const wrong = { ok: false, code: "wrong_login", message: "That is not your password." };
      const { account, changes } = setUp({ deleteAccount: wrong });
      const result = await account.deleteAccount(PASSWORD, true);
      expect(result).toEqual({ ok: false, errors: { ...NO_ERRORS, form: "That is not your password." } });
      expect(changes).toEqual([]); // still signed in
    });

    it("shows nobody as signed in when the server says we are not signed in any more", async () => {
      const expired = { ok: false, code: "not_signed_in", message: "Sign in first." };
      const { account, last } = setUp({ deleteAccount: expired });
      const result = await account.deleteAccount(PASSWORD, true);
      expect(result).toEqual({ ok: false, errors: { ...NO_ERRORS, form: "Sign in first." } });
      expect(last()).toEqual(SIGNED_OUT);
    });
  });

  // Added on 13 November 2026.
  describe("changing the password", () => {
    const NEW_PASSWORD = "a different long password";

    it("sends the current and the new password, and the player stays signed in", async () => {
      const { account, asked, changes } = setUp({ changePassword: { ok: true } });
      const result = await account.changePassword(PASSWORD, NEW_PASSWORD);
      expect(result).toEqual({ ok: true, errors: NO_ERRORS });
      expect(asked).toEqual([{ name: "changePassword", sent: [PASSWORD, NEW_PASSWORD] }]);
      expect(changes).toEqual([]); // nothing about who is signed in changed
    });

    it("sends nothing when a box is empty, the new password is too short, or it is the same as the old one", async () => {
      const { account, asked } = setUp({ changePassword: { ok: true } });
      const noCurrent = await account.changePassword("", NEW_PASSWORD);
      expect(noCurrent.ok).toBe(false);
      expect(noCurrent.errors.password).toContain(`at least ${PASSWORD_MIN}`);
      const tooShort = await account.changePassword(PASSWORD, "short");
      expect(tooShort.errors.newPassword).toContain(`at least ${PASSWORD_MIN}`);
      expect(tooShort.errors.password).toBe(null);
      const same = await account.changePassword(PASSWORD, PASSWORD);
      expect(same).toEqual({ ok: false, errors: { ...NO_ERRORS, newPassword: SAME_PASSWORD_TEXT } });
      expect(asked).toEqual([]);
    });

    it("shows a wrong current password for the form as a whole, and the player stays signed in", async () => {
      const wrong = { ok: false, code: "wrong_login", message: "That is not your current password." };
      const { account, changes } = setUp({ changePassword: wrong });
      const result = await account.changePassword(PASSWORD, NEW_PASSWORD);
      expect(result).toEqual({ ok: false, errors: { ...NO_ERRORS, form: "That is not your current password." } });
      expect(changes).toEqual([]);
    });

    it("shows what the server says about the new password under the box for the new password", async () => {
      for (const code of ["invalid_password", "same_password"]) {
        const { account } = setUp({ changePassword: { ok: false, code, message: "Choose another one." } });
        const result = await account.changePassword(PASSWORD, NEW_PASSWORD);
        expect(result, code).toEqual({ ok: false, errors: { ...NO_ERRORS, newPassword: "Choose another one." } });
      }
    });

    it("shows nobody as signed in when the server says we are not signed in any more", async () => {
      const expired = { ok: false, code: "not_signed_in", message: "You are not signed in." };
      const { account, last } = setUp({ changePassword: expired });
      const result = await account.changePassword(PASSWORD, NEW_PASSWORD);
      expect(result.errors.form).toBe("You are not signed in.");
      expect(last()).toEqual(SIGNED_OUT);
    });

    it("shows a calm sentence when the server cannot be reached or answers nonsense", async () => {
      for (const broken of [null, undefined, "no", { ok: "yes" }, () => Promise.reject(new Error("offline"))]) {
        const { account } = setUp({ changePassword: broken });
        const result = await account.changePassword(PASSWORD, NEW_PASSWORD);
        expect(result.ok).toBe(false);
        expect(result.errors.form).toBe(NO_REASON);
      }
    });

    it("never gives either password back, in anything it returns or tells the page", async () => {
      const oldSecret = "my-old-secret-password";
      const newSecret = "my-new-secret-password";
      const answersToTry = [
        { ok: true },
        { ok: false, code: "wrong_login", message: "That is not your current password." },
        { ok: false, code: "same_password", message: "Choose a different one." },
        null,
      ];
      for (const prepared of answersToTry) {
        const { account, changes } = setUp({ changePassword: prepared });
        const results = [
          await account.changePassword(oldSecret, newSecret),
          await account.changePassword(oldSecret, oldSecret),
          await account.changePassword(oldSecret, "short"),
        ];
        expect(JSON.stringify(results)).not.toContain(oldSecret);
        expect(JSON.stringify(results)).not.toContain(newSecret);
        expect(JSON.stringify(changes)).not.toContain("secret");
      }
    });
  });

  describe("being careful", () => {
    it("sends nothing a second time while the first try is still with the server", async () => {
      let finish;
      const { account, asked } = setUp({
        logIn: () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      });
      const first = account.signIn("Catarina_44", PASSWORD);
      await Promise.resolve(); // let the first try reach the pretend server
      const second = await account.signIn("Catarina_44", PASSWORD);
      expect(second).toEqual({ ok: false, errors: { ...NO_ERRORS, form: STILL_WAITING_TEXT } });
      expect(asked).toHaveLength(1);

      finish({ ok: true, username: "Catarina_44" });
      expect((await first).ok).toBe(true);

      // Once the first try is over, a new one is sent again.
      await account.signOut();
      expect(asked).toHaveLength(2);
    });

    it("never gives the password back, in anything it returns or tells the page", async () => {
      const secret = "my-very-secret-password";
      const answersToTry = [
        { ok: true, username: "Catarina_44" },
        { ok: false, code: "wrong_login", message: "Wrong user name or password." },
        { ok: false, code: "invalid_password", message: "A password needs at least 8 characters." },
        null,
      ];
      for (const prepared of answersToTry) {
        const { account, changes } = setUp({ signUp: prepared, logIn: prepared, deleteAccount: prepared });
        const results = [
          await account.signUp("Catarina_44", secret),
          await account.signIn("Catarina_44", secret),
          await account.deleteAccount(secret, true),
          await account.deleteAccount(secret, false),
        ];
        expect(JSON.stringify(results)).not.toContain(secret);
        expect(JSON.stringify(changes)).not.toContain(secret);
      }
    });
  });
});
