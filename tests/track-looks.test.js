// Tests for client/track-looks.js (how each track looks and what stands
// beside its road) and for the low banks that client/buildings.js can now
// make out of walls without storeys.
//
// How it all looks is checked by eye. These tests check the things that
// would make the picture lie about the track: a tree standing on the road,
// an arrow that points the wrong way, a bank where there is no wall, a
// colour the canvas cannot use.

import { describe, it, expect } from "vitest";
import { lookOfTrack, propsOfTrack } from "../client/track-looks.js";
import { routePoints, routeDirection } from "../client/route.js";
import { createBuildings, buildingsInView } from "../client/buildings.js";
import { RACE, CHASE, SCREEN } from "../client/camera.js";
import { createTrack, tileKindAt } from "../shared/track.js";
import { TRACKS, storeysOf } from "../shared/tracks/index.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";
import { CAMPUS_LOOP } from "../shared/tracks/campus-loop.js";

const COLOUR = /^#[0-9a-f]{6}$/i;
const everyTrack = Object.entries(TRACKS);

describe("the look of each track", () => {
  it("exists for every track in the list, and is not the same for the oval and the campus", () => {
    for (const [name, track] of everyTrack) {
      expect(lookOfTrack(track), name).toBeTruthy();
    }
    expect(lookOfTrack(TEST_OVAL)).not.toBe(lookOfTrack(CAMPUS_LOOP));
  });

  it("gives a track nobody made a look for the plain circuit, instead of breaking", () => {
    const unknown = createTrack({
      name: "Nobody's track",
      tileSize: 10,
      laps: 1,
      map: ["#####", "#...#", "#.#.#", "#...#", "#####"],
      start: { column: 1, row: 1, angle: 0 },
      checkpoints: [
        { name: "a", column: 1, row: 2, columns: 1, rows: 1 },
        { name: "b", column: 2, row: 1, columns: 1, rows: 1 },
        { name: "c", column: 3, row: 2, columns: 1, rows: 1 },
      ],
    });
    const look = lookOfTrack(unknown);
    expect(look.road.shades).toHaveLength(2);
    expect(propsOfTrack(unknown, look)).toEqual([]); // too small for trees, and it has no route
  });

  it("has every colour the painters ask for, as a colour the canvas can use", () => {
    for (const [name, track] of everyTrack) {
      const look = lookOfTrack(track);
      const colours = [
        ...look.road.shades,
        ...look.grass.shades,
        ...look.wall.shades,
        look.beyond,
        look.haze,
        look.sky.top,
        look.sky.low,
        ...look.barrier.colours,
        look.barrier.top,
        ...Object.values(look.buildings.wall),
        look.buildings.glass,
        look.buildings.roof,
        ...look.far.map((band) => band.colour),
      ];
      for (const colour of colours) {
        expect(colour, `${name}: ${colour}`).toMatch(COLOUR);
      }
      expect(Object.keys(look.buildings.wall).sort()).toEqual(["east", "north", "south", "west"]);
      expect(look.barrierHeight).toBeGreaterThan(0);
    }
  });

  it("has something on the horizon in every direction", () => {
    for (const [name, track] of everyTrack) {
      const { far } = lookOfTrack(track);
      for (let towards = 0; towards < Math.PI * 2; towards += 0.05) {
        const covered = far.some((band) => {
          const length = (((band.to - band.from) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) || Math.PI * 2;
          const along = (((towards - band.from) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          return along <= length;
        });
        expect(covered, `${name}, direction ${towards.toFixed(2)}`).toBe(true);
      }
    }
  });
});

describe("the route painted on each track", () => {
  it("runs over road at every point, so the arrows are where a kart drives", () => {
    for (const [name, track] of everyTrack) {
      const points = routePoints(track, lookOfTrack(track).route);
      expect(points, name).not.toBe(null);
      for (const { x, y } of points) {
        expect(tileKindAt(track, x, y), `${name}: ${x},${y}`).toBe("road");
      }
    }
  });

  it("leaves the start line the way the karts on the grid point", () => {
    for (const [name, track] of everyTrack) {
      const points = routePoints(track, lookOfTrack(track).route);
      const road = routeDirection(points, track.start.x, track.start.y);
      const off = Math.abs(Math.atan2(Math.sin(road - track.start.angle), Math.cos(road - track.start.angle)));
      expect(off, name).toBeLessThan(0.3);
    }
  });

  it("goes through every checkpoint in order, so following the arrows completes a lap", () => {
    for (const [name, track] of everyTrack) {
      const points = routePoints(track, lookOfTrack(track).route);
      // Walk along the route in small steps and write down the checkpoints entered, in order.
      const entered = [];
      for (let i = 0; i < points.length; i++) {
        const from = points[i];
        const to = points[(i + 1) % points.length];
        const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 4);
        for (let step = 0; step <= steps; step++) {
          const x = from.x + ((to.x - from.x) * step) / steps;
          const y = from.y + ((to.y - from.y) * step) / steps;
          const hit = track.checkpoints.findIndex((box) => x >= box.left && x < box.right && y >= box.top && y < box.bottom);
          if (hit !== -1 && entered[entered.length - 1] !== hit) {
            entered.push(hit);
          }
        }
      }
      // Every checkpoint once, each followed by the next one (the loop may begin at any of them).
      expect(entered.length, `${name}: ${entered}`).toBeGreaterThanOrEqual(track.checkpoints.length);
      const once = entered.slice(0, track.checkpoints.length);
      expect([...once].sort((a, b) => a - b)).toEqual(track.checkpoints.map((box, number) => number));
      for (let i = 1; i < once.length; i++) {
        expect(once[i], `${name}: ${entered}`).toBe((once[i - 1] + 1) % track.checkpoints.length);
      }
    }
  });
});

describe("what stands beside the road", () => {
  it("is the same every time, so the trees do not move between visits", () => {
    for (const [, track] of everyTrack) {
      const look = lookOfTrack(track);
      expect(propsOfTrack(track, look, storeysOf(track))).toEqual(propsOfTrack(track, look, storeysOf(track)));
    }
  });

  it("puts trees on both tracks", () => {
    for (const [name, track] of everyTrack) {
      const kinds = propsOfTrack(track, lookOfTrack(track), storeysOf(track)).map((prop) => prop.kind);
      expect(kinds.filter((kind) => ["tree", "pine", "palm"].includes(kind)).length, name).toBeGreaterThan(10);
    }
  });

  it("never stands a tree on the road, or right beside it where a kart would seem to drive through it", () => {
    for (const [name, track] of everyTrack) {
      const trees = propsOfTrack(track, lookOfTrack(track), storeysOf(track)).filter((prop) =>
        ["tree", "pine", "palm"].includes(prop.kind),
      );
      for (const tree of trees) {
        expect(tileKindAt(track, tree.x, tree.y), `${name}: ${tree.kind} at ${tree.x},${tree.y}`).not.toBe("road");
        for (const [dx, dy] of [[-track.tileSize, 0], [track.tileSize, 0], [0, -track.tileSize], [0, track.tileSize]]) {
          expect(tileKindAt(track, tree.x + dx, tree.y + dy), `${name}: next to a ${tree.kind}`).not.toBe("road");
        }
      }
    }
  });

  it("never stands a tree on a square that has a building on it", () => {
    const storeys = storeysOf(CAMPUS_LOOP);
    const size = CAMPUS_LOOP.tileSize;
    const trees = propsOfTrack(CAMPUS_LOOP, lookOfTrack(CAMPUS_LOOP), storeys).filter((prop) =>
      ["tree", "pine", "palm"].includes(prop.kind),
    );
    for (const tree of trees) {
      expect(storeys.rows[Math.floor(tree.y / size)][Math.floor(tree.x / size)]).toBe("0");
    }
  });

  it("stands an arrow board at each bend of the oval, off the road, pointing right", () => {
    const boards = propsOfTrack(TEST_OVAL, lookOfTrack(TEST_OVAL)).filter((prop) => prop.kind.startsWith("turn-"));
    expect(boards).toHaveLength(4);
    for (const board of boards) {
      expect(board.kind).toBe("turn-right"); // the oval is driven clockwise
    }
  });

  it("stands arrow boards on the campus loop that point both ways, as its bends do", () => {
    const kinds = propsOfTrack(CAMPUS_LOOP, lookOfTrack(CAMPUS_LOOP), storeysOf(CAMPUS_LOOP)).map((prop) => prop.kind);
    expect(kinds).toContain("turn-right");
    expect(kinds).toContain("turn-left");
  });

  it("names the places of the campus on signs, as plain text", () => {
    const signs = propsOfTrack(CAMPUS_LOOP, lookOfTrack(CAMPUS_LOOP), storeysOf(CAMPUS_LOOP)).filter(
      (prop) => prop.kind === "totem",
    );
    expect(signs.length).toBeGreaterThanOrEqual(4);
    for (const sign of signs) {
      expect(sign.label).toMatch(/^[A-Za-z ]{3,24}$/);
      expect(tileKindAt(CAMPUS_LOOP, sign.x, sign.y), sign.label).not.toBe("road");
    }
  });
});

describe("low banks along the edge of the road", () => {
  // A ring of road round one block of wall, inside a thick border of wall.
  const track = createTrack({
    name: "Bank test track",
    tileSize: 10,
    laps: 1,
    map: ["#######", "#######", "##...##", "##.#.##", "##...##", "#######", "#######"],
    start: { column: 2, row: 2, angle: 0 },
    checkpoints: [
      { name: "a", column: 2, row: 3, columns: 1, rows: 1 },
      { name: "b", column: 3, row: 2, columns: 1, rows: 1 },
      { name: "c", column: 4, row: 3, columns: 1, rows: 1 },
    ],
  });

  it("makes no banks unless asked, as before", () => {
    expect(createBuildings(track, null)).toBe(null);
    expect(createBuildings(track, null, { barrierHeight: 0 })).toBe(null);
  });

  it("raises the walls that touch open ground, also corner to corner, and leaves the ones further in flat", () => {
    const { roofs } = createBuildings(track, null, { barrierHeight: 4 });
    const raised = roofs.map((roof) => `${roof.column},${roof.row}`).sort();
    // The ring of wall round the road (16 squares) and the block in the middle.
    expect(raised).toHaveLength(17);
    expect(raised).toContain("3,3"); // the middle block
    expect(raised).toContain("1,1"); // touches the road only at its corner
    expect(raised).not.toContain("0,0"); // two squares from any road
    expect(raised).not.toContain("0,3");
    for (const roof of roofs) {
      expect(roof.height).toBe(4);
      expect(roof.style).toBe("barrier");
    }
  });

  it("stands a side only where the bank ends, never between two squares of the same bank", () => {
    const { sides } = createBuildings(track, null, { barrierHeight: 4 });
    for (const side of sides) {
      expect(side.bottom).toBe(0);
      expect(side.top).toBe(4);
    }
    // The middle block is alone: four sides. No side stands between (1,1) and (2,1), both bank.
    expect(sides.filter((side) => side.column === 3 && side.row === 3)).toHaveLength(4);
    expect(sides.some((side) => side.column === 1 && side.row === 1 && side.facing === "east")).toBe(false);
  });

  it("keeps a building a building: storeys win over the bank", () => {
    const storeys = { storeyMetres: 3, squareMetres: 10, rows: ["0000000", "0000000", "0000000", "0002000", "0000000", "0000000", "0000000"] };
    const { roofs } = createBuildings(track, storeys, { barrierHeight: 4 });
    const middle = roofs.find((roof) => roof.column === 3 && roof.row === 3);
    expect(middle.style).toBe("building");
    expect(middle.height).toBe(6); // 2 storeys of 3 units, not the 4 of a bank
    expect(roofs.find((roof) => roof.column === 1 && roof.row === 1).style).toBe("barrier");
  });

  it("gives both tracks banks or buildings wherever a wall touches the road", () => {
    for (const [name, each] of everyTrack) {
      const buildings = createBuildings(each, storeysOf(each), { barrierHeight: lookOfTrack(each).barrierHeight });
      const raised = new Set(buildings.roofs.map((roof) => `${roof.column},${roof.row}`));
      for (let row = 0; row < each.rows; row++) {
        for (let column = 0; column < each.columns; column++) {
          if (each.map[row][column] !== ".") {
            continue;
          }
          for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const c = column + dc;
            const r = row + dr;
            const isWall = r >= 0 && c >= 0 && r < each.rows && c < each.columns && each.map[r][c] === "#";
            if (isWall) {
              expect(raised.has(`${c},${r}`), `${name}: the wall at ${c},${r}`).toBe(true);
            }
          }
        }
      }
    }
  });
});

describe("buildings seen from the low race camera", () => {
  // A long road with one tall block beside it, as in buildings.test.js.
  const wallRow = "#".repeat(40);
  const blockRow = [...".".repeat(40)].map((letter, column) => (column === 12 ? "#" : letter)).join("");
  const track = createTrack({
    name: "Long test track",
    tileSize: 10,
    laps: 1,
    map: [wallRow, blockRow, ".".repeat(40), ".".repeat(40), wallRow],
    start: { column: 0, row: 2, angle: 0 },
    checkpoints: [
      { name: "a", column: 5, row: 2, columns: 1, rows: 2 },
      { name: "b", column: 20, row: 2, columns: 1, rows: 2 },
      { name: "c", column: 35, row: 2, columns: 1, rows: 2 },
    ],
  });
  const storeyRow = [..."0".repeat(40)].map((digit, column) => (column === 12 ? "9" : digit)).join("");
  const storeys = { storeyMetres: 10, squareMetres: 10, rows: ["0".repeat(40), storeyRow, "0".repeat(40), "0".repeat(40), "0".repeat(40)] };
  const buildings = createBuildings(track, storeys); // one block, 90 units tall
  const lookingEast = { x: 5, y: 25, angle: 0 };

  it("shows the sides of a block taller than the camera, but not its roof, which is seen from below", () => {
    const seen = buildingsInView(buildings, lookingEast, RACE, SCREEN).map((shape) => `${shape.kind} ${shape.facing}`).sort();
    expect(seen).toEqual(["side south", "side west"]);
  });

  it("still shows that roof from the high view at the start of a race", () => {
    const seen = buildingsInView(buildings, lookingEast, { ...CHASE, kartScale: 2 }, SCREEN).map((shape) => shape.kind);
    expect(seen).toContain("roof"); // from high enough above (a smaller picture is a higher camera)
  });

  it("tells the painter which square each piece belongs to and how tall it is", () => {
    const [side] = buildingsInView(buildings, lookingEast, RACE, SCREEN);
    expect(side.column).toBe(12);
    expect(side.row).toBe(1);
    expect(side.style).toBe("building");
    expect(side.bottom).toBe(0);
    expect(side.top).toBe(90);
  });

  it("shows a building far beyond what the high view could see, and none beyond its own limit", () => {
    const far = { x: 5 - 900, y: 25, angle: 0 }; // 1000 units before the block
    expect(buildingsInView(buildings, far, RACE, SCREEN).length).toBeGreaterThan(0);
    const tooFar = { x: 5 - RACE.viewAhead - 200, y: 25, angle: 0 };
    expect(buildingsInView(buildings, tooFar, RACE, SCREEN)).toEqual([]);
  });
});
