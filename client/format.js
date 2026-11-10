// Turning numbers into text for the screen.

/**
 * Turns a number of seconds into a race time such as "1:23.45"
 * (minutes, seconds, hundredths of a second). The hundredths are cut off,
 * not rounded, as on a stopwatch: 59.999 seconds shows as "0:59.99".
 * Anything that is not a sensible time shows as "-:--.--".
 */
export function formatTime(seconds) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) {
    return "-:--.--";
  }
  // Work in whole hundredths of a second. The tiny extra amount protects
  // against results such as 0.29 * 100 = 28.999999999999996.
  const hundredths = Math.floor(seconds * 100 + 0.000001);
  const minutes = Math.floor(hundredths / 6000);
  const wholeSeconds = Math.floor((hundredths % 6000) / 100);
  const rest = hundredths % 100;
  return `${minutes}:${twoDigits(wholeSeconds)}.${twoDigits(rest)}`;
}

function twoDigits(number) {
  return String(number).padStart(2, "0");
}
