// Tests for the rule "a password cannot be the same as your user name",
// added on 19 November 2026 (shared/account-rules.js).
//
// The rule is asked when a password is CHOSEN: when an account is made and
// when a password is changed. It is not asked at sign-in, so an account
// that was made before the rule existed can still be opened.
//
// Like accounts.test.js, these use a pretend store kept in memory and a
// quick pretend password scrambler.

import { describe, it, expect, beforeEach } from "vitest";
import { checkPasswordIsNotName, checkPassword, usernameKey } from "../shared/account-rules.js";
import { createAccounts } from "../server/accounts.js";
import { createMemoryStore } from "./memory-store.js";
import { accountFormErrors, signUpFormErrors, refusalErrors, changeRefusalErrors, NO_ERRORS, PASSWORD_HINT, NEW_PASSWORD_HINT } from "../client/account-view.js";
import { createAccount } from "../client/account.js";

const SAME = "A password cannot be the same as your user name.";

describe("the rule itself", () => {
  it("refuses a password that is the user name", () => {
    expect(checkPasswordIsNotName("catarina_44", "catarina_44")).toBe(SAME);
  });

  it("refuses it whatever the capital letters", () => {
    expect(checkPasswordIsNotName("Catarina_44", "catarina_44")).toBe(SAME);
    expect(checkPasswordIsNotName("catarina_44", "CATARINA_44")).toBe(SAME);
  });

  it("allows every other password, also one that only contains the name", () => {
    expect(checkPasswordIsNotName("catarina_44", "a-long-password")).toBe(null);
    expect(checkPasswordIsNotName("catarina_44", "catarina_44!")).toBe(null);
    expect(checkPasswordIsNotName("catarina_44", " catarina_44")).toBe(null); // a space is a character of a password
  });

  it("does not break on strange values, and leaves them to the other rules", () => {
    for (const [name, password] of [
      [undefined, undefined],
      [null, "12345678"],
      ["catarina_44", null],
      [42, 42],
      ["", ""],
      [{}, {}],
    ]) {
      expect(checkPasswordIsNotName(name, password), JSON.stringify([name, password])).toBe(null);
    }
  });

  it("is a rule of its own: such a password passes the rule about length", () => {
    expect(checkPassword("catarina_44")).toBe(null);
  });
});

describe("the server refuses it", () => {
  let store;
  let accounts;
  const passwords = {
    hash: async (password) => `scrambled(${password})`,
    matches: async (password, stored) => stored === `scrambled(${password})`,
    pretend: async () => {},
  };

  beforeEach(() => {
    store = createMemoryStore();
    accounts = createAccounts(store, { now: () => 1_800_000_000_000, passwords });
  });

  it("when an account is made, and makes no account", async () => {
    const answer = await accounts.signUp("Catarina_44", "catarina_44");
    expect(answer).toEqual({ ok: false, code: "invalid_password", message: SAME });
    expect(await store.findPlayerByKey("catarina_44")).toBe(null);
  });

  it("but makes the account with any other password", async () => {
    expect((await accounts.signUp("Catarina_44", "catarina_45")).ok).toBe(true);
  });

  it("when a password is changed, and keeps the old one", async () => {
    const { player } = await accounts.signUp("Catarina_44", "a-long-password");
    const answer = await accounts.changePassword(player.id, undefined, "a-long-password", "CATARINA_44");
    expect(answer).toEqual({ ok: false, code: "invalid_password", message: SAME });
    expect((await accounts.logIn("Catarina_44", "a-long-password")).ok).toBe(true);
    expect((await accounts.logIn("Catarina_44", "CATARINA_44")).ok).toBe(false);
  });

  it("without counting that as a wrong password: the account is not locked by it", async () => {
    const { player } = await accounts.signUp("Catarina_44", "a-long-password");
    for (let attempt = 0; attempt < 8; attempt++) {
      await accounts.changePassword(player.id, undefined, "a-long-password", "catarina_44");
    }
    expect((await accounts.logIn("Catarina_44", "a-long-password")).ok).toBe(true);
  });

  it("still lets in an account that was made before the rule, with such a password", async () => {
    // Put straight into the store, as it would have been made before 19 November.
    await store.addPlayer({ username: "old_timer", usernameKey: usernameKey("old_timer"), passwordHash: "scrambled(old_timer)" });
    expect((await accounts.logIn("old_timer", "old_timer")).ok).toBe(true);
  });
});

describe("the menu says it before anything is sent", () => {
  it("under the password box of the 'create account' form", () => {
    expect(signUpFormErrors("Catarina_44", "catarina_44")).toEqual({ ...NO_ERRORS, password: SAME });
    expect(signUpFormErrors("Catarina_44", "a-long-password")).toEqual(NO_ERRORS);
  });

  it("says what is wrong with the length first, when both are wrong", () => {
    expect(signUpFormErrors("ana", "ana").password).toContain("at least");
  });

  it("does not say it in the 'sign in' form, so an older account can still sign in", () => {
    expect(accountFormErrors("old_timer", "old_timer")).toEqual(NO_ERRORS);
  });

  it("sends nothing to the server for such a sign-up, and does send a sign-in", async () => {
    const asked = [];
    const api = {
      signUp: async (...sent) => {
        asked.push(["signUp", ...sent]);
        return { ok: true, username: sent[0] };
      },
      logIn: async (...sent) => {
        asked.push(["logIn", ...sent]);
        return { ok: true, username: sent[0] };
      },
    };
    const account = createAccount({ api });
    const refused = await account.signUp("Catarina_44", "catarina_44");
    expect(refused).toEqual({ ok: false, errors: { ...NO_ERRORS, password: SAME } });
    expect(asked).toEqual([]);
    expect((await account.signIn("old_timer", "old_timer")).ok).toBe(true);
    expect(asked).toEqual([["logIn", "old_timer", "old_timer"]]);
  });

  it("shows the server's sentence under the right box if the server is the one to say it", () => {
    const answer = { ok: false, code: "invalid_password", message: SAME };
    expect(refusalErrors(answer).password).toBe(SAME); //            create account: under the password
    expect(changeRefusalErrors(answer).newPassword).toBe(SAME); //   change password: under the NEW password
  });

  it("is in the hints under the boxes where a password is chosen", () => {
    expect(PASSWORD_HINT).toContain("not your user name");
    expect(NEW_PASSWORD_HINT).toContain("not your user name");
  });
});
