// The database: where the game remembers things after the server is
// switched off.
//
// Everything else the server knows (the karts in the room, for example)
// lives in its memory and is gone when it restarts. What is written to the
// database stays.
//
// For now the database holds one small table, "server_starts": one row for
// every time the server has started. It is only there to prove that the
// server can write to the database and read from it. Players, sessions,
// progress and race results come later.
//
// WHERE THE DATABASE IS
// It is a Postgres database kept by a company called Neon. To reach it the
// server needs an address that includes a password: the "connection
// string". That is a secret. It is never written in the code. The server
// reads it from a setting called DATABASE_URL, which lives in the ".env"
// file on a laptop (git ignores that file) and in Render's Environment page.
//
// The "pg" library does the talking to Postgres.

import pg from "pg";

/** The table keeps only the newest rows, so it can never grow large. */
export const STARTS_TO_KEEP = 50;

/**
 * The answer to "how many starts?" is reused for this long. The address
 * that shows it is public, and this stops a flood of visits from becoming
 * a flood of questions to the database.
 */
export const STATUS_FRESH_MS = 10_000;

/**
 * After the database failed to answer, we do not ask again for this long.
 * An unreachable database takes ten seconds to give up on. Without this
 * pause, every visit in that time would start another ten-second wait.
 */
export const STATUS_RETRY_MS = 3_000;

/**
 * Connects to the database at the given address.
 * Gives null if there is no address: the server then runs without a
 * database, which is the normal case on a teammate's laptop.
 */
export function createDatabase(connectionString, options = {}) {
  if (typeof connectionString !== "string" || connectionString.trim() === "") {
    return null;
  }
  // A "pool" is a small set of open connections that are shared and reused,
  // because opening a new one for every question would be slow.
  const pool = new pg.Pool({
    connectionString,
    max: 3, //                         at most three connections at once
    idleTimeoutMillis: 10_000, //      close a connection nobody has used for 10 seconds, so the free database can go to sleep
    connectionTimeoutMillis: 10_000, // give up if the database does not answer within 10 seconds
  });
  // A connection that is waiting in the pool can fail, for example when the
  // database goes to sleep. Without this line that would stop the server.
  pool.on("error", (error) => {
    console.error("Database: a waiting connection failed:", error.message);
  });
  return createDatabaseOn(pool, options);
}

/**
 * The same, on a pool given from outside. The tests use it with a pretend
 * pool, so most of them need no real database.
 *   table  the name of the table. Only the tests change it
 *   now    the clock. Only the tests change it
 */
export function createDatabaseOn(pool, { table = "server_starts", now = Date.now } = {}) {
  // The table name is the one thing written straight into the questions
  // below, so it is checked strictly. Everything else that varies is handed
  // over separately (the "$1" below), which is the safe way: the database
  // then never mistakes a value for part of the question.
  if (typeof table !== "string" || !/^[a-z_]{1,40}$/.test(table)) {
    throw new Error("Database: a table name may only contain small letters and underscores");
  }

  let tableReady = null; // a promise, so the table is only created once
  let lastStatus = null; // { at, value }: the last answer to status()
  let lastFailure = null; // { at, error }: the last time status() could not get an answer

  /** Creates the table if it does not exist yet. */
  function ensureTable() {
    if (tableReady === null) {
      tableReady = pool
        .query(
          `CREATE TABLE IF NOT EXISTS ${table} (
             id serial PRIMARY KEY,
             started_at timestamptz NOT NULL DEFAULT now()
           )`,
        )
        .catch((error) => {
          tableReady = null; // it failed: try again next time
          throw error;
        });
    }
    return tableReady;
  }

  return {
    /** Writes one row: "the server started now". Then removes rows older than the newest ones we keep. */
    async recordStart() {
      await ensureTable();
      await pool.query(`INSERT INTO ${table} DEFAULT VALUES`);
      await pool.query(
        `DELETE FROM ${table}
          WHERE id NOT IN (SELECT id FROM ${table} ORDER BY id DESC LIMIT $1)`,
        [STARTS_TO_KEEP],
      );
      lastStatus = null; // the count has changed
    },

    /**
     * Reads how many starts are recorded and when the latest was.
     * Gives { starts, latest }, where latest is a date as text, or null if
     * there are no rows.
     */
    async status() {
      if (lastStatus !== null && now() - lastStatus.at < STATUS_FRESH_MS) {
        return lastStatus.value;
      }
      if (lastFailure !== null && now() - lastFailure.at < STATUS_RETRY_MS) {
        throw lastFailure.error; // it failed a moment ago: do not ask again yet
      }
      let result;
      try {
        await ensureTable();
        result = await pool.query(
          `SELECT count(*)::int AS starts, max(started_at) AS latest FROM ${table}`,
        );
      } catch (error) {
        lastFailure = { at: now(), error };
        throw error;
      }
      lastFailure = null;
      const row = result.rows[0];
      const value = {
        starts: row.starts,
        latest: row.latest === null ? null : new Date(row.latest).toISOString(),
      };
      lastStatus = { at: now(), value };
      return value;
    },

    /** Closes the connections. Used when the program is about to end. */
    async close() {
      await pool.end();
    },
  };
}
