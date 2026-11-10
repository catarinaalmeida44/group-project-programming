// Tests for server/db.js against the REAL database.
//
// They only run when the secret address of the database is available:
//
//     npm run test:database
//
// That command reads the address from the ".env" file. With plain
// "npm test", and on GitHub, there is no address, and these tests are
// skipped. Nothing here ever prints the address.
//
// They use a table of their own, "server_starts_test", and remove it at the
// end, so the real table is not touched.

import { describe, it, expect, afterAll } from "vitest";
import pg from "pg";
import { createDatabase, STARTS_TO_KEEP } from "../server/db.js";

const address = process.env.DATABASE_URL;
const haveDatabase = typeof address === "string" && address.trim() !== "";
const TABLE = "server_starts_test";

describe.skipIf(!haveDatabase)("the real database", () => {
  const database = haveDatabase ? createDatabase(address, { table: TABLE }) : null;

  afterAll(async () => {
    // Remove the test table, using a connection of our own.
    const cleaner = new pg.Pool({ connectionString: address, max: 1 });
    await cleaner.query(`DROP TABLE IF EXISTS ${TABLE}`);
    await cleaner.end();
    await database.close();
  }, 30_000);

  it("can be reached, and starts with an empty table of its own", async () => {
    const status = await database.status();
    expect(status).toEqual({ starts: 0, latest: null });
  }, 30_000); // the free database may be asleep and need a moment to wake

  it("remembers a start that was recorded", async () => {
    await database.recordStart();
    const status = await database.status();
    expect(status.starts).toBe(1);
    // The time was set by the database itself, just now.
    const secondsAgo = (Date.now() - new Date(status.latest).getTime()) / 1000;
    expect(Math.abs(secondsAgo)).toBeLessThan(120);
  }, 30_000);

  it("counts a second start", async () => {
    await database.recordStart();
    expect((await database.status()).starts).toBe(2);
  }, 30_000);

  it("still has the rows when asked through a completely new connection", async () => {
    // This is the whole point of a database: what was written is still
    // there for someone who connects later.
    const later = createDatabase(address, { table: TABLE });
    expect((await later.status()).starts).toBe(2);
    await later.close();
  }, 30_000);

  it(`never keeps more than ${STARTS_TO_KEEP} rows`, async () => {
    for (let start = 0; start < STARTS_TO_KEEP + 3; start++) {
      await database.recordStart();
    }
    expect((await database.status()).starts).toBe(STARTS_TO_KEEP);
  }, 120_000);
});

describe.skipIf(haveDatabase)("the real database (skipped)", () => {
  it("is not tested here, because no database address is set. Run: npm run test:database", () => {
    expect(haveDatabase).toBe(false);
  });
});
