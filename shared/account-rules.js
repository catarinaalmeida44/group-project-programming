// The rules for user names, passwords and email addresses.
//
// The browser uses them to tell a player at once what is wrong, before
// anything is sent. The server uses the very same rules and checks again,
// because anyone can skip the browser's check and send the server whatever
// they like. Only the server's check actually protects anything.

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 16;
export const PASSWORD_MIN = 8;
/** A limit on the long side too, so nobody can make the server work on a giant password. */
export const PASSWORD_MAX = 200;

/**
 * Checks a user name. Gives null if it is fine, or a sentence for the
 * player saying what is wrong.
 * Allowed: 3 to 16 letters (a to z, without accents), digits and underscores.
 */
export function checkUsername(username) {
  if (typeof username !== "string" || username.length < USERNAME_MIN) {
    return `A user name needs at least ${USERNAME_MIN} characters.`;
  }
  if (username.length > USERNAME_MAX) {
    return `A user name can have at most ${USERNAME_MAX} characters.`;
  }
  if (!/^[A-Za-z0-9_]+$/.test(username)) {
    return "A user name can only have letters without accents, digits and underscores.";
  }
  return null;
}

/** Checks a password. Gives null if it is fine, or a sentence saying what is wrong. */
export function checkPassword(password) {
  if (typeof password !== "string" || password.length < PASSWORD_MIN) {
    return `A password needs at least ${PASSWORD_MIN} characters.`;
  }
  if (password.length > PASSWORD_MAX) {
    return `A password can have at most ${PASSWORD_MAX} characters.`;
  }
  return null;
}

/** No email address is longer than this. */
export const EMAIL_MAX = 254;

/**
 * Checks an email address. Gives null if it looks like one, or a sentence
 * saying what is wrong. A space typed by accident before or after it is
 * forgiven.
 *
 * This only checks the shape: something, an @, a name with a dot in it,
 * and no characters that have no business in an address. Whether the
 * address really exists, and whose it is, is found out by sending a link
 * to it (server/accounts.js).
 */
export function checkEmail(email) {
  if (typeof email !== "string" || email.trim() === "") {
    return "Type an email address.";
  }
  const address = email.trim();
  if (address.length > EMAIL_MAX) {
    return `An email address can have at most ${EMAIL_MAX} characters.`;
  }
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(address)) {
    return "That does not look like an email address. It should look like name@example.com.";
  }
  return null;
}

/**
 * The form of an email address used to decide whether two addresses are
 * the same: "Ana@Example.com" and "ana@example.com " both give
 * "ana@example.com".
 */
export function emailKey(email) {
  return email.trim().toLowerCase();
}

/**
 * The form of a user name used to decide whether two names are the same
 * player: "Ana", "ANA" and "ana" all give "ana". The name is still shown
 * the way its owner typed it.
 */
export function usernameKey(username) {
  return username.toLowerCase();
}
