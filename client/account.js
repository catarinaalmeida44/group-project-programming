// Who is signed in, and the five things a player can do about it: create an
// account, sign in, sign out, change the password, and delete the account.
//
// This file asks the server through "api" (see account-api.js) and remembers
// who is signed in. It never touches the page: account-panel.js does that.
// So the tests can hand in a pretend api and watch what happens.
//
// A password is only ever passed on to the api. It is not kept here, and it
// is never part of anything this file gives back.

import {
  readMe,
  accountFormErrors,
  deleteFormErrors,
  changeFormErrors,
  changeRefusalErrors,
  hasErrors,
  refusalErrors,
  NO_ERRORS,
  STILL_WAITING_TEXT,
} from "./account-view.js";
import { saidYes, reasonCode } from "./answers.js";

const SIGNED_OUT = Object.freeze({ available: true, signedIn: false, username: null });

/**
 * Makes the account.
 *   api       the functions of account-api.js
 *   onChange  called with { available, signedIn, username } each time that
 *             changes, and with null while we wait for the server's first answer
 *
 * signUp, signIn, signOut and deleteAccount each give back
 *   { ok: true, errors }    it worked
 *   { ok: false, errors }   it did not; "errors" says what to show where
 *                           (see account-view.js)
 * Only one of them runs at a time. A second try while the first is still
 * with the server sends nothing and says so.
 */
export function createAccount({ api, onChange = () => {} }) {
  let waiting = false; // true while a try is with the server

  /** Asks the api one thing. Gives null instead of failing, whatever goes wrong. */
  async function ask(question) {
    try {
      return await question();
    } catch {
      return null;
    }
  }

  /** Asks the server who is signed in on this browser. */
  async function check() {
    onChange(null);
    onChange(readMe(await ask(() => api.getMe())));
  }

  /**
   * One try at something.
   *   errors    what is wrong with the form; if anything is, nothing is sent
   *   question  asks the api
   *   afterYes  what to do when the server said yes
   *   placeNo   where a "no" from the server is shown in the form
   */
  async function attempt(errors, question, afterYes, placeNo = refusalErrors) {
    if (waiting) {
      return { ok: false, errors: { ...NO_ERRORS, form: STILL_WAITING_TEXT } };
    }
    if (hasErrors(errors)) {
      return { ok: false, errors };
    }
    waiting = true;
    const answer = await ask(question);
    waiting = false;

    if (saidYes(answer)) {
      afterYes(answer);
      return { ok: true, errors: NO_ERRORS };
    }
    if (reasonCode(answer) === "not_signed_in") {
      onChange(SIGNED_OUT); // the server no longer knows us: show that
    }
    return { ok: false, errors: placeNo(answer) };
  }

  /** The server signed us in. It sends the name back the way its owner first typed it. */
  function signedInAs(answer, typedName) {
    const hasName = typeof answer.username === "string" && answer.username !== "";
    onChange({ available: true, signedIn: true, username: hasName ? answer.username : typedName });
  }

  /** A space typed by accident before or after a user name is dropped. A password is never changed. */
  function tidyName(username) {
    return typeof username === "string" ? username.trim() : username;
  }

  return {
    check,

    /** Makes a new account and signs in. */
    signUp(username, password) {
      const name = tidyName(username);
      return attempt(
        accountFormErrors(name, password),
        () => api.signUp(name, password),
        (answer) => signedInAs(answer, name),
      );
    },

    /** Signs in. */
    signIn(username, password) {
      const name = tidyName(username);
      return attempt(
        accountFormErrors(name, password),
        () => api.logIn(name, password),
        (answer) => signedInAs(answer, name),
      );
    },

    /** Signs out on this browser. */
    signOut() {
      return attempt(
        NO_ERRORS,
        () => api.logOut(),
        () => onChange(SIGNED_OUT),
      );
    },

    /**
     * Changes the signed-in player's password. Needs the current password
     * again. The player stays signed in on this browser, so nothing about
     * who is signed in changes here.
     */
    changePassword(currentPassword, newPassword) {
      return attempt(
        changeFormErrors(currentPassword, newPassword),
        () => api.changePassword(currentPassword, newPassword),
        () => {},
        changeRefusalErrors,
      );
    },

    /**
     * Deletes the signed-in player's account and all their saved results.
     * Needs the password again, and "confirmed" must be true: the player
     * ticked the box that says they understand.
     */
    deleteAccount(password, confirmed) {
      return attempt(
        deleteFormErrors(password, confirmed),
        () => api.deleteAccount(password),
        () => onChange(SIGNED_OUT),
      );
    },
  };
}
