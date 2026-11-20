// The music of the game, as recorded files, and which one plays when.
//
// Until 20 November 2026 the game's music was made of notes played by our
// own code (music-score.js, by Rodrigo). Catarina then chose recorded music
// instead: five files, in client/music/. Who made them and under which
// licence is in client/music/README.md and in the credits of the main README.
//
//   the menu, and an online room before a race   the menu tune, round and round
//   the countdown                                  silence: the beeps are heard
//   racing, first lap                              a calm tune, round and round
//   racing, the laps between                       a faster one
//   racing, the last lap                           the fastest one
//   you crossed the line, others still drive      the last lap's tune goes on
//   the podium                                     trumpets and clapping, once
//   music switched off, or all sound off (M)       silence
//
// "place" is the same word the pages already hand to the music
// (raceMoment in music-cues.js): "menu", "countdown", "racing", "finished"
// or "podium".
//
// Only rules and sums here, so it is tested (tests/music-files.test.js).
// music.js plays the files.

/**
 * The five tunes: where the file is, whether it goes round and round, and
 * how loud it is played next to the others (1 is as recorded).
 */
export const TUNES = Object.freeze({
  menu: Object.freeze({ file: "/music/menu.mp3", loops: true, level: 1 }),
  "lap-first": Object.freeze({ file: "/music/lap-first.mp3", loops: true, level: 1 }),
  "lap-middle": Object.freeze({ file: "/music/lap-middle.mp3", loops: true, level: 1 }),
  "lap-last": Object.freeze({ file: "/music/lap-last.mp3", loops: true, level: 1 }),
  podium: Object.freeze({ file: "/music/podium.flac", loops: false, level: 1.6 }),
});

/** Is this the name of one of the tunes? Only the exact names. */
export function isTune(name) {
  return typeof name === "string" && Object.hasOwn(TUNES, name);
}

/**
 * The tune for a lap of a race.
 *   lapsDone  how many laps the driver has finished: 0 on the first lap
 *   laps      how many laps the race has
 * The last lap always gets the last lap's tune, also in a race of one lap.
 */
export function lapTune(lapsDone, laps) {
  const done = Number.isInteger(lapsDone) && lapsDone > 0 ? lapsDone : 0;
  const total = Number.isInteger(laps) && laps > 0 ? laps : 1;
  if (done >= total - 1) {
    return "lap-last";
  }
  return done === 0 ? "lap-first" : "lap-middle";
}

/**
 * The tune for a moment: a name from TUNES, or null for silence.
 *   place     "menu", "countdown", "racing", "finished" or "podium"
 *   lapsDone, laps   as for lapTune(), while racing
 *   musicOn   are the music and the master switch both on?
 */
export function tuneFor({ place, lapsDone = 0, laps = 1, musicOn = true }) {
  if (musicOn !== true) {
    return null;
  }
  switch (place) {
    case "menu":
      return "menu";
    case "racing":
      return lapTune(lapsDone, laps);
    case "finished":
      return "lap-last"; // you are home and watch the others: the last lap's tune goes on
    case "podium":
      return "podium";
    default:
      return null; // the countdown, or anything unknown
  }
}

/**
 * The tunes a page will need soon, so their files can be fetched before
 * they are due: the menu needs one, a race page the three laps and the podium.
 */
export function tunesAhead(page) {
  return page === "menu" ? ["menu"] : page === "race" ? ["lap-first", "lap-middle", "lap-last", "podium"] : [];
}

/** At most this much is cut off each end of a tune that goes round: an MP3 file has a short silence there, never more. */
export const MOST_TRIM_SECONDS = 0.1;

/** Quieter than this counts as silence. Samples go from -1 to 1. */
export const SILENCE = 0.002;

/**
 * Where a tune that goes round and round should jump back from, and to, so
 * that the join cannot be heard. An MP3 file starts and ends with a few
 * hundredths of a second of silence that the music itself does not have.
 * Played round and round as it is, there would be a tiny gap on every round.
 *   channels    the sound as lists of numbers from -1 to 1, one list for each
 *               loudspeaker (left, right)
 *   sampleRate  how many numbers make one second
 * Gives { start, end } in seconds. Never more than MOST_TRIM_SECONDS is cut
 * at either end, so a tune that really begins quietly is not shortened.
 */
export function loopPoints(channels, sampleRate) {
  const lists = Array.isArray(channels) ? channels.filter((list) => list !== null && typeof list === "object" && list.length > 0) : [];
  const length = lists.length === 0 ? 0 : Math.min(...lists.map((list) => list.length));
  if (length === 0 || !(sampleRate > 0)) {
    return { start: 0, end: 0 };
  }
  const most = Math.min(Math.floor(MOST_TRIM_SECONDS * sampleRate), Math.floor(length / 4));
  const loud = (index) => lists.some((list) => Math.abs(list[index]) > SILENCE);
  let first = 0;
  while (first < most && !loud(first)) {
    first++;
  }
  let last = length;
  while (length - last < most && !loud(last - 1)) {
    last--;
  }
  return { start: first / sampleRate, end: last / sampleRate };
}
