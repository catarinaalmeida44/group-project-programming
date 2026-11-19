// The podium at the end of a race, in the Hovione Atrium.
//
// When a race is over, the picture becomes this scene: a white hall with a
// glass wall and a big NOVA SBE sign, a podium of three steps, the first
// three drivers standing on it as in "Choose your character" (pilot-shape.js)
// but without a helmet, the winner lifting a gold trophy, the other two
// doing their own dance, and a crowd of students cheering round them.
//
// It is the same scene whatever track was raced: Pedro chose the atrium of
// the Nova lap for every race (17 November 2026). The words on the sign are
// written in our own letters, not with the school's logo.
//
// Like kart-shape.js and pilot-shape.js, this file only describes shapes, in
// the same units (x towards the camera, y to the right of a pilot who faces
// the camera, z up). It paints nothing, so it can be tested. The painting is
// in podium-view.js.

import { box, bar, shade } from "./kart-shape.js";
import { pilotParts, poseAt, cryingPose, mapPart, HEAD_HEIGHT } from "./pilot-shape.js";

/**
 * The three steps of the podium, seen from the camera: 2nd on the left,
 * 1st in the middle and highest, 3rd on the right. "y" is the middle of
 * the step across the hall (positive is the camera's left).
 */
export const PODIUM_STEPS = Object.freeze([
  Object.freeze({ place: 1, y: 0, height: 7, colour: "#e8b923" }),
  Object.freeze({ place: 2, y: 13, height: 4.6, colour: "#b9c3cc" }),
  Object.freeze({ place: 3, y: -13, height: 3, colour: "#c98a4b" }),
]);

/** How wide (across) and deep (towards the camera) each step is. */
export const STEP_WIDTH = 13;
export const STEP_DEPTH = 8;

const FLOOR = "#d8d2c8";
const WALL = "#f1eee8";
const GLASS = "#a9c8d8";
const STEP_TOP = "#f6f4ef";
const SKINS = ["#f1c7a6", "#d9a47c", "#b97c55", "#8a5a3c", "#f5d5bc", "#c68e66"];
const HAIRS = ["#2b2019", "#4a3324", "#d8c07a", "#1d1a18", "#7a4a2a", "#e3dccb"];
const SHIRTS = ["#2f7fe0", "#e23d3d", "#f0c330", "#3fb563", "#9a55d6", "#ef8a2b", "#f4f6f8", "#1c2f5a", "#e667a8", "#2fc4c4"];
const TROUSERS = ["#2c343d", "#1c2f5a", "#4a4f57", "#6b5a45"];

/**
 * How many students cheer round the podium. (28 at first. Catarina asked for
 * a crowd that looks like a lot of people, spread further out: 80 since the
 * evening of 18 November 2026.)
 */
export const CROWD_SIZE = 80;
/** The ways a student cheers: waving both arms, jumping, or clapping over the head. */
export const CROWD_CHEERS = Object.freeze(["wave", "jump", "clap"]);
/** How high a jumping student gets off the ground, in units. */
export const CROWD_JUMP = 2.4;

/**
 * Where the driver who came last stands and cries (see cryingDriver): on
 * the floor beside the step of third place, a little towards the camera,
 * in the gap between the podium and the students at the side. In the
 * podium's own directions, as PODIUM_STEPS: "y" below zero is the camera's
 * right.
 */
export const LOSER_SPOT = Object.freeze({ x: 7, y: -27 });
/** How many tears fly from each eye at a time, and their colour. */
export const TEARS_EACH_EYE = 5;
const TEAR = "#41b4ff";

/**
 * Where each student of the crowd stands, and in which colours: always the
 * same, so the crowd does not change from one picture to the next.
 * Gives [{ x, y, turn, skin, hair, shirt, trousers, phase, cheer }]. The
 * crowd stands in four rows behind the podium and in a group on each side
 * of it, never on it or in front of it.
 */
export function crowdSpots() {
  let seed = 7;
  const next = () => {
    seed = (seed * 16807) % 2147483647; // the same "chance" every time
    return seed / 2147483647;
  };
  const spots = [];
  const place = (x, y) => {
    spots.push({
      x,
      y,
      turn: Math.atan2(-y, 40 - x) * 0.6, // turned a little towards the middle of the hall
      skin: SKINS[Math.floor(next() * SKINS.length)],
      hair: HAIRS[Math.floor(next() * HAIRS.length)],
      shirt: SHIRTS[Math.floor(next() * SHIRTS.length)],
      trousers: TROUSERS[Math.floor(next() * TROUSERS.length)],
      phase: next() * Math.PI * 2,
      // How this student cheers: one in three waves, one jumps, one claps
      // (crowdPerson below). Taken from their number, not from "chance", so
      // that nobody stands anywhere else than before. (18 November 2026.)
      cheer: CROWD_CHEERS[spots.length % CROWD_CHEERS.length],
    });
  };
  // Four rows behind the podium, in three blocks with a way through
  // between them: one block behind the steps, and one further out on each
  // side. (On the Nova lap the low wall along the avenue runs through one of
  // the ways through, so nobody stands in it.)
  for (const x of [-10, -15.5, -21, -26.5]) {
    for (let i = 0; i < 6; i++) {
      place(x - next() * 1.5, -16 + i * 6.4 + (next() - 0.5) * 1.6);
    }
    for (const side of [1, -1]) {
      for (let i = 0; i < 5; i++) {
        place(x - next() * 1.5, side * (32 + i * 6 + next() * 1.5));
      }
    }
  }
  // A group on each side that reaches forwards, towards the camera, so that
  // the podium stands in the middle of the crowd. Never in front of the steps.
  for (let i = 0; i < 16; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    place(-4 + next() * 20, side * (32 + next() * 26));
  }
  return spots.slice(0, CROWD_SIZE);
}

/**
 * One student of the crowd, cheering, always with both arms up. How they
 * cheer is "cheer" in their spot:
 *   "wave"  bouncing on the toes, the arms waving from side to side (also
 *           for a spot that does not say)
 *   "jump"  jumping off the ground, the arms straight up
 *   "clap"  bouncing, clapping the hands over the head
 * About 17 units tall: shorter than the drivers, who are a little big, like
 * toy figures. Gives a list of parts.
 */
export function crowdPerson(spot, seconds) {
  const beat = seconds * Math.PI * 2 * 1.6 + spot.phase;
  const cheer = spot.cheer ?? "wave";
  const jump = cheer === "jump" ? CROWD_JUMP * Math.max(0, Math.sin(beat / 2)) ** 2 : 0; // up, down, and a moment on the ground
  const lift = cheer === "jump" ? 0.3 * Math.max(0, -Math.sin(beat / 2)) : 0.6 * Math.abs(Math.sin(beat / 2));
  const wave = Math.sin(beat);
  const hip = 6.8 + lift;
  const shoulder = 11.8 + lift;
  // Where the hands are, across: waving together from side to side, straight
  // up for a jump, or meeting over the head and opening again for a clap.
  const open = 0.5 * (1 + Math.cos(beat * 2)); // 0 when the hands meet
  const leftHand = cheer === "clap" ? -(0.35 + 2.7 * open) : cheer === "jump" ? -2.6 : -3.2 + wave * 0.9;
  const rightHand = cheer === "clap" ? 0.35 + 2.7 * open : cheer === "jump" ? 2.6 : 3.2 + wave * 0.9;
  const parts = [
    { name: "crowd left leg", faces: bar([0, -0.9, hip], [0.2, -1.0, 0.4], 1.4, spot.trousers) },
    { name: "crowd right leg", faces: bar([0, 0.9, hip], [0.2, 1.0, 0.4], 1.4, spot.trousers) },
    { name: "crowd body", faces: box(-1.0, 1.0, -2.0, 2.0, hip - 0.4, shoulder + 0.4, spot.shirt, shade(spot.shirt, 1.08)) },
    { name: "crowd left arm", faces: bar([0, -2.2, shoulder], [0.6, leftHand, shoulder + 4.6], 1.1, spot.skin) },
    { name: "crowd right arm", faces: bar([0, 2.2, shoulder], [0.6, rightHand, shoulder + 4.6], 1.1, spot.skin) },
    {
      name: "crowd head",
      // A ball of skin with the hair as a band over the top. The "visor" of
      // a helmet ball is painted in the skin's colour, so it is not seen.
      ball: { middle: [0.1, 0, shoulder + 2.6], radius: 1.9, colour: spot.skin, stripe: spot.hair, visor: spot.skin },
    },
  ];
  const cos = Math.cos(spot.turn);
  const sin = Math.sin(spot.turn);
  return parts.map((part) => mapPart(part, ([x, y, z]) => [spot.x + x * cos - y * sin, spot.y + x * sin + y * cos, z + jump]));
}

/**
 * The parts of the hall that never move: the floor, the back wall with its
 * glass, and the three steps. Gives a list of parts.
 */
export function hallParts() {
  const parts = [
    { name: "floor", low: true, faces: box(-60, 40, -70, 70, -0.6, 0, FLOOR) },
    {
      name: "back wall",
      faces: box(-32, -30, -70, 70, 0, 46, WALL),
      // Tall panes of glass in the wall, between white pillars.
      decals: Array.from({ length: 9 }, (_, i) => {
        const left = -54 + i * 12;
        return {
          colour: GLASS,
          points: [
            [-29.97, left, 3],
            [-29.97, left + 9, 3],
            [-29.97, left + 9, 26],
            [-29.97, left, 26],
          ],
        };
      }),
    },
  ];
  for (const step of PODIUM_STEPS) {
    parts.push(stepPart(step));
  }
  return parts;
}

/** One step of the podium, standing where it stands (or with its middle at "y", when given). */
export function stepPart(step, y = step.y) {
  const half = STEP_WIDTH / 2;
  return {
    name: `step ${step.place}`,
    faces: box(-STEP_DEPTH / 2, STEP_DEPTH / 2, y - half, y + half, 0, step.height, step.colour, STEP_TOP),
  };
}

/**
 * The podium as separate groups, for painting it on a real track (the Nova
 * lap, in front of the school's name) among the walls and trees there.
 * Each group is one step with its driver, or one student of the crowd:
 *   { at: [x, y], parts, shadows, labels }
 * "at" is where the group stands in the podium's own directions (as in
 * PODIUM_STEPS and crowdSpots), and its parts, shadows and labels are
 * measured from there. The race view (draw.js) sorts the groups with
 * everything else on the track, so a tree in front hides what is behind it.
 *   drivers  up to three, from podiumLineup() in podium.js, each with "picture"
 *   loser    the driver who came last, from podiumLoser() in podium.js,
 *            with "picture", or null: one more group, crying
 */
export function podiumGroups(drivers, seconds, crowd = crowdSpots(), loser = null) {
  const fromStep = (step) => ([x, y, z]) => [x, y - step.y, z];
  const steps = PODIUM_STEPS.map((step) => {
    const driver = drivers.find((one) => one.place === step.place);
    const parts = [stepPart(step, 0), ...(driver ? podiumDriver(driver, seconds).map((part) => mapPart(part, fromStep(step))) : [])];
    return {
      at: [0, step.y],
      parts,
      shadows: [{ x: 0.6, y: 0, along: STEP_DEPTH * 0.62, across: STEP_WIDTH * 0.62, turn: 0 }],
      labels: [{ text: String(step.place), point: [STEP_DEPTH / 2 + 0.05, 0, step.height / 2], size: Math.min(4.5, step.height * 0.8), colour: "#1d2733" }],
    };
  });
  const people = crowd.map((spot) => ({
    at: [spot.x, spot.y],
    parts: crowdPerson(spot, seconds).map((part) => mapPart(part, ([x, y, z]) => [x - spot.x, y - spot.y, z])),
    shadows: [{ x: 0.4, y: 0, along: 2.2, across: 2.6, turn: 0 }],
    labels: [],
  }));
  // The driver who came last, crying, when there is one (podiumLoser in podium.js).
  const crying =
    loser === null
      ? []
      : [{ at: [LOSER_SPOT.x, LOSER_SPOT.y], parts: cryingDriver(loser, seconds), shadows: [{ x: 0.4, y: 0, along: 3.2, across: 3.6, turn: 0 }], labels: [] }];
  return [...steps, ...people, ...crying];
}

/**
 * The words in the picture, to be painted on top of the shapes: the big
 * NOVA SBE sign on the wall and the numbers on the steps. Each is
 * { text, point, size, colour }: "point" is where the middle of the text is
 * in the hall, and "size" how tall the letters are, in units.
 */
export function hallLabels() {
  return [
    { text: "NOVA SBE", point: [-29.9, 0, 36], size: 7.5, colour: "#1d2733" },
    { text: "HOVIONE ATRIUM", point: [-29.9, 0, 30.2], size: 2.2, colour: "#4a5561" },
    ...PODIUM_STEPS.map((step) => ({
      text: String(step.place),
      point: [STEP_DEPTH / 2 + 0.05, step.y, step.height / 2],
      size: Math.min(4.5, step.height * 0.8),
      colour: "#1d2733",
    })),
  ];
}

/**
 * The driver standing on a step, in their pose, without a helmet: the
 * winner lifts the trophy, the others do their own dance. Gives a list of
 * parts. The head carries the picture of the person's head, if there is
 * one. A driver who is not a character has no picture: they keep a helmet
 * on, in their own colours, so no empty head is ever shown.
 *   driver  { place, look, hair, longHair, picture, dance }
 */
export function podiumDriver(driver, seconds) {
  const step = PODIUM_STEPS.find((one) => one.place === driver.place);
  if (step === undefined) {
    throw new RangeError("podiumDriver: only places 1, 2 and 3 stand on the podium");
  }
  const pose = driver.place === 1 ? poseAt("trophy", seconds) : poseAt(driver.dance ?? "clap", seconds + driver.place * 0.37);
  const parts = withTheirOwnHead(pilotParts(driver.look, driver.hair ?? "#2b2420", pose, false, driver.longHair ?? null), driver);
  return parts.map((part) => mapPart(part, ([x, y, z]) => [x, y + step.y, z + step.height]));
}

/**
 * Gives a pilot their own head: the picture of the person's head, if the
 * driver has one, or a helmet in their colours where the head is.
 */
function withTheirOwnHead(parts, driver) {
  return parts.map((part) => {
    if (part.name !== "head") {
      return part;
    }
    if (driver.picture) {
      return { ...part, head: { ...part.head, picture: driver.picture } };
    }
    // No picture: a helmet in the driver's colours where the head is.
    const [x, y, z] = part.head.middle;
    return {
      name: "helmet on the head",
      ball: { middle: [x, y, z - HEAD_HEIGHT * 0.12], radius: HEAD_HEIGHT * 0.36, colour: driver.look.helmet, stripe: driver.look.stripe, visor: "#16202b" },
    };
  });
}

/**
 * The driver who came last, standing on the floor and crying while
 * everyone else cheers (Catarina's idea, 19 November 2026). The same figure
 * as on the podium, with their own head and without a helmet, in the pose
 * of crying (cryingPose in pilot-shape.js), and with tears. Gives a list of
 * parts, measured from where the driver stands.
 *   driver  { look, hair, longHair, picture }, from podiumLoser() in podium.js
 */
export function cryingDriver(driver, seconds) {
  const figure = pilotParts(driver.look, driver.hair ?? "#2b2420", cryingPose(seconds), false, driver.longHair ?? null);
  const face = figure.find((part) => part.name === "head").head.middle;
  return [...withTheirOwnHead(figure, driver), ...tearParts(face, seconds)];
}

/**
 * The tears: blue drops that leave each eye like a little fountain, as in
 * a cartoon: up and out to the side in an arc, down as far as the
 * shoulders, and again, one after the other. (The first try had three small
 * drops an eye: they could not be seen at the size of the podium.) Each drop always flies the same way, worked out from the time, so
 * nothing has to be remembered.
 *   face  the middle of the head: [x, y, z]
 */
export function tearParts(face, seconds) {
  const parts = [];
  for (const side of [-1, 1]) {
    for (let drop = 0; drop < TEARS_EACH_EYE; drop++) {
      // How far this drop is along its way: 0 as it leaves the eye, 1 as it lands.
      const along = (((seconds * 1.3 + drop / TEARS_EACH_EYE + (side === 1 ? 0.1 : 0)) % 1) + 1) % 1;
      parts.push({
        name: "tear",
        ball: {
          middle: [face[0] + 2.6, face[1] + side * (2.6 + 6.4 * along), face[2] + 9 * along - 15 * along * along],
          radius: 0.95 * (1 - 0.4 * along), // it gets smaller as it falls
          colour: TEAR,
          stripe: TEAR,
          visor: TEAR,
        },
      });
    }
  }
  return parts;
}

/**
 * Everything that moves in the scene at a moment: the drivers on the
 * podium and the crowd. Gives { parts, shadows }.
 *   drivers  up to three, from podiumLineup() in podium.js
 *   loser    the driver who came last, from podiumLoser(), or null
 */
export function podiumMoving(drivers, seconds, crowd = crowdSpots(), loser = null) {
  const toTheirSpot = ([x, y, z]) => [x + LOSER_SPOT.x, y + LOSER_SPOT.y, z];
  const parts = [
    ...drivers.flatMap((driver) => podiumDriver(driver, seconds)),
    ...crowd.flatMap((spot) => crowdPerson(spot, seconds)),
    // The driver who came last, crying, when there is one.
    ...(loser === null ? [] : cryingDriver(loser, seconds).map((part) => mapPart(part, toTheirSpot))),
  ];
  const shadows = [
    ...PODIUM_STEPS.map((step) => ({ x: 0.6, y: step.y, along: STEP_DEPTH * 0.62, across: STEP_WIDTH * 0.62, turn: 0 })),
    ...crowd.map((spot) => ({ x: spot.x + 0.4, y: spot.y, along: 2.2, across: 2.6, turn: 0 })),
    ...(loser === null ? [] : [{ x: LOSER_SPOT.x + 0.4, y: LOSER_SPOT.y, along: 3.2, across: 3.6, turn: 0 }]),
  ];
  return { parts, shadows };
}
