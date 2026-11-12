// The rules for user names and passwords.
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

/**
 * The form of a user name used to decide whether two names are the same
 * player: "Ana", "ANA" and "ana" all give "ana". The name is still shown
 * the way its owner typed it.
 */
export function usernameKey(username) {
  return username.toLowerCase();
}
