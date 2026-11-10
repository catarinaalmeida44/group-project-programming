// Small number helpers used by the game rules.

/**
 * Keeps a number between a lowest and a highest allowed value.
 *
 * Examples:
 *   clamp(50, 0, 100)  gives 50   (already inside the limits)
 *   clamp(120, 0, 100) gives 100  (too high, so it becomes the highest allowed)
 *   clamp(-5, 0, 100)  gives 0    (too low, so it becomes the lowest allowed)
 *
 * The driving rules will use this, for example to stop a kart's speed
 * from going above its top speed.
 *
 * It refuses bad input by stopping with an error instead of quietly giving
 * a wrong answer. One wrong number in the driving rules would otherwise
 * spread to the kart's position and be very hard to find.
 */
export function clamp(value, lowest, highest) {
  for (const input of [value, lowest, highest]) {
    if (typeof input !== "number" || Number.isNaN(input)) {
      throw new TypeError("clamp: value, lowest and highest must all be numbers");
    }
  }
  if (lowest > highest) {
    throw new RangeError("clamp: lowest cannot be above highest");
  }
  return Math.min(Math.max(value, lowest), highest);
}
