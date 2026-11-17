// Street life: the people who walk across a track, as the picture shows them.
//
// The rules about walkers are in shared/walkers.js: where each one is, who
// bumped into whom. This file only turns what the rules know into a list of
// things to draw. It needs no browser, so it has tests.

import { walkerAt, DOWN_STEPS } from "../shared/walkers.js";

/** How many different jumpers the walkers wear (props.js has the colours). */
export const WALKER_LOOKS = 6;

/**
 * The walkers of a track that can be seen at this moment.
 *   walkers     what the race remembers about each: [{ time, downSteps }]
 *               (anything else, such as a race that has no walkers, gives
 *               an empty list)
 *   stepsSince  how many steps have passed since "walkers" was true. The
 *               online page gets news of the walkers 20 times a second and
 *               draws 60 pictures a second: with this, a walker keeps
 *               walking smoothly in between
 * Gives [{ x, y, angle, down, downShare, look }]. A walker that is inside a
 * building is left out. "look" is a number from 0: which jumper it wears.
 */
export function walkersToShow(track, walkers, stepsSince = 0) {
  if (!Array.isArray(walkers)) {
    return [];
  }
  const passed = stepsSince > 0 ? stepsSince : 0;
  const shown = [];
  walkers.forEach((walker, number) => {
    const downSteps = walker?.downSteps > 0 ? Math.min(walker.downSteps, DOWN_STEPS) : 0;
    // A walker on the ground sits out the steps that passed; one that is up walks them.
    const stillDown = Math.max(0, downSteps - passed);
    const walked = Math.max(0, passed - downSteps);
    const spot = walkerAt(track, number, { time: (Number.isFinite(walker?.time) ? walker.time : 0) + walked, downSteps: stillDown });
    if (spot !== null && spot.outside) {
      shown.push({ x: spot.x, y: spot.y, angle: spot.angle, down: spot.down, downShare: spot.downShare, look: number % WALKER_LOOKS });
    }
  });
  return shown;
}
