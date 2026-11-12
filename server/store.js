// The store: every question the game asks the database about players,
// sessions and race results, in one place.
//
// The rules about accounts (who may sign in, when an account is locked, how
// long a session lasts) are NOT here. They are in accounts.js, which only
// calls the functions below. That split lets us test the rules quickly with
// a pretend store kept in memory (tests/memory-store.js), and test this
// file separately against the real database.
//
// THE THREE TABLES
//   players       one row per account: the name as typed, the name in small
//                 letters (to stop "Ana" and "ana" both existing), the
//                 scrambled password, wrong-password count, locked until
//   sessions      one row per signed-in browser: a scrambled ticket, whose
//                 ticket it is, and when it stops working
//   race_results  one row per finished online race of a signed-in player
//
// Deleting a player also deletes their sessions and results: the database
// does that by itself ("ON DELETE CASCADE").
//
// SAFETY: a value is never written into the text of a question. Values are
// handed to the database separately, as $1, $2, ... The only thing written
// into the text is the table prefix, which is checked below.
//
// Times are whole numbers of milliseconds, as JavaScript counts them, so
// that the rules can be tested with a pretend clock.

/** What the database says when a row would break a "must be unique" rule. */
const ALREADY_EXISTS = "23505";

export function createStore(pool, { prefix = "" } = {}) {
  if (typeof prefix !== "string" || !/^[a-z_]{0,20}$/.test(prefix)) {
    throw new Error("Store: a table prefix may only contain small letters and underscores");
  }
  const players = `${prefix}players`;
  const sessions = `${prefix}sessions`;
  const results = `${prefix}race_results`;

  /** A row of the players table as the rest of the code sees it. */
  function playerFrom(row) {
    return {
      id: row.id,
      username: row.username,
      passwordHash: row.password_hash,
      failedLogins: row.failed_logins,
      lockedUntil: row.locked_until_ms === null ? null : Number(row.locked_until_ms),
    };
  }
  const PLAYER_COLUMNS = `id, username, password_hash, failed_logins,
    (extract(epoch from locked_until) * 1000)::bigint AS locked_until_ms`;

  /** The best time of each player on a track, fastest first. "column" is one of our own two column names. */
  async function bestTimes(column, track, limit) {
    const answer = await pool.query(
      `SELECT p.username, b.steps
         FROM (SELECT player_id, MIN(${column}) AS steps FROM ${results} WHERE track = $1 GROUP BY player_id) b
         JOIN ${players} p ON p.id = b.player_id
        ORDER BY b.steps ASC, p.username_key ASC
        LIMIT $2`,
      [track, limit],
    );
    return answer.rows.map((row) => ({ username: row.username, steps: row.steps }));
  }

  /** One player's best time on a track and its rank among all players, or null. */
  async function myBestTime(column, track, playerId) {
    const answer = await pool.query(
      `WITH best AS (SELECT player_id, MIN(${column}) AS steps FROM ${results} WHERE track = $1 GROUP BY player_id)
       SELECT mine.steps,
              (SELECT count(*) FROM best faster WHERE faster.steps < mine.steps)::int + 1 AS rank
         FROM best mine
        WHERE mine.player_id = $2`,
      [track, playerId],
    );
    return answer.rows.length === 0 ? null : { steps: answer.rows[0].steps, rank: answer.rows[0].rank };
  }

  return {
    /** Creates the three tables if they do not exist yet. Safe to run every time the server starts. */
    async ensureTables() {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS ${players} (
           id serial PRIMARY KEY,
           username text NOT NULL,
           username_key text NOT NULL UNIQUE,
           password_hash text NOT NULL,
           failed_logins integer NOT NULL DEFAULT 0,
           locked_until timestamptz,
           created_at timestamptz NOT NULL DEFAULT now()
         )`,
      );
      await pool.query(
        `CREATE TABLE IF NOT EXISTS ${sessions} (
           token_hash text PRIMARY KEY,
           player_id integer NOT NULL REFERENCES ${players}(id) ON DELETE CASCADE,
           expires_at timestamptz NOT NULL,
           created_at timestamptz NOT NULL DEFAULT now()
         )`,
      );
      await pool.query(
        `CREATE TABLE IF NOT EXISTS ${results} (
           id serial PRIMARY KEY,
           player_id integer NOT NULL REFERENCES ${players}(id) ON DELETE CASCADE,
           track text NOT NULL,
           mode text NOT NULL,
           race_steps integer NOT NULL CHECK (race_steps > 0),
           best_lap_steps integer NOT NULL CHECK (best_lap_steps > 0),
           position integer NOT NULL CHECK (position > 0),
           created_at timestamptz NOT NULL DEFAULT now()
         )`,
      );
      await pool.query(`CREATE INDEX IF NOT EXISTS ${results}_by_track ON ${results} (track, player_id)`);
    },

    // ---- players ----

    /** Adds a player. Gives { id, username }, or null if the name (in small letters) is taken. */
    async addPlayer({ username, usernameKey, passwordHash }) {
      try {
        const answer = await pool.query(
          `INSERT INTO ${players} (username, username_key, password_hash) VALUES ($1, $2, $3) RETURNING id, username`,
          [username, usernameKey, passwordHash],
        );
        return { id: answer.rows[0].id, username: answer.rows[0].username };
      } catch (error) {
        if (error.code === ALREADY_EXISTS) {
          // Two people asking for the same name at the same moment end up
          // here too: the database lets exactly one of them in.
          return null;
        }
        throw error;
      }
    },

    async findPlayerByKey(usernameKey) {
      const answer = await pool.query(`SELECT ${PLAYER_COLUMNS} FROM ${players} WHERE username_key = $1`, [usernameKey]);
      return answer.rows.length === 0 ? null : playerFrom(answer.rows[0]);
    },

    async findPlayerById(id) {
      const answer = await pool.query(`SELECT ${PLAYER_COLUMNS} FROM ${players} WHERE id = $1`, [id]);
      return answer.rows.length === 0 ? null : playerFrom(answer.rows[0]);
    },

    /** Counts one more wrong password. Gives the new count. The database adds one itself, so two wrong tries at once both count. */
    async addFailedLogin(id) {
      const answer = await pool.query(
        `UPDATE ${players} SET failed_logins = failed_logins + 1 WHERE id = $1 RETURNING failed_logins`,
        [id],
      );
      return answer.rows.length === 0 ? 0 : answer.rows[0].failed_logins;
    },

    /** Locks a player until a moment, and starts the wrong-password count again. */
    async lockPlayer(id, untilMs) {
      await pool.query(
        `UPDATE ${players} SET locked_until = to_timestamp($2::double precision / 1000), failed_logins = 0 WHERE id = $1`,
        [id, untilMs],
      );
    },

    async clearFailedLogins(id) {
      await pool.query(`UPDATE ${players} SET failed_logins = 0, locked_until = NULL WHERE id = $1`, [id]);
    },

    /** Deletes a player. Their sessions and results go with them. */
    async deletePlayer(id) {
      await pool.query(`DELETE FROM ${players} WHERE id = $1`, [id]);
    },

    // ---- sessions ----

    async addSession({ tokenHash, playerId, expiresAt }) {
      await pool.query(
        `INSERT INTO ${sessions} (token_hash, player_id, expires_at) VALUES ($1, $2, to_timestamp($3::double precision / 1000))`,
        [tokenHash, playerId, expiresAt],
      );
    },

    /** Gives { playerId, expiresAt } or null. It is the caller's job to check the time. */
    async findSession(tokenHash) {
      const answer = await pool.query(
        `SELECT player_id, (extract(epoch from expires_at) * 1000)::bigint AS expires_at_ms FROM ${sessions} WHERE token_hash = $1`,
        [tokenHash],
      );
      return answer.rows.length === 0
        ? null
        : { playerId: answer.rows[0].player_id, expiresAt: Number(answer.rows[0].expires_at_ms) };
    },

    async deleteSession(tokenHash) {
      await pool.query(`DELETE FROM ${sessions} WHERE token_hash = $1`, [tokenHash]);
    },

    /** Removes the sessions that stopped working before "nowMs". */
    async deleteExpiredSessions(nowMs) {
      await pool.query(`DELETE FROM ${sessions} WHERE expires_at <= to_timestamp($1::double precision / 1000)`, [nowMs]);
    },

    // ---- race results ----

    async addResult({ playerId, track, mode, raceSteps, bestLapSteps, position }) {
      await pool.query(
        `INSERT INTO ${results} (player_id, track, mode, race_steps, best_lap_steps, position) VALUES ($1, $2, $3, $4, $5, $6)`,
        [playerId, track, mode, raceSteps, bestLapSteps, position],
      );
    },

    /** The fastest whole race of each player on a track, fastest first: [{ username, steps }]. */
    bestRaces(track, limit) {
      return bestTimes("race_steps", track, limit);
    },

    /** The fastest single lap of each player on a track, fastest first: [{ username, steps }]. */
    bestLaps(track, limit) {
      return bestTimes("best_lap_steps", track, limit);
    },

    /** One player's best race and best lap on a track, each with its rank: { race, lap }, either of which may be null. */
    async myBest(track, playerId) {
      return {
        race: await myBestTime("race_steps", track, playerId),
        lap: await myBestTime("best_lap_steps", track, playerId),
      };
    },

    /** Removes the three tables. Only the tests use this, on tables with a test prefix. */
    async dropTables() {
      if (prefix === "") {
        throw new Error("Store: refusing to remove the real tables");
      }
      await pool.query(`DROP TABLE IF EXISTS ${results}, ${sessions}, ${players}`);
    },
  };
}
