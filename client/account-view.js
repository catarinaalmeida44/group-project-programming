// What the menu says about accounts: the words for the account corner at
// the top of the menu, and what is wrong with a form.
//
// This file is plain data and text and needs no browser, so it has tests.
// account.js talks to the server, and account-panel.js puts the result on
// the page.

import { checkUsername, checkPassword, USERNAME_MIN, USERNAME_MAX, PASSWORD_MIN } from "../shared/account-rules.js";
import { reasonCode, reasonText } from "./answers.js";

export const CHECKING_TEXT = "Checking who is signed in…";
export const UNAVAILABLE_TEXT = "Accounts are not available on this server right now. You can still race.";
export const CONFIRM_TEXT = "Tick the box to confirm that you want to delete your account.";
export const STILL_WAITING_TEXT = "Still waiting for the server to answer your last try.";

// The hints under the two boxes of the "Create account" form. The numbers
// come from the rules themselves, so the hints cannot go out of date.
export const USERNAME_HINT = `${USERNAME_MIN} to ${USERNAME_MAX} letters, digits or underscores. Other players see it on the leaderboard.`;
export const PASSWORD_HINT = `At least ${PASSWORD_MIN} characters. We do not ask for an email, so a forgotten password cannot be reset.`;

// What the account corner says after something worked.
export const SIGNED_IN_NOTICE = "You are signed in.";
export const SIGNED_UP_NOTICE = "Your account is made, and you are signed in.";
export const SIGNED_OUT_NOTICE = "You are signed out.";
export const DELETED_NOTICE = "Your account and all your saved results are deleted.";
export const PASSWORD_CHANGED_NOTICE = "Your password is changed. You were signed out on your other devices.";

// The "Change my password" form.
export const NEW_PASSWORD_HINT = `At least ${PASSWORD_MIN} characters, and not the one you have now.`;
export const SAME_PASSWORD_TEXT = "That is the password you already have. Choose a different one.";

/**
 * What accountApi.getMe() answered, checked: { available, signedIn, username }.
 * Anything that is not in that shape counts as "accounts are not available".
 */
export function readMe(answer) {
  if (answer === null || typeof answer !== "object" || answer.available !== true) {
    return { available: false, signedIn: false, username: null };
  }
  const signedIn = answer.signedIn === true && typeof answer.username === "string" && answer.username !== "";
  return { available: true, signedIn, username: signedIn ? answer.username : null };
}

/**
 * What the account corner of the menu shows.
 *   me   what the server said about who is signed in, or null while we wait
 * Gives { kind, username, text }:
 *   kind      "checking"     still waiting for the server
 *             "unavailable"  the server has no accounts right now
 *             "signedOut"    show "Sign in" and "Create account"
 *             "signedIn"     show the player's name and "Sign out"
 *   username  the player's name when signed in, otherwise null
 *   text      a sentence for the first two kinds, otherwise ""
 */
export function accountCorner(me) {
  if (me === null) {
    return { kind: "checking", username: null, text: CHECKING_TEXT };
  }
  const known = readMe(me);
  if (!known.available) {
    return { kind: "unavailable", username: null, text: UNAVAILABLE_TEXT };
  }
  if (known.signedIn) {
    return { kind: "signedIn", username: known.username, text: "" };
  }
  return { kind: "signedOut", username: null, text: "" };
}

// ---- What is wrong with a form ----
//
// The errors of a form are one object with a place for each part of the
// form. Each place holds null (fine) or a sentence for the player:
//   username, password   under that box
//   confirm              under the "I understand" tick box (delete only)
//   form                 for the form as a whole, such as "wrong password"

/** A form with nothing wrong. */
export const NO_ERRORS = Object.freeze({ username: null, password: null, confirm: null, form: null });

/** Is there at least one error? */
export function hasErrors(errors) {
  return Object.values(errors).some((text) => text !== null);
}

/**
 * What is wrong with a user name and password, before anything is sent.
 * The same rules as the server uses (shared/account-rules.js). The server
 * checks again: only its check protects anything.
 */
export function accountFormErrors(username, password) {
  return { ...NO_ERRORS, username: checkUsername(username), password: checkPassword(password) };
}

/** What is wrong with the "delete my account" form, before anything is sent. */
export function deleteFormErrors(password, confirmed) {
  return {
    ...NO_ERRORS,
    password: checkPassword(password),
    confirm: confirmed === true ? null : CONFIRM_TEXT,
  };
}

/**
 * What is wrong with the "change my password" form, before anything is
 * sent. This form has one more place for a sentence, "newPassword", under
 * the box for the new password. "password" is the box for the current one.
 */
export function changeFormErrors(currentPassword, newPassword) {
  const newProblem = checkPassword(newPassword);
  const same = typeof newPassword === "string" && newPassword === currentPassword;
  return {
    ...NO_ERRORS,
    password: checkPassword(currentPassword),
    newPassword: newProblem ?? (same ? SAME_PASSWORD_TEXT : null),
  };
}

/**
 * Where a "no" from the server is shown in the "change my password" form.
 * When the server says a password breaks the rules, or is the same as the
 * old one, it means the NEW password. Everything else, such as a wrong
 * current password, is for the form as a whole.
 */
export function changeRefusalErrors(answer) {
  const code = reasonCode(answer);
  if (code === "invalid_password" || code === "same_password") {
    return { ...NO_ERRORS, newPassword: reasonText(answer) };
  }
  return { ...NO_ERRORS, form: reasonText(answer) };
}

/**
 * Where a "no" from the server is shown in a form. The server's own sentence
 * is used. It goes under the box it is about when the reason names one, and
 * otherwise it is for the form as a whole.
 */
export function refusalErrors(answer) {
  const code = reasonCode(answer);
  const text = reasonText(answer);
  if (code === "invalid_username" || code === "username_taken") {
    return { ...NO_ERRORS, username: text };
  }
  if (code === "invalid_password") {
    return { ...NO_ERRORS, password: text };
  }
  return { ...NO_ERRORS, form: text };
}
