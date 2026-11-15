// How long an online race may last.
//
// A race that has begun is driven to its end: the host cannot start over in
// the middle of one. So that a race always does end, it has two time limits.
// The server decides when the time is up (server/room.js). The page only
// shows how much is left (client/race-view.js). Both read the numbers here,
// so they can never disagree.
//
// Time is counted in steps of the game: 60 steps are one second.

/**
 * Once the first racer has finished, the others have this many steps left
 * to finish: two minutes. (One minute at first, on 13 November 2026.
 * Catarina asked for more the same day: a slow driver can be a whole lap
 * behind. Three minutes was the other choice, but then the winner waits
 * longer than the race itself took.)
 */
export const FINISH_WINDOW_STEPS = 2 * 60 * 60;

/** No race lasts longer than this many steps after GO: ten minutes. */
export const RACE_LIMIT_STEPS = 10 * 60 * 60;
