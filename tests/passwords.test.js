// Tests for server/passwords.js: how passwords are scrambled and checked.
//
// The scrambler is slow on purpose (about a tenth of a second each time),
// so this file makes only a handful of hashes.

import { describe, it, expect, beforeAll } from "vitest";
import { hashPassword, passwordMatches, pretendToCheck } from "../server/passwords.js";

let stored;

beforeAll(async () => {
  stored = await hashPassword("correct horse battery");
});

describe("storing a password", () => {
  it("never stores the password itself", () => {
    expect(stored).not.toContain("correct");
    expect(stored).not.toContain("horse");
  });

  it("stores the kind of scrambling and how hard it was, with the salt and the result", () => {
    const parts = stored.split("$");
    expect(parts).toHaveLength(6);
    expect(parts[0]).toBe("scrypt");
    expect(Number(parts[1])).toBeGreaterThanOrEqual(16384);
    expect(Buffer.from(parts[4], "base64")).toHaveLength(16); // the salt
    expect(Buffer.from(parts[5], "base64")).toHaveLength(64); // the scrambled password
  });

  it("gives two different results for the same password, because each gets its own salt", async () => {
    const again = await hashPassword("correct horse battery");
    expect(again).not.toBe(stored);
    expect(await passwordMatches("correct horse battery", again)).toBe(true);
  });
});

describe("checking a password", () => {
  it("accepts the right password", async () => {
    expect(await passwordMatches("correct horse battery", stored)).toBe(true);
  });

  it("refuses a wrong password, even one that is almost right", async () => {
    expect(await passwordMatches("correct horse batterY", stored)).toBe(false);
    expect(await passwordMatches("correct horse battery ", stored)).toBe(false);
    expect(await passwordMatches("", stored)).toBe(false);
  });

  it("says no, without an error, to a stored line that is damaged or of an unknown kind", async () => {
    const [kind, cost, block, parallel, salt, hash] = stored.split("$");
    const damaged = [
      "",
      "not a hash",
      "plain$password",
      ["md5", cost, block, parallel, salt, hash].join("$"), //         another kind of scrambling
      [kind, "banana", block, parallel, salt, hash].join("$"), //      not a number
      [kind, cost, block, parallel, salt, ""].join("$"), //            nothing to compare with
      [kind, cost, block, parallel, salt].join("$"), //                a part missing
      [kind, "1000", block, parallel, salt, hash].join("$"), //        a cost scrypt refuses
    ];
    for (const line of damaged) {
      expect(await passwordMatches("correct horse battery", line), line).toBe(false);
    }
  });

  it("refuses to do an absurd amount of work for a damaged line", async () => {
    const [kind, , block, parallel, salt, hash] = stored.split("$");
    const started = Date.now();
    const huge = [kind, String(2 ** 30), block, parallel, salt, hash].join("$");
    expect(await passwordMatches("correct horse battery", huge)).toBe(false);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("says no to anything that is not text", async () => {
    for (const notText of [undefined, null, 12345678, {}, []]) {
      expect(await passwordMatches(notText, stored)).toBe(false);
      expect(await passwordMatches("correct horse battery", notText)).toBe(false);
    }
  });

  it("can pretend to check, for user names that do not exist, without an error", async () => {
    await expect(pretendToCheck("anything")).resolves.toBeUndefined();
    await expect(pretendToCheck(undefined)).resolves.toBeUndefined();
  });
});
