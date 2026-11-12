// Accounts in the menu, on the page: the account corner at the top, and the
// three panels "Sign in", "Create account" and "Your account".
//
// The words come from account-view.js, and account.js talks to the server.
// This file only connects them to the page, so it is checked by eye in a
// browser.
//
// A password is read from its box only at the moment the form is sent, and
// handed straight to account.js. It is never saved or written anywhere
// else, and the box is emptied as soon as its panel closes.

import { createAccount } from "./account.js";
import {
  accountCorner,
  NO_ERRORS,
  USERNAME_HINT,
  PASSWORD_HINT,
  SIGNED_IN_NOTICE,
  SIGNED_UP_NOTICE,
  SIGNED_OUT_NOTICE,
  DELETED_NOTICE,
} from "./account-view.js";
import { NO_REASON } from "./answers.js";

/**
 * Shows the right part of the account corner.
 *   corner  from accountCorner() in account-view.js
 */
export function showAccountCorner(page, corner) {
  page.getElementById("account-status").textContent = corner.text;
  page.getElementById("account-check-again").hidden = corner.kind !== "unavailable";
  page.getElementById("account-signed-out").hidden = corner.kind !== "signedOut";
  page.getElementById("account-signed-in").hidden = corner.kind !== "signedIn";

  // The player's name, as plain text, everywhere it is shown.
  const name = corner.username ?? "";
  page.getElementById("account-name").textContent = name;
  page.getElementById("your-account-name").textContent = name;
  // "defaultValue" is what the box holds when its form is emptied.
  page.getElementById("delete-username").defaultValue = name;
}

/** Says something in the account corner, such as "You are signed in." Screen readers read it out. */
export function showAccountNotice(page, text) {
  page.getElementById("account-status").textContent = text;
}

/**
 * Shows what is wrong in a form, each sentence in its own place.
 *   errors  { username, password, confirm, form } from account-view.js;
 *           NO_ERRORS clears everything
 * In index.html every place for a sentence says which part it belongs to
 * (data-error-for="password"), and the box with that name is marked as wrong.
 */
export function showFormErrors(form, errors) {
  for (const place of form.querySelectorAll("[data-error-for]")) {
    const name = place.dataset.errorFor;
    const text = errors[name] ?? "";
    place.textContent = text;
    if (name === "form") {
      place.classList.toggle("is-error", text !== "");
      continue;
    }
    const box = form.elements[name];
    if (text === "") {
      box.removeAttribute("aria-invalid");
    } else {
      box.setAttribute("aria-invalid", "true"); // screen readers say "invalid", and style.css makes the border red
    }
  }
}

/** While a form is with the server: its button cannot be pressed again, and it says what is happening. */
export function showFormWaiting(form, waiting) {
  const button = form.querySelector('button[type="submit"]');
  button.disabled = waiting;
  form.querySelector('[data-error-for="form"]').textContent = waiting ? button.dataset.waiting : "";
}

/**
 * Empties the form in an account panel and takes away everything that was
 * said about it, so that no password stays behind in a box.
 */
function tidyPanel(panel) {
  const form = panel.querySelector(".account-form");
  form.reset();
  showFormErrors(form, NO_ERRORS);
  form.elements.password.type = "password"; // in case "show the password" was ticked
  const folded = panel.querySelector("details");
  if (folded) {
    folded.open = false; // fold "Delete my account" away again
  }
}

/** Closes an account panel, emptying its form first. */
function closePanel(panel) {
  tidyPanel(panel);
  panel.close();
}

/**
 * Makes a form send itself through account.js.
 *   send   sends the form; gives what account.js gave back
 *   onYes  what to do when it worked
 */
function connectForm(form, send, onYes) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault(); // we send the form ourselves: the browser must not load another page
    showFormErrors(form, NO_ERRORS);
    showFormWaiting(form, true);
    const result = await send();
    showFormWaiting(form, false);
    if (result.ok) {
      onYes();
      return;
    }
    showFormErrors(form, result.errors);
    // Put the keyboard where something has to be fixed: the first box that
    // is wrong, or the password when the form as a whole was refused.
    const box = form.querySelector('[aria-invalid="true"]') ?? form.elements.password;
    box.focus();
    box.select();
  });
}

/**
 * Connects accounts to the page.
 *   api       the functions of account-api.js, to talk to the server
 *   onChange  called with { available, signedIn, username } each time that
 *             changes (and with null while we wait for the first answer)
 */
export function connectAccount(page, { api, onChange = () => {} }) {
  const account = createAccount({
    api,
    onChange: (me) => {
      showAccountCorner(page, accountCorner(me));
      onChange(me);
    },
  });

  const signInPanel = page.getElementById("sign-in");
  const signUpPanel = page.getElementById("sign-up");
  const accountPanel = page.getElementById("your-account");
  const signInForm = page.getElementById("sign-in-form");
  const signUpForm = page.getElementById("sign-up-form");
  const deleteForm = page.getElementById("delete-account-form");

  page.getElementById("sign-up-username-hint").textContent = USERNAME_HINT;
  page.getElementById("sign-up-password-hint").textContent = PASSWORD_HINT;

  // ---- Opening the panels ----
  page.getElementById("open-sign-in").addEventListener("click", () => signInPanel.showModal());
  page.getElementById("open-sign-up").addEventListener("click", () => signUpPanel.showModal());
  page.getElementById("open-account").addEventListener("click", () => accountPanel.showModal());
  page.getElementById("account-check-again").addEventListener("click", () => account.check());

  // From one panel to the other.
  page.getElementById("sign-in-to-sign-up").addEventListener("click", () => {
    closePanel(signInPanel);
    signUpPanel.showModal();
  });
  page.getElementById("sign-up-to-sign-in").addEventListener("click", () => {
    closePanel(signUpPanel);
    signInPanel.showModal();
  });

  // The player can also close a panel with its own button or with Escape.
  // The browser then tells us ("close"), and the form is emptied as well.
  for (const panel of [signInPanel, signUpPanel, accountPanel]) {
    panel.addEventListener("close", () => tidyPanel(panel));
  }

  // "Show the password while I type": a password box hides what is typed, a text box shows it.
  signUpForm.elements.show.addEventListener("change", () => {
    signUpForm.elements.password.type = signUpForm.elements.show.checked ? "text" : "password";
  });

  // ---- Sending the forms ----
  connectForm(
    signInForm,
    () => account.signIn(signInForm.elements.username.value, signInForm.elements.password.value),
    () => {
      closePanel(signInPanel);
      showAccountNotice(page, SIGNED_IN_NOTICE);
      page.getElementById("open-account").focus();
    },
  );

  connectForm(
    signUpForm,
    () => account.signUp(signUpForm.elements.username.value, signUpForm.elements.password.value),
    () => {
      closePanel(signUpPanel);
      showAccountNotice(page, SIGNED_UP_NOTICE);
      page.getElementById("open-account").focus();
    },
  );

  connectForm(
    deleteForm,
    () => account.deleteAccount(deleteForm.elements.password.value, deleteForm.elements.confirm.checked),
    () => {
      closePanel(accountPanel);
      showAccountNotice(page, DELETED_NOTICE);
      page.getElementById("open-sign-in").focus();
    },
  );

  // ---- Signing out ----
  const signOutButton = page.getElementById("sign-out");
  signOutButton.addEventListener("click", async () => {
    signOutButton.disabled = true;
    const result = await account.signOut();
    signOutButton.disabled = false;
    if (result.ok) {
      showAccountNotice(page, SIGNED_OUT_NOTICE);
      page.getElementById("open-sign-in").focus();
    } else {
      showAccountNotice(page, result.errors.form ?? NO_REASON);
    }
  });

  account.check(); // ask the server who is signed in on this browser
  return account;
}
