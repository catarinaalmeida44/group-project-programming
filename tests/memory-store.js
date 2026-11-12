// A pretend store that keeps everything in memory. It is not a test itself.
//
// It offers the same functions as server/store.js, the real one, which
// talks to the database. The rules about accounts (server/accounts.js) can
// then be tested in a fraction of a second and without any database.
//
// To make sure the pretend store and the real one behave the same way, both
// are put through the same list of checks: tests/store-contract.js.

export function createMemoryStore() {
  let players = []; // { id, username, usernameKey, passwordHash, failedLogins, lockedUntil }
  let sessions = []; // { tokenHash, playerId, expiresAt }
  let results = []; // { playerId, track, mode, raceSteps, bestLapSteps, position }
  let nextId = 1;

  const visible = (player) => ({
    id: player.id,
    username: player.username,
    passwordHash: player.passwordHash,
    failedLogins: player.failedLogins,
    lockedUntil: player.lockedUntil,
  });

  /** The best value of one field for each player on a track, fastest first. */
  function bestOf(field, track) {
    const best = new Map(); // player id -> steps
    for (const result of results) {
      if (result.track === track && (!best.has(result.playerId) || result[field] < best.get(result.playerId))) {
        best.set(result.playerId, result[field]);
      }
    }
    return [...best.entries()]
      .map(([playerId, steps]) => ({ player: players.find((player) => player.id === playerId), steps }))
      .sort((a, b) => a.steps - b.steps || (a.player.usernameKey < b.player.usernameKey ? -1 : 1));
  }

  function myBestOf(field, track, playerId) {
    const all = bestOf(field, track);
    const mine = all.find((entry) => entry.player.id === playerId);
    if (mine === undefined) {
      return null;
    }
    return { steps: mine.steps, rank: all.filter((entry) => entry.steps < mine.steps).length + 1 };
  }

  return {
    async ensureTables() {},

    async addPlayer({ username, usernameKey, passwordHash }) {
      if (players.some((player) => player.usernameKey === usernameKey)) {
        return null;
      }
      const player = { id: nextId++, username, usernameKey, passwordHash, failedLogins: 0, lockedUntil: null };
      players.push(player);
      return { id: player.id, username };
    },

    async findPlayerByKey(usernameKey) {
      const player = players.find((each) => each.usernameKey === usernameKey);
      return player === undefined ? null : visible(player);
    },

    async findPlayerById(id) {
      const player = players.find((each) => each.id === id);
      return player === undefined ? null : visible(player);
    },

    async addFailedLogin(id) {
      const player = players.find((each) => each.id === id);
      if (player === undefined) {
        return 0;
      }
      player.failedLogins += 1;
      return player.failedLogins;
    },

    async lockPlayer(id, untilMs) {
      const player = players.find((each) => each.id === id);
      if (player !== undefined) {
        player.lockedUntil = untilMs;
        player.failedLogins = 0;
      }
    },

    async clearFailedLogins(id) {
      const player = players.find((each) => each.id === id);
      if (player !== undefined) {
        player.failedLogins = 0;
        player.lockedUntil = null;
      }
    },

    async deletePlayer(id) {
      players = players.filter((player) => player.id !== id);
      sessions = sessions.filter((session) => session.playerId !== id);
      results = results.filter((result) => result.playerId !== id);
    },

    async addSession({ tokenHash, playerId, expiresAt }) {
      sessions.push({ tokenHash, playerId, expiresAt });
    },

    async findSession(tokenHash) {
      const session = sessions.find((each) => each.tokenHash === tokenHash);
      return session === undefined ? null : { playerId: session.playerId, expiresAt: session.expiresAt };
    },

    async deleteSession(tokenHash) {
      sessions = sessions.filter((session) => session.tokenHash !== tokenHash);
    },

    async deleteExpiredSessions(nowMs) {
      sessions = sessions.filter((session) => session.expiresAt > nowMs);
    },

    async addResult(result) {
      results.push({ ...result });
    },

    async bestRaces(track, limit) {
      return bestOf("raceSteps", track)
        .slice(0, limit)
        .map((entry) => ({ username: entry.player.username, steps: entry.steps }));
    },

    async bestLaps(track, limit) {
      return bestOf("bestLapSteps", track)
        .slice(0, limit)
        .map((entry) => ({ username: entry.player.username, steps: entry.steps }));
    },

    async myBest(track, playerId) {
      return {
        race: myBestOf("raceSteps", track, playerId),
        lap: myBestOf("bestLapSteps", track, playerId),
      };
    },

    async dropTables() {
      players = [];
      sessions = [];
      results = [];
    },

    // Only the pretend store has these two. Tests use them to look inside.
    countSessions: () => sessions.length,
    countResults: () => results.length,
  };
}
