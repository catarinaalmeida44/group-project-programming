// The page a link in one of our emails leads to (link.html).
//
// There are two kinds of link:
//   link.html#confirm=...  confirms that an email address belongs to a player
//   link.html#reset=...    lets a player choose a new password
//
// The long text after the "=" is the secret that proves the link came from
// our email. This page reads it from the end of its own address, takes it
// out of the address bar at once, and sends it to the server inside a
// message. The server decides everything (server/accounts.js). What the
// page says is in email-view.js, which has tests. This file only connects
// the two to the page, so it is checked by eye in a browser.
//
// The new password is read from its box only at the moment the form is
// sent, and is never kept or written anywhere else.

import { accountApi } from "./account-api.js";
import { showFormErrors, showFormWaiting } from "./account-panel.js";
import { NO_ERRORS, hasErrors } from "./account-view.js";
import { reasonText } from "./answers.js";
import {
  readLink,
  resetFormErrors,
  resetRefusalErrors,
  resetDoneText,
  LINK_MISSING_TEXT,
  CONFIRMING_TEXT,
  CONFIRMED_TEXT,
  RESET_INTRO_TEXT,
  NEW_PASSWORD_HINT_TEXT,
} from "./email-view.js";

const status = document.getElementById("link-status");
const form = document.getElementById("reset-form");
const next = document.getElementById("link-next");

/** Says one thing on the page, as text, and shows the way back to the menu when we are done. */
function say(text, done) {
  status.textContent = text;
  next.hidden = !done;
}

const link = readLink(window.location.hash);
// The secret must not stay where it can be seen or found again: not in the
// address bar, and not in the list of pages this browser has visited.
window.history.replaceState(null, "", window.location.pathname);

if (link === null) {
  say(LINK_MISSING_TEXT, true);
} else if (link.kind === "confirm") {
  say(CONFIRMING_TEXT, false);
  accountApi.confirmEmail(link.secret).then((answer) => {
    say(answer.ok === true ? CONFIRMED_TEXT : reasonText(answer), true);
  });
} else {
  say(RESET_INTRO_TEXT, false);
  document.getElementById("reset-new-password-hint").textContent = NEW_PASSWORD_HINT_TEXT;
  form.hidden = false;
  form.elements.newPassword.focus();

  // "Show the password while I type": a password box hides what is typed, a text box shows it.
  form.elements.show.addEventListener("change", () => {
    form.elements.newPassword.type = form.elements.show.checked ? "text" : "password";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault(); // we send the form ourselves: the browser must not load another page
    const errors = resetFormErrors(form.elements.newPassword.value);
    showFormErrors(form, errors);
    if (hasErrors(errors)) {
      form.elements.newPassword.focus();
      return;
    }
    showFormWaiting(form, true);
    const answer = await accountApi.resetPassword(link.secret, form.elements.newPassword.value);
    showFormWaiting(form, false);
    if (answer.ok === true) {
      form.reset();
      form.hidden = true;
      say(resetDoneText(answer.username), true);
      return;
    }
    showFormErrors(form, { ...NO_ERRORS, ...resetRefusalErrors(answer) });
    form.elements.newPassword.focus();
    form.elements.newPassword.select();
  });
}
