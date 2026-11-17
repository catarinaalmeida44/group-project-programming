// A pilot with a real face, instead of a helmet.
//
// When choosing a character (and later on the podium), each pilot shows the
// face of the person the character is. In the race every pilot keeps a
// helmet: faces are never shown there.
//
// The head with a face is a bigger ball than the helmet, like a bobblehead
// toy, so the face can be seen even in a small picture. The photo is painted
// on the front of that ball. Seen from the side, the face is squeezed and
// moves round the ball; seen from behind, only the back of the head shows.
//
// This file does the sums: how big the head is, where it sits, and how much
// of the face the eye can see. kart-paint.js paints it. The sums need no
// browser, so they are tested.

/** How much bigger the head with a face is than the helmet. */
export const FACE_HEAD_GROWTH = 1.8;

/** Below this share of the face turned towards the eye, the face is not painted: the eye sees the back of the head. */
export const LEAST_FACE_SEEN = 0.2;

/**
 * The bigger ball for a head with a face, made from the helmet ball of
 * kart-shape.js. The bottom of the head stays about where the bottom of the
 * helmet was, so the head grows upwards and does not sink into the body.
 */
export function faceHeadBall(helmet) {
  const radius = helmet.radius * FACE_HEAD_GROWTH;
  const [x, y, z] = helmet.middle;
  return {
    middle: [x, y, z - helmet.radius + radius * 0.9],
    radius,
    colour: helmet.colour, // for the back of the head
  };
}

/**
 * How much the face on this head is turned towards the eye, from 1 (it
 * looks straight at the eye) through 0 (the eye sees it from the side) to
 * -1 (the eye is right behind it). The pilot looks forwards, along x, and
 * only the left and right of the eye count: a camera a little above the
 * kart still sees the face.
 *   head  from faceHeadBall()
 *   eye   where the eye is, in the kart's own directions (a viewer's "eye" in kart-paint.js)
 */
export function faceTowardsEye(head, eye) {
  const ahead = eye[0] - head.middle[0];
  const sideways = eye[1] - head.middle[1];
  const length = Math.hypot(ahead, sideways);
  return length === 0 ? 0 : ahead / length;
}

/** Is enough of the face turned towards the eye to paint it? */
export function faceIsSeen(towardsEye) {
  return towardsEye >= LEAST_FACE_SEEN;
}

/**
 * The square of a face picture to paint on the head, as { x, y, size } in
 * pixels of the picture. Our pictures (client/faces) are 256 by 256, with
 * the face in the middle and a little hair and shoulder round it. The head
 * shows the inner part, so that the face fills it.
 */
export function faceSquare(pictureSize) {
  const margin = Math.round(pictureSize * 0.15); // the same on the left and on the right
  return { x: margin, y: Math.round(pictureSize * 0.04), size: pictureSize - margin * 2 };
}
