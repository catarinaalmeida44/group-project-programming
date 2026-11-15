// What the pages say about email: adding an email address to an account,
// "Forgot your password?", and the page a link in an email leads to.
//
// This file is plain data and text and needs no browser, so it has tests.
// account.js and link.js talk to the server, and account-panel.js and
// link.js put the result on the page.

import { checkEmail, checkPassword, PASSWORD_MIN } from "../shared/account-rules.js";
import { NO_ERRORS } from "./account-view.js";
import { reasonCode, reasonText } from "./answers.js";

export const EMAIL_HINT = "Only used to send you a link when you forget your password. Other players never see it.";
export const EMAIL_OFF_TEXT = "Email is not set up on this server, so an email address cannot be added right now.";
export const NO_EMAIL_TEXT = "No email address yet. Without one, a forgotten password cannot be reset.";
export const EMAIL_SENT_TEXT = "We sent a link to that address. Open it to confirm that the address is yours. It works for 60 minutes. Look in the spam folder too.";
export const EMAIL_REMOVED_TEXT = "Your email address was taken off your account.";
export const FORGOT_SENT_TEXT =
  "If an account has this email address, we sent it a link to choose a new password. It works for 30 minutes. Look in the spam folder too.";
export const NEW_PASSWORD_HINT_TEXT = `At least ${PASSWORD_MIN} characters.`;

// What the page a link leads to says.
export const LINK_MISSING_TEXT = "This page is opened with a link from one of our emails. The link seems to be incomplete: copy all of it from the email.";
export const CONFIRMING_TEXT = "Confirming your email address…";
export const CONFIRMED_TEXT = "Your email address is confirmed. If you ever forget your password, you can now reset it.";
export const RESET_INTRO_TEXT = "Choose a new password for your account.";

/** What the page says after a new password was set with a link. */
export function resetDoneText(username) {
  const who = typeof username === "string" && username !== "" ? ` for ${username}` : "";
  return `Your new password${who} is set. You were signed out on all your devices: sign in again with the new password.`;
}

/**
 * What "Your account" says about the player's email address.
 *   email  what accountApi.getEmail() gave: { available, email }
 */
export function emailStatusText(email) {
  if (typeof email?.email === "string" && email.email !== "") {
    return `Your email address: ${email.email}`;
  }
  return email?.available === true ? NO_EMAIL_TEXT : EMAIL_OFF_TEXT;
}

/**
 * Reads the secret part of a link from the end of the page's address, the
 * part after "#": "#confirm=..." or "#reset=...". Gives { kind, secret },
 * or null when it is not one of ours.
 *
 * The secret is put after the "#" on purpose. A browser never sends that
 * part of an address to a server, so the secret does not end up in the
 * server's list of visited addresses. The page reads it and sends it
 * itself, inside a message.
 */
export function readLink(hash) {
  const found = typeof hash === "string" ? hash.match(/^#(confirm|reset)=([A-Za-z0-9_-]{40,50})$/) : null;
  return found === null ? null : { kind: found[1], secret: found[2] };
}

// ---- What is wrong with a form, before anything is sent ----
// These forms have places for a sentence that the other account forms do
// not have: "email" under the email box, "newPassword" under a new password.

/** The "email address" form in "Your account": an address and the player's password. */
export function emailFormErrors(password, email) {
  return { ...NO_ERRORS, email: checkEmail(email), password: checkPassword(password) };
}

/** Taking the address off the account needs only the password. */
export function removeEmailErrors(password) {
  return { ...NO_ERRORS, email: null, password: checkPassword(password) };
}

/** The "Forgot your password?" form: only an address. */
export function forgotFormErrors(email) {
  return { ...NO_ERRORS, email: checkEmail(email) };
}

/** The form on the page a "choose a new password" link leads to. */
export function resetFormErrors(newPassword) {
  return { ...NO_ERRORS, newPassword: checkPassword(newPassword) };
}

// ---- Where a "no" from the server is shown ----

/** In the forms with an email box: what is about the address goes under it, the rest is for the form as a whole. */
export function emailRefusalErrors(answer) {
  const code = reasonCode(answer);
  if (code === "invalid_email" || code === "same_email" || code === "email_taken") {
    return { ...NO_ERRORS, email: reasonText(answer) };
  }
  return { ...NO_ERRORS, form: reasonText(answer) };
}

/** In the "choose a new password" form: a password that breaks the rules goes under its box. */
export function resetRefusalErrors(answer) {
  if (reasonCode(answer) === "invalid_password") {
    return { ...NO_ERRORS, newPassword: reasonText(answer) };
  }
  return { ...NO_ERRORS, form: reasonText(answer) };
}
