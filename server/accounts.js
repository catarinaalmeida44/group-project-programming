// Accounts: the rules for signing up, signing in, staying signed in, saving
// race results and reading the leaderboard.
//
// This file decides. It does not talk to the internet (that is api.js) and
// it does not write database questions (that is store.js). It is handed a
// "store" and a clock, so the tests can give it a pretend store and move
// the clock forward by ten minutes or seven days in an instant.
//
// HOW STAYING SIGNED IN WORKS
// After a correct password the server makes up a long random "ticket" and
// gives it to the browser in a cookie. The browser sends it back with every
// later request, and that is how the server knows who is asking. The server
// keeps only a scrambled copy of the ticket: someone who could read our
// database would still not be able to use anyone's ticket. A ticket stops
// working after seven days, or at once when the player signs out.
//
// HOW EMAIL IS USED (since 15 November 2026)
// An email address is optional. It is there for one thing: getting back
// into an account when the password is forgotten.
//   1. A signed-in player types an address and their password. We send a
//      link to that address. Only when the link is opened does the address
//      count: that proves the mailbox is theirs, and a typing mistake cannot
//      hand the account to a stranger.
//   2. "Forgot your password?": someone types an address. If an account has
//      it, we send a link to choose a new password. The page says the same
//      thing either way, so nobody can find out whose address we have.
//   3. The link is opened and a new password is chosen. The player is
//      signed out everywhere and told by email that the password changed.
// A link is a long random text, like a ticket, and is kept the same way:
// only a scrambled copy. It works once, and only for a short time.
// Without the settings for email (see mailer.js) none of this is offered,
// and accounts work as before.

import { createHash, randomBytes } from "node:crypto";
import { checkUsername, checkPassword, checkEmail, usernameKey, emailKey, PASSWORD_MAX } from "../shared/account-rules.js";
import { hashPassword, passwordMatches, pretendToCheck } from "./passwords.js";
import { siteAddressFrom } from "./mailer.js";

export const SESSION_DAYS = 7;
/** After this many wrong passwords in a row, the account is locked for a while. */
export const WRONG_PASSWORDS_ALLOWED = 5;
export const LOCK_MINUTES = 10;
/** How many players the leaderboard shows. */
export const LEADERBOARD_SIZE = 10;
/**
 * The leaderboard of a track is reused for this long, so that many visitors
 * do not become many questions to the database. It is thrown away at once
 * when a new result is saved or an account is deleted.
 */
export const LEADERBOARD_FRESH_MS = 30_000;

/** A link to choose a new password works for this long. */
export const RESET_LINK_MINUTES = 30;
/** A link to confirm an email address works for this long. */
export const CONFIRM_LINK_MINUTES = 60;
/** At most this many emails of each kind are sent for one account in an hour. */
export const EMAILS_PER_HOUR = 3;

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

// The two kinds of link we send by email.
const CONFIRM = "confirm_email";
const RESET = "reset_password";

const no = (code, message) => ({ ok: false, code, message });
// The same answer for a name that does not exist and for a wrong password,
// so that trying names does not reveal which ones are taken.
const WRONG_LOGIN = no("wrong_login", "Wrong user name or password.");

/** The scrambled form of a ticket, which is what we keep. */
function scrambleTicket(ticket) {
  return createHash("sha256").update(ticket).digest("hex");
}

/** Does this look like a ticket we could have made? Saves asking the database about rubbish. */
function looksLikeATicket(ticket) {
  return typeof ticket === "string" && /^[A-Za-z0-9_-]{40,50}$/.test(ticket);
}

/** A whole number of steps we are willing to save: more than zero and not absurdly large. */
function isSteps(value) {
  return Number.isSafeInteger(value) && value > 0 && value < 60 * 60 * 60 * 24; // under a day of game time
}

/**
 * Makes the account rules.
 *   store      where players, sessions and results are kept (store.js)
 *   now        the clock. Only the tests change it
 *   passwords  how passwords are scrambled and checked. Only the tests change
 *              it, for a quick pretend scrambler: the real one is slow on
 *              purpose, and has tests of its own
 *   mailer     what sends email (mailer.js), or null: no email on this server
 *   siteAddress  the address of our own site, for the links in emails, such
 *              as "https://novasbe-kart.onrender.com". Without it, no email
 */
export function createAccounts(
  store,
  {
    now = Date.now,
    passwords = { hash: hashPassword, matches: passwordMatches, pretend: pretendToCheck },
    mailer = null,
    siteAddress = null,
  } = {},
) {
  const boards = new Map(); // track -> { at, races, laps }: the leaderboards read a moment ago
  let tablesReady = null; //   a promise, so the tables are only created once
  const site = siteAddressFrom(siteAddress); // checked: null unless it is a plain web address
  const emailReady = mailer !== null && site !== null;

  const EMAIL_OFF = no("email_unavailable", "Email is not set up on this server, so this is not possible right now.");
  const BAD_LINK = no("bad_link", "This link does not work any more. It was used already, or it is too old. Ask for a new one.");

  /**
   * Hands a message to the mailer and does not wait for it: nobody's
   * request should take longer, or fail, because the email service is slow
   * or down. If it could not be sent, that goes to our own log, without
   * the address it was for.
   */
  function sendWithoutWaiting(message) {
    try {
      Promise.resolve(mailer.send(message)).catch((error) => console.error("Email: a message could not be sent:", error.message));
    } catch (error) {
      console.error("Email: a message could not be sent:", error.message);
    }
  }

  /**
   * Makes a one-time link for a player and gives back its secret part.
   * Only a scrambled copy is kept, as with tickets.
   */
  async function makeLink(playerId, kind, email, minutes) {
    const secret = randomBytes(32).toString("base64url");
    await store.deleteOldEmailLinks(now() - HOUR_MS); // tidy up while we are here
    await store.addEmailLink({
      tokenHash: scrambleTicket(secret),
      playerId,
      kind,
      email,
      expiresAt: now() + minutes * MINUTE_MS,
      createdAt: now(),
    });
    return secret;
  }

  /** Has this account been sent as many emails of one kind as we allow in an hour? */
  async function sentEnough(playerId, kind) {
    return (await store.countEmailLinksSince(playerId, kind, now() - HOUR_MS)) >= EMAILS_PER_HOUR;
  }

  /** Tells a player by email that their password was changed, if they have an address and email is set up. */
  async function tellPasswordChanged(player) {
    if (!emailReady) {
      return;
    }
    const to = await store.emailOf(player.id);
    if (to !== null) {
      sendWithoutWaiting({
        to,
        subject: "Nova SBE kart racer: your password was changed",
        text:
          `Hello ${player.username},\n\n` +
          `The password of your account "${player.username}" was changed just now.\n\n` +
          `If that was you, all is well.\n\n` +
          `If it was not you, choose a new password at once. Open the game, click "Sign in" and then "Forgot your password?":\n${site}/`,
      });
    }
  }

  /**
   * Checks the password of a signed-in player once more, before something
   * that only the owner of the account may do. Counts wrong tries and locks
   * like a sign-in. Gives null if the password is right, or the answer to
   * send back.
   */
  async function refuseUnlessOwnPassword(player, password) {
    const notYours = no("wrong_login", "That is not your password.");
    if (typeof password !== "string" || password.length === 0 || password.length > PASSWORD_MAX) {
      return notYours;
    }
    const refusal = await refuseUnlessPasswordIsRight(player, password);
    return refusal === null ? null : refusal.code === "wrong_login" ? notYours : refusal;
  }

  /**
   * Makes sure the database tables exist before the first question. If the
   * database could not be reached, it is tried again at the next question,
   * so a database that was asleep when the server started is no problem.
   */
  function ready() {
    if (tablesReady === null) {
      tablesReady = store.ensureTables().catch((error) => {
        tablesReady = null;
        throw error;
      });
    }
    return tablesReady;
  }

  /** The ten fastest races and laps of a track, read from the database at most once in a while. */
  async function boardOf(track) {
    const kept = boards.get(track);
    if (kept !== undefined && now() - kept.at < LEADERBOARD_FRESH_MS) {
      return kept;
    }
    const ranked = (rows) => rows.map((row, index) => ({ rank: index + 1, username: row.username, steps: row.steps }));
    const fresh = {
      at: now(),
      races: ranked(await store.bestRaces(track, LEADERBOARD_SIZE)),
      laps: ranked(await store.bestLaps(track, LEADERBOARD_SIZE)),
    };
    boards.set(track, fresh);
    return fresh;
  }

  function lockedAnswer(lockedUntil) {
    const minutes = Math.max(1, Math.ceil((lockedUntil - now()) / MINUTE_MS));
    return no("locked", `Too many wrong passwords. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`);
  }

  /**
   * Checks a password for a player we already found. Counts wrong tries and
   * locks the account after too many. Gives null if the password is right,
   * or the answer to send back if it is not.
   */
  async function refuseUnlessPasswordIsRight(player, password) {
    if (player.lockedUntil !== null && player.lockedUntil > now()) {
      return lockedAnswer(player.lockedUntil); // locked: not even the right password works
    }
    if (await passwords.matches(password, player.passwordHash)) {
      if (player.failedLogins > 0 || player.lockedUntil !== null) {
        await store.clearFailedLogins(player.id);
      }
      return null;
    }
    const wrongTries = await store.addFailedLogin(player.id);
    if (wrongTries >= WRONG_PASSWORDS_ALLOWED) {
      const lockedUntil = now() + LOCK_MINUTES * MINUTE_MS;
      await store.lockPlayer(player.id, lockedUntil);
      return lockedAnswer(lockedUntil);
    }
    return WRONG_LOGIN;
  }

  return {
    /** Creates the database tables if needed. Run when the server starts, and again by itself before any question if that failed. */
    ensureTables: ready,

    /**
     * Makes a new account. Gives { ok: true, player: { id, username } }, or
     * { ok: false, code, message } when the name or the password breaks the
     * rules or the name is taken.
     */
    async signUp(username, password) {
      const nameProblem = checkUsername(username);
      if (nameProblem !== null) {
        return no("invalid_username", nameProblem);
      }
      const passwordProblem = checkPassword(password);
      if (passwordProblem !== null) {
        return no("invalid_password", passwordProblem);
      }
      await ready();
      const passwordHash = await passwords.hash(password);
      const player = await store.addPlayer({ username, usernameKey: usernameKey(username), passwordHash });
      if (player === null) {
        return no("username_taken", "Someone already has that user name. Choose another one.");
      }
      return { ok: true, player };
    },

    /** Checks a user name and password. Gives { ok: true, player } or { ok: false, code, message }. */
    async logIn(username, password) {
      // A name or password that could never have been accepted at sign-up
      // cannot be right. No need to ask the database or to scramble anything.
      if (
        checkUsername(username) !== null ||
        typeof password !== "string" ||
        password.length === 0 ||
        password.length > PASSWORD_MAX
      ) {
        return WRONG_LOGIN;
      }
      await ready();
      const player = await store.findPlayerByKey(usernameKey(username));
      if (player === null) {
        await passwords.pretend(password); // take as long as a real check would
        return WRONG_LOGIN;
      }
      const refusal = await refuseUnlessPasswordIsRight(player, password);
      return refusal ?? { ok: true, player: { id: player.id, username: player.username } };
    },

    /** Makes a ticket for a player who just signed in, and gives it back to be put in a cookie. */
    async startSession(playerId) {
      const ticket = randomBytes(32).toString("base64url");
      await ready();
      await store.deleteExpiredSessions(now()); // tidy up old ones while we are here
      await store.addSession({
        tokenHash: scrambleTicket(ticket),
        playerId,
        expiresAt: now() + SESSION_DAYS * DAY_MS,
      });
      return ticket;
    },

    /** Whose ticket is this? Gives { id, username }, or null for no ticket, an unknown one or one that has run out. */
    async playerForSession(ticket) {
      if (!looksLikeATicket(ticket)) {
        return null;
      }
      const tokenHash = scrambleTicket(ticket);
      await ready();
      const session = await store.findSession(tokenHash);
      if (session === null) {
        return null;
      }
      if (session.expiresAt <= now()) {
        await store.deleteSession(tokenHash);
        return null;
      }
      const player = await store.findPlayerById(session.playerId);
      return player === null ? null : { id: player.id, username: player.username };
    },

    /** Signs out: the ticket stops working at once. */
    async endSession(ticket) {
      if (looksLikeATicket(ticket)) {
        await ready();
        await store.deleteSession(scrambleTicket(ticket));
      }
    },

    /**
     * Changes a signed-in player's password.
     *   ticket           the ticket of the browser that asks, which stays signed in
     *   currentPassword  checked again, with the same lock after too many
     *                    wrong tries. Being signed in is not enough: someone
     *                    who finds a laptop open must not be able to take
     *                    the account over
     *   newPassword      has to keep the rules for passwords, and has to be
     *                    a different one
     *
     * Afterwards every OTHER browser where this player was signed in is
     * signed out. If someone else knew the old password, they are out now.
     * Gives { ok: true } or { ok: false, code, message }.
     */
    async changePassword(playerId, ticket, currentPassword, newPassword) {
      await ready();
      const player = await store.findPlayerById(playerId);
      if (player === null) {
        return no("not_signed_in", "You are not signed in.");
      }
      // The new password is looked at first: that costs nothing, and a new
      // password that breaks the rules can never be accepted anyway.
      const problem = checkPassword(newPassword);
      if (problem !== null) {
        return no("invalid_password", problem);
      }
      const notYours = no("wrong_login", "That is not your current password.");
      if (typeof currentPassword !== "string" || currentPassword.length === 0 || currentPassword.length > PASSWORD_MAX) {
        return notYours;
      }
      const refusal = await refuseUnlessPasswordIsRight(player, currentPassword);
      if (refusal !== null) {
        return refusal.code === "wrong_login" ? notYours : refusal;
      }
      if (newPassword === currentPassword) {
        return no("same_password", "That is the password you already have. Choose a different one.");
      }
      await store.setPasswordHash(player.id, await passwords.hash(newPassword));
      await store.deleteOtherSessions(player.id, looksLikeATicket(ticket) ? scrambleTicket(ticket) : null);
      await store.deleteEmailLinks(player.id, RESET); // a "new password" link that is still out stops working
      await tellPasswordChanged(player);
      return { ok: true };
    },

    // ---- email, and getting back into an account ----

    /** Is email set up on this server? Without it nothing below sends anything. */
    emailAvailable: () => emailReady,

    /** A player's own confirmed email address, or null. */
    async emailOf(playerId) {
      await ready();
      return store.emailOf(playerId);
    },

    /**
     * A signed-in player asks to add an email address to their account, or
     * to replace the one they have. The password is checked again: whoever
     * controls the address can later choose a new password, so a laptop
     * left open must not be enough to add one.
     *
     * Nothing about the account changes yet. We send a link to the address,
     * and the address only counts once that link is opened (confirmEmail).
     *
     * If the address already belongs to ANOTHER account, the answer is the
     * same "we sent a link" and nothing is sent. Otherwise a signed-in
     * player could find out whose addresses we have by trying them.
     */
    async requestEmail(playerId, password, email) {
      if (!emailReady) {
        return EMAIL_OFF;
      }
      const problem = checkEmail(email);
      if (problem !== null) {
        return no("invalid_email", problem);
      }
      await ready();
      const player = await store.findPlayerById(playerId);
      if (player === null) {
        return no("not_signed_in", "You are not signed in.");
      }
      const refusal = await refuseUnlessOwnPassword(player, password);
      if (refusal !== null) {
        return refusal;
      }
      const address = email.trim();
      const owner = await store.findPlayerByEmailKey(emailKey(address));
      if (owner !== null && owner.id === player.id) {
        return no("same_email", "That is already the email address of your account.");
      }
      if (await sentEnough(player.id, CONFIRM)) {
        return no("too_many_emails", "We already sent you several emails this hour. Try again later.");
      }
      if (owner === null) {
        const secret = await makeLink(player.id, CONFIRM, address, CONFIRM_LINK_MINUTES);
        sendWithoutWaiting({
          to: address,
          subject: "Nova SBE kart racer: confirm your email address",
          text:
            `Hello ${player.username},\n\n` +
            `Someone asked to use this email address for the account "${player.username}" on Nova SBE kart racer, ` +
            `so that a forgotten password can be reset.\n\n` +
            `If that was you, open this link to confirm. It works once, for ${CONFIRM_LINK_MINUTES} minutes:\n` +
            `${site}/link.html#confirm=${secret}\n\n` +
            `If it was not you, do nothing. The address is then not used.`,
        });
      }
      return { ok: true };
    },

    /**
     * The link in a "confirm your email address" message was opened. From
     * now on the address belongs to that account. Nobody needs to be signed
     * in for this: the link may be opened on another device.
     * Gives { ok: true, email } or { ok: false, code, message }.
     */
    async confirmEmail(secret) {
      if (!looksLikeATicket(secret)) {
        return BAD_LINK;
      }
      await ready();
      const link = await store.takeEmailLink(scrambleTicket(secret));
      if (link === null || link.kind !== CONFIRM || link.expiresAt <= now() || checkEmail(link.email) !== null) {
        return BAD_LINK;
      }
      // The database refuses an address that another account confirmed in the meantime.
      if (!(await store.setEmail(link.playerId, link.email, emailKey(link.email)))) {
        return no("email_taken", "That email address already belongs to another account.");
      }
      // Links to an address the player had before must not open the account any more.
      await store.deleteEmailLinks(link.playerId, RESET);
      return { ok: true, email: link.email };
    },

    /**
     * Takes the email address off a signed-in player's account, with their
     * password. This works on a server without email too: a player must
     * always be able to take their address back.
     */
    async removeEmail(playerId, password) {
      await ready();
      const player = await store.findPlayerById(playerId);
      if (player === null) {
        return no("not_signed_in", "You are not signed in.");
      }
      const refusal = await refuseUnlessOwnPassword(player, password);
      if (refusal !== null) {
        return refusal;
      }
      await store.clearEmail(player.id);
      await store.deleteEmailLinks(player.id, RESET);
      await store.deleteEmailLinks(player.id, CONFIRM);
      return { ok: true };
    },

    /**
     * "Forgot your password?" Someone typed an email address. If an account
     * has it, a link to choose a new password is sent there. The answer is
     * { ok: true } either way, also when that account has been sent enough
     * emails for this hour: nobody learns from it whose address we have.
     */
    async requestPasswordReset(email) {
      if (!emailReady) {
        return EMAIL_OFF;
      }
      const problem = checkEmail(email);
      if (problem !== null) {
        return no("invalid_email", problem); // says nothing about accounts: only that it is not an address
      }
      await ready();
      const player = await store.findPlayerByEmailKey(emailKey(email));
      if (player !== null && !(await sentEnough(player.id, RESET))) {
        const secret = await makeLink(player.id, RESET, null, RESET_LINK_MINUTES);
        sendWithoutWaiting({
          to: await store.emailOf(player.id),
          subject: "Nova SBE kart racer: choose a new password",
          text:
            `Hello ${player.username},\n\n` +
            `Someone asked for a new password for your account "${player.username}" on Nova SBE kart racer.\n\n` +
            `If that was you, open this link to choose a new password. It works once, for ${RESET_LINK_MINUTES} minutes:\n` +
            `${site}/link.html#reset=${secret}\n\n` +
            `If it was not you, do nothing. Your password stays as it is.`,
        });
      }
      return { ok: true };
    },

    /**
     * The link in a "choose a new password" message was opened and a new
     * password typed. The link is the proof here, so the old password is
     * not asked for. Afterwards the player is signed out on every device,
     * a lock from wrong passwords is lifted, and other links are thrown away.
     * Gives { ok: true, username } or { ok: false, code, message }.
     */
    async resetPassword(secret, newPassword) {
      // The password is looked at first, so that a password that breaks the
      // rules does not use the link up.
      const problem = checkPassword(newPassword);
      if (problem !== null) {
        return no("invalid_password", problem);
      }
      if (!looksLikeATicket(secret)) {
        return BAD_LINK;
      }
      await ready();
      const link = await store.takeEmailLink(scrambleTicket(secret));
      if (link === null || link.kind !== RESET || link.expiresAt <= now()) {
        return BAD_LINK;
      }
      const player = await store.findPlayerById(link.playerId);
      if (player === null) {
        return BAD_LINK;
      }
      await store.setPasswordHash(player.id, await passwords.hash(newPassword));
      await store.clearFailedLogins(player.id);
      await store.deleteOtherSessions(player.id, null);
      await store.deleteEmailLinks(player.id, RESET);
      await tellPasswordChanged(player);
      return { ok: true, username: player.username };
    },

    /**
     * Deletes a player's account with all their sessions and results. The
     * password is checked again, with the same lock after too many wrong tries.
     */
    async deleteAccount(playerId, password) {
      await ready();
      const player = await store.findPlayerById(playerId);
      if (player === null) {
        return no("not_signed_in", "You are not signed in.");
      }
      if (typeof password !== "string" || password.length === 0 || password.length > PASSWORD_MAX) {
        return no("wrong_login", "That is not your password.");
      }
      const refusal = await refuseUnlessPasswordIsRight(player, password);
      if (refusal !== null) {
        return refusal.code === "wrong_login" ? no("wrong_login", "That is not your password.") : refusal;
      }
      await store.deletePlayer(playerId);
      boards.clear(); // their times must leave every leaderboard at once
      return { ok: true };
    },

    /**
     * Saves the result of a race the server ran. Only server code calls
     * this: there is no way for a browser to send a result. Says false, and
     * saves nothing, for numbers that cannot be a real result.
     */
    async saveResult({ playerId, track, raceSteps, bestLapSteps, position }) {
      const sensible =
        Number.isSafeInteger(playerId) &&
        typeof track === "string" &&
        track.length > 0 &&
        isSteps(raceSteps) &&
        isSteps(bestLapSteps) &&
        bestLapSteps <= raceSteps &&
        Number.isSafeInteger(position) &&
        position >= 1 &&
        position <= 100;
      if (!sensible) {
        return false;
      }
      await ready();
      await store.addResult({ playerId, track, mode: "online", raceSteps, bestLapSteps, position });
      boards.delete(track); // the next visitor of this leaderboard sees the new result
      return true;
    },

    /**
     * The leaderboard of one track:
     *   races, laps  the ten fastest, one row per player: [{ rank, username, steps }]
     *   mine         the asking player's own best and rank, or null
     * Only user names and times leave this function. Nothing else about a
     * player is ever shown to others.
     */
    async leaderboard(track, playerId = null) {
      await ready();
      const { races, laps } = await boardOf(track);
      let mine = null;
      if (playerId !== null) {
        const best = await store.myBest(track, playerId);
        if (best.race !== null && best.lap !== null) {
          mine = {
            raceRank: best.race.rank,
            raceSteps: best.race.steps,
            lapRank: best.lap.rank,
            lapSteps: best.lap.steps,
          };
        }
      }
      return { races, laps, mine };
    },
  };
}
