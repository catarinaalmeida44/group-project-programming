// Tests for how the Nova lap looks: client/nova-lap-ground.js (the shapes of
// its ground), client/nova-lap-buildings.js (its buildings, roofs and
// railings), client/nova-lap-look.js (what puts them together) and the lists
// of pictures they use (client/wall-art.js, client/ground-art.js).
//
// How it all looks is checked by eye in a browser. These tests check the
// things that would make the picture lie about the track, or break the page:
//   - a shape or a building that sticks out of the map
//   - a wall that names a picture nobody painted
//   - a building standing where karts drive, or a roof too low to drive under
//   - a wall with nothing painted on it: a kart would bounce off thin air
//   - a statue or a tree standing on the road
//
// Whether the track is fair to race on is checked in nova-lap.test.js.
// The arithmetic these lists are fed into is checked in scenery.test.js.

import { describe, it, expect } from "vitest";
import { NOVA_LAP } from "../shared/tracks/nova-lap.js";
import { storeysOf } from "../shared/tracks/index.js";
import { tileKindAt } from "../shared/track.js";
import { NOVA_LAP_GROUND, NOVA_LAP_SIZE, shapeCovers } from "../client/nova-lap-ground.js";
import { NOVA_LAP_BLOCKS, NOVA_LAP_FENCES, NOVA_LAP_FLAT_STYLES } from "../client/nova-lap-buildings.js";
import { NOVA_LAP_UNITS_PER_METRE } from "../client/nova-lap-look.js";
import { SURFACES } from "../client/ground-art.js";
import { WALL_ART } from "../client/wall-art.js";
import { PROP_HEIGHT } from "../client/props.js";
import { createScenery, squaresWithScenery, squaresUnder } from "../client/scenery.js";
import { createBuildings } from "../client/buildings.js";
import { lookOfTrack, propsOfTrack } from "../client/track-looks.js";
import { RACE, eyeOf } from "../client/camera.js";

const track = NOVA_LAP;
const look = lookOfTrack(track);
const COLOUR = /^#[0-9a-f]{6}$/i;
const FACINGS = ["north", "east", "south", "west"];

// ---- Helpers ----

const isNumber = (value) => typeof value === "number" && Number.isFinite(value);
const nameOfBlock = (block, number) => block.name ?? `block ${number}`;

/** Is a rectangle [left, top, right, bottom], in squares, inside the map with room inside it? */
function fitsTheMap(rect) {
  if (!Array.isArray(rect) || rect.length !== 4 || !rect.every(isNumber)) {
    return false;
  }
  const [left, top, right, bottom] = rect;
  return left >= 0 && top >= 0 && right <= NOVA_LAP_SIZE.columns && bottom <= NOVA_LAP_SIZE.rows && right > left && bottom > top;
}

/** The pictures a block asks for, by name: one for each side that has one. */
function artOf(block) {
  const names = [];
  for (const face of [block.art, ...Object.values(block.faces ?? {})]) {
    if (face !== null && face !== undefined) {
      names.push(typeof face === "string" ? face : face.art);
    }
  }
  return names;
}

/** The squares whose middle lies inside a rectangle, as [column, row]. This is how the track decides what a building makes wall. */
function squaresWithMiddleIn(rect) {
  const squares = [];
  for (let row = Math.floor(rect[1]); row < rect[3]; row++) {
    for (let column = Math.floor(rect[0]); column < rect[2]; column++) {
      if (shapeCovers({ rect }, column, row)) {
        squares.push([column, row]);
      }
    }
  }
  return squares;
}

// ---- The tests ----

describe("the look of the Nova lap", () => {
  it("is the look the game uses for this track, with scenery and wall pictures of its own", () => {
    expect(look.ground).toBe(NOVA_LAP_GROUND);
    expect(look.scenery.blocks).toBe(NOVA_LAP_BLOCKS);
    expect(look.scenery.fences).toBe(NOVA_LAP_FENCES);
    expect(look.scenery.flatStyles).toBe(NOVA_LAP_FLAT_STYLES);
    expect(look.wallArt).toBe(WALL_ART);
  });

  it("says how many units one metre is: a square is 3 metres and 32 units", () => {
    expect(NOVA_LAP_UNITS_PER_METRE).toBeCloseTo(track.tileSize / 3);
    expect(look.scenery.unitsPerMetre).toBe(NOVA_LAP_UNITS_PER_METRE);
  });
});

describe("the ground of the Nova lap, as shapes", () => {
  it("has a map of the same size as the track", () => {
    expect(NOVA_LAP_SIZE).toEqual({ columns: track.columns, rows: track.rows });
  });

  it("keeps every shape inside the map", () => {
    NOVA_LAP_GROUND.forEach((shape, number) => {
      const which = `shape ${number} (${shape.surface})`;
      // Exactly one of the two ways to draw a shape.
      const waysGiven = [shape.rect, shape.poly].filter((way) => way !== undefined).length;
      expect(waysGiven, `${which} needs a rect or a poly, not both and not neither`).toBe(1);
      if (shape.rect) {
        expect(fitsTheMap(shape.rect), `${which}: rect ${shape.rect}`).toBe(true);
      } else {
        expect(Array.isArray(shape.poly) && shape.poly.length >= 3, `${which} needs at least three corners`).toBe(true);
        for (const corner of shape.poly) {
          expect(Array.isArray(corner) && corner.length === 2 && corner.every(isNumber), `${which}: corner ${corner}`).toBe(true);
          const [x, y] = corner;
          expect(x >= 0 && x <= NOVA_LAP_SIZE.columns && y >= 0 && y <= NOVA_LAP_SIZE.rows, `${which}: corner ${corner} is outside the map`).toBe(true);
        }
      }
    });
  });

  it("names only kinds of ground that ground-art.js can paint", () => {
    NOVA_LAP_GROUND.forEach((shape, number) => {
      expect(Object.hasOwn(SURFACES, shape.surface), `shape ${number}: "${shape.surface}"`).toBe(true);
    });
  });

  it("gives every shape the rule road, grass or wall, or none at all", () => {
    NOVA_LAP_GROUND.forEach((shape, number) => {
      expect(["road", "grass", "wall", undefined], `shape ${number} (${shape.surface}): "${shape.rule}"`).toContain(shape.rule);
    });
  });
});

describe("the buildings, roofs and railings of the Nova lap", () => {
  it("keeps every box inside the map, with room inside and a top above its base", () => {
    expect(NOVA_LAP_BLOCKS.length).toBeGreaterThan(0);
    NOVA_LAP_BLOCKS.forEach((block, number) => {
      const which = nameOfBlock(block, number);
      const base = block.base ?? 0;
      expect(fitsTheMap(block.rect), `${which}: rect ${block.rect}`).toBe(true);
      expect(base, which).toBeGreaterThanOrEqual(0);
      expect(block.top, `${which}: its top`).toBeGreaterThan(base);
      if (block.topEnd !== undefined) {
        expect(block.topEnd, `${which}: the other end of its sloping top`).toBeGreaterThan(base);
        expect(["x", "y"], `${which}: a sloping top needs slope "x" or "y"`).toContain(block.slope);
      }
    });
  });

  it("asks only for wall pictures that wall-art.js has, on sides that exist", () => {
    NOVA_LAP_BLOCKS.forEach((block, number) => {
      const which = nameOfBlock(block, number);
      for (const side of Object.keys(block.faces ?? {})) {
        expect(FACINGS, `${which}: a box has no side called "${side}"`).toContain(side);
      }
      for (const art of artOf(block)) {
        expect(Object.hasOwn(WALL_ART, art), `${which}: no picture called "${art}"`).toBe(true);
      }
    });
  });

  it("names only colours of tops and undersides that the list of styles has", () => {
    // A box that names none gets "roof" for its top and "plain" for its underside (scenery.js).
    expect(Object.hasOwn(NOVA_LAP_FLAT_STYLES, "roof")).toBe(true);
    expect(Object.hasOwn(NOVA_LAP_FLAT_STYLES, "plain")).toBe(true);
    NOVA_LAP_BLOCKS.forEach((block, number) => {
      const which = nameOfBlock(block, number);
      for (const part of ["soffit", "roof"]) {
        const style = block[part];
        if (typeof style === "string") {
          expect(Object.hasOwn(NOVA_LAP_FLAT_STYLES, style), `${which}: no ${part} style called "${style}"`).toBe(true);
        } else {
          // Left out (the usual colour) or null (none at all): nothing else.
          expect([undefined, null], `${which}: its ${part}`).toContain(style);
        }
      }
    });
  });

  it("gives every fence a picture that exists, a top above its base, and some length", () => {
    expect(NOVA_LAP_FENCES.length).toBeGreaterThan(0);
    NOVA_LAP_FENCES.forEach((fence, number) => {
      const which = fence.name ?? `fence ${number}`;
      expect(Object.hasOwn(WALL_ART, fence.art), `${which}: no picture called "${fence.art}"`).toBe(true);
      expect(fence.top, `${which}: its top`).toBeGreaterThan(fence.base ?? 0);
      for (const end of [fence.from, fence.to]) {
        expect(Array.isArray(end) && end.length === 2 && end.every(isNumber), `${which}: end ${end}`).toBe(true);
        expect(end[0] >= 0 && end[0] <= NOVA_LAP_SIZE.columns && end[1] >= 0 && end[1] <= NOVA_LAP_SIZE.rows, `${which}: end ${end} is outside the map`).toBe(true);
      }
      expect(Math.hypot(fence.to[0] - fence.from[0], fence.to[1] - fence.from[1]), `${which}: its length`).toBeGreaterThan(0);
    });
  });

  it("is accepted by scenery.js, which cuts it into strips and pieces", () => {
    const scenery = createScenery(track, look.scenery);
    expect(scenery.strips.length).toBeGreaterThan(NOVA_LAP_BLOCKS.length);
    expect(scenery.flats.length).toBeGreaterThan(0);
  });
});

describe("where the buildings of the Nova lap stand", () => {
  it("stands every solid box on wall squares only: no building where a kart can drive", () => {
    // A box makes wall of every square whose middle lies inside it
    // (NOVA_LAP_SOLID). If one of those squares is road or grass in the
    // track, karts drive through a painted building.
    NOVA_LAP_BLOCKS.forEach((block, number) => {
      if ((block.base ?? 0) !== 0 || block.solid === false) {
        return; // a roof overhead, or a box karts may drive through
      }
      for (const [column, row] of squaresWithMiddleIn(block.rect)) {
        expect(track.map[row][column], `${nameOfBlock(block, number)} stands on column ${column}, row ${row}`).toBe("#");
      }
    });
  });

  it("hangs every roof and bridge over the road at least 3.9 metres up, above the camera", () => {
    // The camera of a race is behind and above the kart. A roof lower than
    // its eye would cut through the picture.
    const eyeHeight = eyeOf(RACE).height; // in units
    let overTheRoad = 0;
    NOVA_LAP_BLOCKS.forEach((block, number) => {
      const base = block.base ?? 0;
      if (base === 0) {
        return; // stands on the ground: checked above
      }
      // Every square the box reaches over, even with a small part of it.
      const overOpenGround = squaresUnder(block.rect).some(({ column, row }) => track.map[row][column] !== "#");
      if (overOpenGround) {
        overTheRoad++;
        expect(base, `${nameOfBlock(block, number)} starts ${base} metres up`).toBeGreaterThanOrEqual(3.9);
        expect(base * NOVA_LAP_UNITS_PER_METRE, `${nameOfBlock(block, number)} is lower than the camera`).toBeGreaterThan(eyeHeight);
      }
    });
    expect(overTheRoad).toBeGreaterThan(0); // the atrium roof, the library bridge: there are some
  });
});

describe("no invisible walls on the Nova lap", () => {
  it("has scenery of its own at every wall a kart can touch, so no plain barrier is needed anywhere", () => {
    // The same steps as createPainter in client/draw.js: the squares that
    // have a building, a railing or a low wall, plus the squares with a
    // statue or a tree, get no barrier. Every other wall that touches open
    // ground gets one. Here none must be left: a barrier on this track
    // means a wall that somebody forgot to draw.
    const storeys = storeysOf(track);
    expect(storeys).toBe(null); // this track has no storeys: all its buildings are scenery
    const scenery = createScenery(track, look.scenery);
    const ownScenery = squaresWithScenery(scenery, track.tileSize);
    for (const prop of propsOfTrack(track, look, storeys)) {
      ownScenery.add(`${Math.floor(prop.x / track.tileSize)} ${Math.floor(prop.y / track.tileSize)}`);
    }
    const buildings = createBuildings(track, storeys, {
      barrierHeight: look.barrierHeight,
      noBarrierAt: (column, row) => ownScenery.has(`${column} ${row}`),
    });
    const stillABarrier = (buildings?.roofs ?? []).map((roof) => `column ${roof.column}, row ${roof.row}`);
    expect(stillABarrier).toEqual([]);
    expect(buildings?.sides ?? []).toEqual([]);
  });

  it("would have barriers all round without that scenery, so the test above really checks something", () => {
    expect(look.barrierHeight).toBeGreaterThan(0);
    const plain = createBuildings(track, null, { barrierHeight: look.barrierHeight });
    expect(plain.roofs.length).toBeGreaterThan(100);
  });
});

describe("the single things that stand on the Nova lap", () => {
  // Only the things the look lists one by one, placed by the real code.
  const listed = propsOfTrack(track, { ...look, scatter: [], treeBelt: undefined, route: null }, null);

  it("lists some, and places every one of them", () => {
    expect(look.props.length).toBeGreaterThan(0);
    expect(listed).toHaveLength(look.props.length);
  });

  it("stands every one of them inside the map", () => {
    for (const prop of listed) {
      const inside = prop.x >= 0 && prop.x < track.width && prop.y >= 0 && prop.y < track.height;
      expect(inside, `${prop.kind} at ${prop.x / track.tileSize}, ${prop.y / track.tileSize}`).toBe(true);
    }
  });

  it("stands none of them on a road square", () => {
    for (const prop of listed) {
      const where = `${prop.kind} at column ${Math.floor(prop.x / track.tileSize)}, row ${Math.floor(prop.y / track.tileSize)}`;
      expect(tileKindAt(track, prop.x, prop.y), where).not.toBe("road");
    }
  });

  it("uses only kinds of thing that props.js can paint, also for what the game adds by itself", () => {
    // propsOfTrack can add things of its own (arrow boards at sharp bends).
    for (const prop of propsOfTrack(track, look, storeysOf(track))) {
      expect(Object.hasOwn(PROP_HEIGHT, prop.kind), `"${prop.kind}"`).toBe(true);
      expect(PROP_HEIGHT[prop.kind]).toBeGreaterThan(0);
    }
  });
});

describe("the lists of pictures and colours", () => {
  it("gives every wall picture a paint function, a height, and either a length or a period", () => {
    const aboveZero = (value) => isNumber(value) && value > 0;
    for (const [name, art] of Object.entries(WALL_ART)) {
      expect(typeof art.paint, `${name}: paint`).toBe("function");
      expect(aboveZero(art.height), `${name}: height ${art.height}`).toBe(true);
      // "length" is for a picture that runs once from end to end, "period"
      // for one that repeats. Exactly one of the two, and the other left
      // out: scenery-paint.js takes any period at all to mean "repeats".
      const given = ["length", "period"].filter((key) => art[key] !== undefined);
      expect(given, `${name} needs a length or a period, not both and not neither`).toHaveLength(1);
      expect(aboveZero(art[given[0]]), `${name}: ${given[0]} ${art[given[0]]}`).toBe(true);
    }
  });

  it("gives every kind of ground a size above zero and a paint function", () => {
    for (const [name, surface] of Object.entries(SURFACES)) {
      expect(isNumber(surface.size) && surface.size > 0, `${name}: size ${surface.size}`).toBe(true);
      expect(typeof surface.paint, `${name}: paint`).toBe("function");
    }
  });

  it("writes every colour of a top or an underside as a colour the canvas can use", () => {
    for (const [name, style] of Object.entries(NOVA_LAP_FLAT_STYLES)) {
      expect(style.colour, name).toMatch(COLOUR);
      for (const part of style.parts ?? []) {
        expect(part.colour, `a part of ${name}`).toMatch(COLOUR);
      }
    }
  });

  it("keeps every stripe of a ceiling inside one square: four numbers from 0 to 1, with room inside", () => {
    for (const [name, style] of Object.entries(NOVA_LAP_FLAT_STYLES)) {
      for (const part of style.parts ?? []) {
        const which = `a part of ${name}: ${part.rect}`;
        expect(Array.isArray(part.rect) && part.rect.length === 4, which).toBe(true);
        for (const share of part.rect) {
          expect(isNumber(share) && share >= 0 && share <= 1, which).toBe(true);
        }
        const [left, top, right, bottom] = part.rect;
        expect(right > left && bottom > top, which).toBe(true);
      }
    }
  });
});

describe("the entrance front of the Nova lap", () => {
  // The glass front at the east end of the avenue is one long picture
  // ("front" in wall-art.js) on a wall made of four boxes, because the
  // doors are an opening. Each box must show its own part of the picture.
  const FIRST_ROW = 4; // the front starts at row 4 of the map
  const pieces = NOVA_LAP_BLOCKS.filter((block) => block.name?.startsWith("front, ") && block.rect[0] === 53 && block.rect[2] === 54).sort(
    (a, b) => a.rect[1] - b.rect[1],
  );

  it("is four boxes in a row, with no gap between them, from row 4 to row 20", () => {
    expect(pieces.map((block) => block.name)).toEqual([
      "front, white wall",
      "front, glass north of the doors",
      "front, over the doors",
      "front, glass south of the doors",
    ]);
    expect(pieces[0].rect[1]).toBe(FIRST_ROW);
    for (let i = 1; i < pieces.length; i++) {
      expect(pieces[i].rect[1], pieces[i].name).toBe(pieces[i - 1].rect[3]); // starts where the one before ends
    }
    expect(pieces[pieces.length - 1].rect[3]).toBe(20);
  });

  it("runs one picture unbroken over all four: each box starts it as far along as the box is from row 4", () => {
    for (const block of pieces) {
      expect(block.faces.west.art, block.name).toBe("front");
      expect(block.faces.west.shift, block.name).toBe(block.rect[1] - FIRST_ROW);
    }
  });

  it("has a picture exactly as long as the front: 16 squares of 3 metres", () => {
    const squares = pieces[pieces.length - 1].rect[3] - FIRST_ROW;
    expect(WALL_ART.front.length).toBe(squares * 3);
  });

  it("leaves the doors open: the box over them starts above the ground and the camera", () => {
    const overTheDoors = pieces.find((block) => block.name === "front, over the doors");
    expect(overTheDoors.base * NOVA_LAP_UNITS_PER_METRE).toBeGreaterThan(eyeOf(RACE).height);
    // And those squares are road in the track: the karts drive through here.
    for (let row = overTheDoors.rect[1]; row < overTheDoors.rect[3]; row++) {
      expect(track.map[row][53], `row ${row}`).toBe(".");
    }
  });
});
