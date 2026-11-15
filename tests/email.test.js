// Tests for email in server/accounts.js: adding an email address to an
// account, and getting back into an account with a forgotten password.
//
// They use the pretend store kept in memory, a pretend clock, a quick
// pretend password scrambler, and a pretend mailer that only writes down
// what it was asked to send. No email is ever sent.

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createAccounts,
  RESET_LINK_MINUTES,
  CONFIRM_LINK_MINUTES,
  EMAILS_PER_HOUR,
  WRONG_PASSWORDS_ALLOWED,
} from "../server/accounts.js";
import { createMemoryStore } from "./memory-store.js";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const SITE = "https://kart.example";

let store;
let accounts;
let time; // what the pretend clock says, in milliseconds
let sent; // every message the pretend mailer was handed

const quickPasswords = {
  hash: async (password) => `scrambled(${password})`,
  matches: async (password, stored) => stored === `scrambled(${password})`,
  pretend: async () => {},
};

function makeAccounts(more = {}) {
  return createAccounts(store, {
    now: () => time,
    passwords: quickPasswords,
    mailer: {
      send: async (message) => {
        sent.push(message);
        return true;
      },
    },
    siteAddress: SITE,
    ...more,
  });
}

beforeEach(() => {
  store = createMemoryStore();
  time = 1_800_000_000_000;
  sent = [];
  accounts = makeAccounts();
});

async function signUp(username = "Ana", password = "12345678") {
  const answer = await accounts.signUp(username, password);
  expect(answer.ok, JSON.stringify(answer)).toBe(true);
  return answer.player;
}

/** The secret part of the link in a message: what comes after "#confirm=" or "#reset=". */
function secretIn(message, kind) {
  const found = message.text.match(new RegExp(`${SITE}/link\\.html#${kind}=([A-Za-z0-9_-]+)`));
  expect(found, `a ${kind} link in: ${message.text}`).not.toBe(null);
  return found[1];
}

/** Gives a player a confirmed email address, the way a player would get one. */
async function giveEmail(player, email, password = "12345678") {
  const before = sent.length;
  expect(await accounts.requestEmail(player.id, password, email)).toEqual({ ok: true });
  expect(await accounts.confirmEmail(secretIn(sent[before], "confirm"))).toEqual({ ok: true, email: email.trim() });
}

describe("adding an email address to an account", () => {
  let ana;
  beforeEach(async () => {
    ana = await signUp("Ana", "12345678");
  });

  it("sends a link to the address, and the address only counts once the link is opened", async () => {
    expect(await accounts.requestEmail(ana.id, "12345678", "Ana@Example.com")).toEqual({ ok: true });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("Ana@Example.com");
    expect(sent[0].subject).toContain("confirm your email");
    expect(sent[0].text).toContain("Ana"); // says whose account it is about
    expect(await accounts.emailOf(ana.id)).toBe(null); // not yet

    expect(await accounts.confirmEmail(secretIn(sent[0], "confirm"))).toEqual({ ok: true, email: "Ana@Example.com" });
    expect(await accounts.emailOf(ana.id)).toBe("Ana@Example.com");
  });

  it("builds the link from the site address it was given, and keeps only a scrambled copy of its secret", async () => {
    await accounts.requestEmail(ana.id, "12345678", "ana@example.com");
    const secret = secretIn(sent[0], "confirm");
    expect(secret).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 random bytes
    expect(await store.takeEmailLink(secret)).toBe(null); // the secret itself is not what is stored
    expect(store.countEmailLinks()).toBe(1);
  });

  it("lets a link be used exactly once", async () => {
    await accounts.requestEmail(ana.id, "12345678", "ana@example.com");
    const secret = secretIn(sent[0], "confirm");
    expect((await accounts.confirmEmail(secret)).ok).toBe(true);
    expect((await accounts.confirmEmail(secret)).code).toBe("bad_link");
  });

  it(`stops a link working after ${CONFIRM_LINK_MINUTES} minutes, to the millisecond`, async () => {
    await accounts.requestEmail(ana.id, "12345678", "ana@example.com");
    await accounts.requestEmail(ana.id, "12345678", "ana@example.com");
    time += CONFIRM_LINK_MINUTES * MINUTE - 1;
    expect((await accounts.confirmEmail(secretIn(sent[0], "confirm"))).ok).toBe(true);
    time += 1;
    expect((await accounts.confirmEmail(secretIn(sent[1], "confirm"))).code).toBe("bad_link");
    expect(CONFIRM_LINK_MINUTES).toBe(60);
  });

  it("forgives a space typed before or after the address", async () => {
    await giveEmail(ana, "  ana@example.com ");
    expect(await accounts.emailOf(ana.id)).toBe("ana@example.com");
  });

  it("refuses without the right password, and sends nothing", async () => {
    for (const password of ["wrong-password", "", undefined, null, 12345678, ["12345678"], "x".repeat(201)]) {
      const answer = await accounts.requestEmail(ana.id, password, "ana@example.com");
      expect(answer.code, String(password).slice(0, 20)).toBe("wrong_login");
    }
    expect(sent).toEqual([]);
    expect(store.countEmailLinks()).toBe(0);
  });

  it("locks the account after too many wrong passwords, like a sign-in", async () => {
    let answer;
    for (let attempt = 0; attempt < WRONG_PASSWORDS_ALLOWED; attempt++) {
      answer = await accounts.requestEmail(ana.id, "wrong-password", "ana@example.com");
    }
    expect(answer.code).toBe("locked");
    expect((await accounts.requestEmail(ana.id, "12345678", "ana@example.com")).code).toBe("locked");
    expect(sent).toEqual([]);
  });

  it("refuses something that is not an email address, before even looking at the password", async () => {
    for (const email of ["", "   ", "ana", "ana@", "@example.com", "ana@example", "ana example@x.com", "a@b@c.com", "ana@exam ple.com", "<ana@example.com>", "ana@example.com, eve@example.com", null, undefined, 42, {}, `${"x".repeat(250)}@example.com`]) {
      const answer = await accounts.requestEmail(ana.id, "wrong-password", email);
      expect(answer.code, String(email).slice(0, 30)).toBe("invalid_email");
    }
    expect((await store.findPlayerById(ana.id)).failedLogins).toBe(0); // none of those counted as a wrong password
    expect(sent).toEqual([]);
  });

  it("refuses a player who does not exist", async () => {
    expect((await accounts.requestEmail(999999, "12345678", "ana@example.com")).code).toBe("not_signed_in");
    expect(sent).toEqual([]);
  });

  it("says so when the address is already the one of this account", async () => {
    await giveEmail(ana, "ana@example.com");
    const answer = await accounts.requestEmail(ana.id, "12345678", "ANA@example.com");
    expect(answer.code).toBe("same_email");
    expect(sent).toHaveLength(1); // only the first message
  });

  it(`sends at most ${EMAILS_PER_HOUR} confirmation emails an hour for one account, then allows them again`, async () => {
    for (let attempt = 0; attempt < EMAILS_PER_HOUR; attempt++) {
      expect((await accounts.requestEmail(ana.id, "12345678", `ana${attempt}@example.com`)).ok).toBe(true);
    }
    const tooMany = await accounts.requestEmail(ana.id, "12345678", "ana9@example.com");
    expect(tooMany.code).toBe("too_many_emails");
    expect(sent).toHaveLength(EMAILS_PER_HOUR);

    time += HOUR;
    expect((await accounts.requestEmail(ana.id, "12345678", "ana9@example.com")).ok).toBe(true);
    expect(sent).toHaveLength(EMAILS_PER_HOUR + 1);
    expect(EMAILS_PER_HOUR).toBe(3);
  });

  it("gives the same answer for an address that belongs to another account, and sends nothing", async () => {
    const rui = await signUp("Rui", "rui-password");
    await giveEmail(rui, "rui@example.com", "rui-password");
    sent = [];

    expect(await accounts.requestEmail(ana.id, "12345678", "RUI@example.com")).toEqual({ ok: true });
    expect(sent).toEqual([]);
    expect(await accounts.emailOf(ana.id)).toBe(null);
    expect(await accounts.emailOf(rui.id)).toBe("rui@example.com");
  });

  it("gives the address to whoever confirms first when two accounts ask for the same one", async () => {
    const rui = await signUp("Rui", "rui-password");
    await accounts.requestEmail(ana.id, "12345678", "shared@example.com");
    await accounts.requestEmail(rui.id, "rui-password", "shared@example.com");
    expect(sent).toHaveLength(2);

    expect((await accounts.confirmEmail(secretIn(sent[1], "confirm"))).ok).toBe(true); // Rui is first
    const late = await accounts.confirmEmail(secretIn(sent[0], "confirm"));
    expect(late.code).toBe("email_taken");
    expect(await accounts.emailOf(rui.id)).toBe("shared@example.com");
    expect(await accounts.emailOf(ana.id)).toBe(null);
  });

  it("replaces the old address when a new one is confirmed", async () => {
    await giveEmail(ana, "old@example.com");
    await giveEmail(ana, "new@example.com");
    expect(await accounts.emailOf(ana.id)).toBe("new@example.com");
    sent = [];
    await accounts.requestPasswordReset("old@example.com");
    expect(sent).toEqual([]); // the old address no longer leads anywhere
    await accounts.requestPasswordReset("new@example.com");
    expect(sent).toHaveLength(1);
  });

  it("stops a 'new password' link that was sent to the old address, once a new address is confirmed", async () => {
    await giveEmail(ana, "old@example.com");
    await accounts.requestPasswordReset("old@example.com");
    const sentToOld = secretIn(sent[sent.length - 1], "reset");
    await giveEmail(ana, "new@example.com");
    // Whoever reads the old mailbox can no longer get into the account.
    expect((await accounts.resetPassword(sentToOld, "a-new-password")).code).toBe("bad_link");
    expect((await accounts.logIn("Ana", "12345678")).ok).toBe(true);
  });

  it("refuses a link that is made up, damaged, or of the other kind", async () => {
    await giveEmail(ana, "ana@example.com");
    await accounts.requestPasswordReset("ana@example.com");
    const resetSecret = secretIn(sent[sent.length - 1], "reset");
    for (const rubbish of [undefined, null, "", "abc", "A".repeat(43), "x".repeat(5000), 12345, {}, ["a"], "../../etc/passwd", resetSecret]) {
      expect((await accounts.confirmEmail(rubbish)).code, String(rubbish).slice(0, 20)).toBe("bad_link");
    }
    expect(await accounts.emailOf(ana.id)).toBe("ana@example.com"); // nothing changed
  });
});

describe("taking the email address off an account", () => {
  it("removes it with the password, and then the address leads nowhere", async () => {
    const ana = await signUp("Ana", "12345678");
    await giveEmail(ana, "ana@example.com");
    await accounts.requestPasswordReset("ana@example.com");
    const secret = secretIn(sent[sent.length - 1], "reset");
    sent = [];

    expect(await accounts.removeEmail(ana.id, "12345678")).toEqual({ ok: true });
    expect(await accounts.emailOf(ana.id)).toBe(null);
    await accounts.requestPasswordReset("ana@example.com");
    expect(sent).toEqual([]);
    // A "new password" link that was already out stops working too.
    expect((await accounts.resetPassword(secret, "a-new-password")).code).toBe("bad_link");
    expect(store.countEmailLinks()).toBe(0);
  });

  it("refuses without the right password, and for a player who does not exist", async () => {
    const ana = await signUp("Ana", "12345678");
    await giveEmail(ana, "ana@example.com");
    expect((await accounts.removeEmail(ana.id, "wrong-password")).code).toBe("wrong_login");
    expect((await accounts.removeEmail(ana.id, undefined)).code).toBe("wrong_login");
    expect((await accounts.removeEmail(999999, "12345678")).code).toBe("not_signed_in");
    expect(await accounts.emailOf(ana.id)).toBe("ana@example.com");
  });

  it("still works on a server where email is not set up: a player can always take their address back", async () => {
    const ana = await signUp("Ana", "12345678");
    await giveEmail(ana, "ana@example.com");
    const withoutEmail = makeAccounts({ mailer: null });
    expect(await withoutEmail.removeEmail(ana.id, "12345678")).toEqual({ ok: true });
    expect(await withoutEmail.emailOf(ana.id)).toBe(null);
  });
});

describe("asking for a new password by email", () => {
  let ana;
  beforeEach(async () => {
    ana = await signUp("Ana", "12345678");
    await giveEmail(ana, "Ana@Example.com");
    sent = [];
  });

  it("sends a link to the account's address, whatever capitals or spaces were typed", async () => {
    expect(await accounts.requestPasswordReset("  ANA@example.COM ")).toEqual({ ok: true });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("Ana@Example.com"); // the address as its owner gave it, not as it was typed now
    expect(sent[0].subject).toContain("choose a new password");
    expect(secretIn(sent[0], "reset")).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("gives exactly the same answer for an address nobody has, and sends nothing", async () => {
    const known = await accounts.requestPasswordReset("ana@example.com");
    const unknown = await accounts.requestPasswordReset("nobody@example.com");
    expect(unknown).toEqual(known);
    expect(sent).toHaveLength(1);
  });

  it("does not send to an address that was asked for but never confirmed", async () => {
    const rui = await signUp("Rui", "rui-password");
    await accounts.requestEmail(rui.id, "rui-password", "rui@example.com");
    sent = [];
    expect(await accounts.requestPasswordReset("rui@example.com")).toEqual({ ok: true });
    expect(sent).toEqual([]);
  });

  it("refuses something that is not an email address, which says nothing about accounts", async () => {
    for (const email of ["", "ana", "ana@example", null, undefined, 42, ["ana@example.com"]]) {
      expect((await accounts.requestPasswordReset(email)).code, String(email)).toBe("invalid_email");
    }
    expect(sent).toEqual([]);
  });

  it(`sends at most ${EMAILS_PER_HOUR} an hour for one account, and still gives the same answer`, async () => {
    for (let attempt = 0; attempt < EMAILS_PER_HOUR + 4; attempt++) {
      expect(await accounts.requestPasswordReset("ana@example.com")).toEqual({ ok: true });
    }
    expect(sent).toHaveLength(EMAILS_PER_HOUR);

    time += HOUR;
    await accounts.requestPasswordReset("ana@example.com");
    expect(sent).toHaveLength(EMAILS_PER_HOUR + 1);
  });

  it("never writes a password, a scrambled password or anyone else's name into an email", async () => {
    await signUp("Rui", "rui-password");
    await accounts.requestPasswordReset("ana@example.com");
    const everything = JSON.stringify(sent);
    expect(everything).not.toContain("12345678");
    expect(everything).not.toContain("scrambled");
    expect(everything).not.toContain("Rui");
  });
});

describe("choosing a new password with the link", () => {
  let ana;
  let secret;
  beforeEach(async () => {
    ana = await signUp("Ana", "12345678");
    await giveEmail(ana, "ana@example.com");
    await accounts.requestPasswordReset("ana@example.com");
    secret = secretIn(sent[sent.length - 1], "reset");
    sent = [];
  });

  it("sets the new password: it signs in and the old one no longer does", async () => {
    expect(await accounts.resetPassword(secret, "a-new-password")).toEqual({ ok: true, username: "Ana" });
    expect((await accounts.logIn("Ana", "a-new-password")).ok).toBe(true);
    expect((await accounts.logIn("Ana", "12345678")).code).toBe("wrong_login");
    expect((await store.findPlayerById(ana.id)).passwordHash).toBe("scrambled(a-new-password)");
  });

  it("signs the player out on every device", async () => {
    const laptop = await accounts.startSession(ana.id);
    const phone = await accounts.startSession(ana.id);
    const rui = await signUp("Rui", "rui-password");
    const ruisTicket = await accounts.startSession(rui.id);

    await accounts.resetPassword(secret, "a-new-password");

    expect(await accounts.playerForSession(laptop)).toBe(null);
    expect(await accounts.playerForSession(phone)).toBe(null);
    expect(await accounts.playerForSession(ruisTicket)).not.toBe(null); // another player: untouched
  });

  it("tells the player by email that the password was changed", async () => {
    await accounts.resetPassword(secret, "a-new-password");
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("ana@example.com");
    expect(sent[0].subject).toContain("your password was changed");
    expect(sent[0].text).not.toContain("a-new-password");
    expect(sent[0].text).toContain(`${SITE}/`);
  });

  it("works exactly once, and throws away the other links that were still out", async () => {
    await accounts.requestPasswordReset("ana@example.com");
    const second = secretIn(sent[sent.length - 1], "reset");

    expect((await accounts.resetPassword(secret, "a-new-password")).ok).toBe(true);
    expect((await accounts.resetPassword(secret, "another-password")).code).toBe("bad_link");
    expect((await accounts.resetPassword(second, "another-password")).code).toBe("bad_link");
    expect((await accounts.logIn("Ana", "a-new-password")).ok).toBe(true);
  });

  it(`stops working after ${RESET_LINK_MINUTES} minutes, to the millisecond`, async () => {
    await accounts.requestPasswordReset("ana@example.com");
    const other = secretIn(sent[sent.length - 1], "reset");
    time += RESET_LINK_MINUTES * MINUTE - 1;
    expect((await accounts.resetPassword(secret, "a-new-password")).ok).toBe(true);

    // The second link was made at the same moment. One millisecond later it is too old.
    await accounts.requestPasswordReset("ana@example.com");
    const fresh = secretIn(sent[sent.length - 1], "reset");
    time += RESET_LINK_MINUTES * MINUTE;
    expect((await accounts.resetPassword(fresh, "another-password")).code).toBe("bad_link");
    expect((await accounts.resetPassword(other, "another-password")).code).toBe("bad_link");
    expect((await accounts.logIn("Ana", "a-new-password")).ok).toBe(true);
    expect(RESET_LINK_MINUTES).toBe(30);
  });

  it("does not use the link up when the new password breaks the rules", async () => {
    for (const bad of ["short", "", undefined, null, 12345678, "x".repeat(201)]) {
      expect((await accounts.resetPassword(secret, bad)).code, String(bad).slice(0, 20)).toBe("invalid_password");
    }
    expect((await accounts.resetPassword(secret, "a-new-password")).ok).toBe(true);
  });

  it("refuses a link that is made up, damaged, or of the other kind, and changes nothing", async () => {
    const rui = await signUp("Rui", "rui-password");
    await accounts.requestEmail(rui.id, "rui-password", "rui@example.com");
    const confirmSecret = secretIn(sent[sent.length - 1], "confirm");
    for (const rubbish of [undefined, null, "", "abc", "B".repeat(43), "x".repeat(5000), 12345, {}, confirmSecret]) {
      expect((await accounts.resetPassword(rubbish, "a-new-password")).code, String(rubbish).slice(0, 20)).toBe("bad_link");
    }
    expect((await accounts.logIn("Ana", "12345678")).ok).toBe(true);
    expect((await accounts.logIn("Rui", "rui-password")).ok).toBe(true);
  });

  it("opens an account again that was locked by wrong passwords", async () => {
    for (let attempt = 0; attempt < WRONG_PASSWORDS_ALLOWED; attempt++) {
      await accounts.logIn("Ana", "wrong-password");
    }
    expect((await accounts.logIn("Ana", "12345678")).code).toBe("locked");
    await accounts.resetPassword(secret, "a-new-password");
    expect((await accounts.logIn("Ana", "a-new-password")).ok).toBe(true);
  });

  it("is useless after the account was deleted", async () => {
    expect((await accounts.deleteAccount(ana.id, "12345678")).ok).toBe(true);
    expect((await accounts.resetPassword(secret, "a-new-password")).code).toBe("bad_link");
    await accounts.requestPasswordReset("ana@example.com");
    expect(sent).toEqual([]); // the address went with the account
  });
});

describe("email and the ordinary password change", () => {
  it("tells the player by email, and stops a 'new password' link that was still out", async () => {
    const ana = await signUp("Ana", "12345678");
    await giveEmail(ana, "ana@example.com");
    await accounts.requestPasswordReset("ana@example.com");
    const secret = secretIn(sent[sent.length - 1], "reset");
    sent = [];

    expect((await accounts.changePassword(ana.id, null, "12345678", "a-new-password")).ok).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toContain("your password was changed");
    expect((await accounts.resetPassword(secret, "yet-another-password")).code).toBe("bad_link");
  });

  it("sends nothing to a player without an email address", async () => {
    const ana = await signUp("Ana", "12345678");
    expect((await accounts.changePassword(ana.id, null, "12345678", "a-new-password")).ok).toBe(true);
    expect(sent).toEqual([]);
  });
});

describe("when email is not set up, or the email service fails", () => {
  it("offers nothing that needs email on a server without a mailer or without a usable site address", async () => {
    const ana = await signUp("Ana", "12345678");
    for (const broken of [{ mailer: null }, { siteAddress: null }, { siteAddress: "javascript:alert(1)" }, { siteAddress: "kart.example" }]) {
      const without = makeAccounts(broken);
      expect(without.emailAvailable()).toBe(false);
      expect((await without.requestEmail(ana.id, "12345678", "ana@example.com")).code).toBe("email_unavailable");
      expect((await without.requestPasswordReset("ana@example.com")).code).toBe("email_unavailable");
    }
    expect(accounts.emailAvailable()).toBe(true);
    expect(sent).toEqual([]);
    expect(store.countEmailLinks()).toBe(0);
  });

  it("does not even try to send on a server without email, also for a player who has an address", async () => {
    const complaints = vi.spyOn(console, "error").mockImplementation(() => {});
    const ana = await signUp("Ana", "12345678");
    await giveEmail(ana, "ana@example.com"); // added while email was set up
    sent = [];

    const withoutEmail = makeAccounts({ mailer: null });
    expect(await withoutEmail.changePassword(ana.id, null, "12345678", "a-new-password")).toEqual({ ok: true });
    expect(sent).toEqual([]);
    expect(complaints).not.toHaveBeenCalled(); // nothing went wrong on the way, quietly or not
    complaints.mockRestore();
  });

  it("still answers when the email service fails: the player is not made to wait or shown an error", async () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    const ana = await signUp("Ana", "12345678");
    const failing = [
      { send: async () => Promise.reject(new Error("the email service answered with number 500")) },
      {
        send: () => {
          throw new Error("broken before it even started");
        },
      },
    ];
    for (const mailer of failing) {
      const shaky = makeAccounts({ mailer });
      expect(await shaky.requestEmail(ana.id, "12345678", "ana@example.com")).toEqual({ ok: true });
      await Promise.resolve(); // let the failure arrive
    }
    expect(quiet).toHaveBeenCalledTimes(2);
    // What went to our log names neither the address nor the link.
    expect(JSON.stringify(quiet.mock.calls)).not.toContain("ana@example.com");
    expect(JSON.stringify(quiet.mock.calls)).not.toContain("link.html");
    quiet.mockRestore();
  });
});
