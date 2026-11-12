// Reading an answer from the server about accounts or the leaderboard
// (the answers are described in account-api.js), carefully.
//
// The menu shows these answers to the player. An answer that is missing, or
// is not in the shape we expect, must not break the page: it becomes a calm
// sentence instead.

/** What we say when an answer gives no reason we can show. */
export const NO_REASON = "That did not work. Try again in a moment.";

/** Did the server say yes? Only a real answer with "ok: true" counts. */
export function saidYes(answer) {
  return answer !== null && typeof answer === "object" && answer.ok === true;
}

/**
 * The short word for why the server said no, such as "wrong_login" or
 * "offline". Gives "" when the answer has none.
 */
export function reasonCode(answer) {
  const code = answer !== null && typeof answer === "object" ? answer.code : undefined;
  return typeof code === "string" ? code : "";
}

/**
 * The sentence to show the player when the server said no: the server's own
 * message, or a calm one of ours when it sent none.
 */
export function reasonText(answer) {
  const message = answer !== null && typeof answer === "object" ? answer.message : undefined;
  return typeof message === "string" && message.trim() !== "" ? message : NO_REASON;
}
