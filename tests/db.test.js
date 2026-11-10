// Tests for server/db.js that need no real database.
//
// They hand the code a pretend "pool": an object that writes down every
// question it is asked and gives a prepared answer. That lets us check
// which questions the code asks, in which order, and what it does when the
// database fails. The tests against the real database are in
// db-live.test.js.

import { describe, it, expect } from "vitest";
import {
  createDatabase,
  createDatabaseOn,
  STARTS_TO_KEEP,
  STATUS_FRESH_MS,
  STATUS_RETRY_MS,
} from "../server/db.js";

/**
 * A pretend pool.
 *   asked     every question so far, as { text, values }
 *   answer    what the next "SELECT" gets back
 *   failWith  set it to an error to make every question fail
 */
function pretendPool() {
  const pool = {
    asked: [],
    answer: { rows: [{ starts: 3, latest: new Date("2026-11-10T18:00:00Z") }] },
    failWith: null,
    async query(text, values) {
      pool.asked.push({ text: text.replace(/\s+/g, " ").trim(), values });
      if (pool.failWith !== null) {
        throw pool.failWith;
      }
      return text.includes("SELECT count") ? pool.answer : { rows: [] };
    },
  };
  return pool;
}

/** The first word or two of each question, to check their order. */
const kinds = (pool) => pool.asked.map((question) => question.text.split(" ").slice(0, 2).join(" "));

describe("running without a database", () => {
  it("gives nothing when there is no address, so the server can run without a database", () => {
    for (const noAddress of [undefined, null, "", "   ", 42, {}]) {
      expect(createDatabase(noAddress)).toBe(null);
    }
  });
});

describe("recording that the server started", () => {
  it("creates the table if needed, adds one row, then removes rows beyond the newest ones", async () => {
    const pool = pretendPool();
    await createDatabaseOn(pool).recordStart();
    expect(kinds(pool)).toEqual(["CREATE TABLE", "INSERT INTO", "DELETE FROM"]);
    expect(pool.asked[0].text).toContain("CREATE TABLE IF NOT EXISTS server_starts");
  });

  it("hands the number of rows to keep to the database separately, not written into the question", async () => {
    const pool = pretendPool();
    await createDatabaseOn(pool).recordStart();
    const removal = pool.asked[2];
    expect(removal.text).toContain("LIMIT $1");
    expect(removal.values).toEqual([STARTS_TO_KEEP]);
    expect(STARTS_TO_KEEP).toBe(50);
  });

  it("creates the table only once, however often it is used", async () => {
    const pool = pretendPool();
    const database = createDatabaseOn(pool);
    await database.recordStart();
    await database.recordStart();
    await database.status();
    expect(kinds(pool).filter((kind) => kind === "CREATE TABLE")).toHaveLength(1);
  });

  it("fails loudly when the database fails, and tries to create the table again next time", async () => {
    const pool = pretendPool();
    const database = createDatabaseOn(pool);
    pool.failWith = new Error("the database is asleep");
    await expect(database.recordStart()).rejects.toThrow("the database is asleep");

    pool.failWith = null;
    await database.recordStart();
    expect(kinds(pool).filter((kind) => kind === "CREATE TABLE")).toHaveLength(2);
  });
});

describe("reading how many starts are recorded", () => {
  it("gives the count as a number and the latest start as text", async () => {
    const database = createDatabaseOn(pretendPool());
    expect(await database.status()).toEqual({ starts: 3, latest: "2026-11-10T18:00:00.000Z" });
  });

  it("gives no date when the table is empty", async () => {
    const pool = pretendPool();
    pool.answer = { rows: [{ starts: 0, latest: null }] };
    expect(await createDatabaseOn(pool).status()).toEqual({ starts: 0, latest: null });
  });

  it("reuses the answer for ten seconds instead of asking the database again", async () => {
    const pool = pretendPool();
    let time = 1_000_000;
    const database = createDatabaseOn(pool, { now: () => time });

    await database.status();
    const askedAfterFirst = pool.asked.length;
    time += STATUS_FRESH_MS - 1;
    await database.status();
    await database.status();
    expect(pool.asked.length).toBe(askedAfterFirst); // no new question

    time += 2; // now just over ten seconds
    await database.status();
    expect(pool.asked.length).toBe(askedAfterFirst + 1);
  });

  it("asks again straight away after a new start was recorded", async () => {
    const pool = pretendPool();
    const database = createDatabaseOn(pool, { now: () => 5 });
    await database.status();
    await database.recordStart();
    const askedBefore = pool.asked.length;
    await database.status();
    expect(pool.asked.length).toBe(askedBefore + 1);
  });

  it("does not remember a failure as if it were an answer", async () => {
    const pool = pretendPool();
    let time = 5;
    const database = createDatabaseOn(pool, { now: () => time });
    pool.failWith = new Error("the database is asleep");
    await expect(database.status()).rejects.toThrow();

    pool.failWith = null;
    time += STATUS_RETRY_MS + 1; // the short pause after a failure is over
    expect(await database.status()).toEqual({ starts: 3, latest: "2026-11-10T18:00:00.000Z" });
  });

  it("does not ask an unreachable database again for three seconds, however many visitors ask", async () => {
    const pool = pretendPool();
    let time = 1_000_000;
    const database = createDatabaseOn(pool, { now: () => time });
    pool.failWith = new Error("the database is asleep");

    await expect(database.status()).rejects.toThrow("the database is asleep");
    const askedAfterFirst = pool.asked.length;
    for (let visitor = 0; visitor < 20; visitor++) {
      await expect(database.status()).rejects.toThrow("the database is asleep");
    }
    expect(pool.asked.length).toBe(askedAfterFirst); // nobody was kept waiting, nothing new was asked

    time += STATUS_RETRY_MS + 1;
    await expect(database.status()).rejects.toThrow();
    expect(pool.asked.length).toBeGreaterThan(askedAfterFirst); // now it tried again
  });

  it("goes back to normal as soon as the database answers again", async () => {
    const pool = pretendPool();
    let time = 1_000_000;
    const database = createDatabaseOn(pool, { now: () => time });
    pool.failWith = new Error("the database is asleep");
    await expect(database.status()).rejects.toThrow();

    pool.failWith = null;
    time += STATUS_RETRY_MS + 1;
    expect((await database.status()).starts).toBe(3);
    time += 1; // well inside the ten seconds: the good answer is reused, the old failure is forgotten
    expect((await database.status()).starts).toBe(3);
  });
});

describe("what the database code refuses", () => {
  it("refuses a table name that is anything but small letters and underscores", () => {
    const badNames = [
      "server_starts; DROP TABLE players", // an attempt to smuggle in a second question
      "Server_Starts",
      "starts-2",
      "starts 2",
      "",
      "a".repeat(41),
      42,
      null,
    ];
    for (const table of badNames) {
      expect(() => createDatabaseOn(pretendPool(), { table })).toThrow(/table name/);
    }
  });

  it("accepts a plain table name", () => {
    expect(() => createDatabaseOn(pretendPool(), { table: "server_starts_test" })).not.toThrow();
  });

  it("never writes a value into a question: only the table name appears, and it was checked", async () => {
    const pool = pretendPool();
    const database = createDatabaseOn(pool, { table: "checked_name" });
    await database.recordStart();
    await database.status();
    for (const question of pool.asked) {
      expect(question.text).toContain("checked_name");
      expect(question.text).not.toContain(String(STARTS_TO_KEEP)); // the 50 travels separately, as $1
    }
  });
});
