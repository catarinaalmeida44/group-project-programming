// Not a test: a small tool for whoever changes the layout of the Nova lap.
//
// The Nova lap is described twice. The picture is drawn from shapes
// (client/nova-lap-ground.js) and boxes (client/nova-lap-buildings.js). The
// driving rules read letters (shared/tracks/nova-lap.js). nova-lap.test.js
// fails when the two do not say the same.
//
// After changing a shape or a box, run this from the project folder:
//
//     node tests/nova-lap-letters.js
//
// It works out the letters that the shapes describe and writes them into
// shared/tracks/nova-lap.js, between the two lines "// MAP-START" and
// "// MAP-END". Nothing else in that file is changed. Then look at what
// changed (GitHub Desktop shows it), check that the start and the
// checkpoints are still on the road, and run "npm test".
//
// With the word "show" after it, it changes nothing and prints the map
// instead, with blocks for walls and dots for grass, to look at:
//
//     node tests/nova-lap-letters.js show

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { NOVA_LAP_GROUND, NOVA_LAP_SIZE, lettersFromGround } from "../client/nova-lap-ground.js";
import { NOVA_LAP_SOLID } from "../client/nova-lap-buildings.js";

const rows = lettersFromGround(NOVA_LAP_GROUND, NOVA_LAP_SIZE, NOVA_LAP_SOLID);

if (process.argv[2] === "show") {
  // A ruler along the top: the tens, then the ones, of each column number.
  const columns = Array.from({ length: rows[0].length }, (unused, column) => column);
  console.log("     " + columns.map((column) => (column % 10 === 0 ? String(column / 10) : " ")).join(""));
  console.log("     " + columns.map((column) => String(column % 10)).join(""));
  rows.forEach((row, number) => {
    console.log(String(number).padStart(3) + "  " + row.replaceAll("#", "█").replaceAll(",", "░").replaceAll(".", " "));
  });
} else {
  const file = fileURLToPath(new URL("../shared/tracks/nova-lap.js", import.meta.url));
  const text = readFileSync(file, "utf8");
  const startMark = "  // MAP-START";
  const endMark = "  // MAP-END";
  const from = text.indexOf(startMark);
  const to = text.indexOf(endMark);
  if (from === -1 || to === -1 || to < from) {
    throw new Error("The lines // MAP-START and // MAP-END were not found in shared/tracks/nova-lap.js");
  }
  // Every fifth row gets its number after it, to help find a square.
  const lines = rows.map((row, number) => `    "${row}",${number % 5 === 0 ? ` // ${number}` : ""}`);
  const newText = text.slice(0, from + startMark.length) + "\n  map: [\n" + lines.join("\n") + "\n  ],\n" + text.slice(to);
  if (newText === text) {
    console.log("The letters already say what the shapes say. Nothing was changed.");
  } else {
    writeFileSync(file, newText);
    console.log(`Wrote ${rows.length} rows of ${rows[0].length} letters into shared/tracks/nova-lap.js.`);
  }
}
