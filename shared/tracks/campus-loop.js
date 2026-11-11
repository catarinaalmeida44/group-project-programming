// The campus loop: the first campus track, a loop round the outside of the
// Nova SBE Carcavelos campus.
//
//     #  wall      .  road      ,  grass
//
// How it was made (11 November 2026, by Rodrigo with his coding agent):
// - The layout comes from OpenStreetMap, a free map of the world that anyone
//   may reuse if they credit it: map data © OpenStreetMap contributors.
//   OpenStreetMap draws the campus from straight above, in metres.
// - The map is turned 21 degrees, so that the walls of the campus buildings
//   run along the squares. North is therefore not straight up: the sea is
//   towards the bottom left.
// - Each letter is a square of 6 by 6 metres. Buildings and everything outside
//   the campus became wall, gardens became grass, paths and squares became road.
// - Along the driving line the road was widened to 4 squares (24 metres), so
//   that several karts fit side by side. The real paths are narrower. Where
//   the widened road met the edge of a building or of the campus, the road won.
// - The Hovione Atrium and the KPMG Gallery are inside the main building, so
//   they are wall here. They are meant for an indoor track of their own.
// - Two detours were added on Rodrigo's request, to make a lap longer: round
//   the southern tip of the Grand Auditorium, and a hairpin through the two
//   courtyards on either side of the CTT Student Hall, round its far end.
//   For that hairpin the road cuts through the end of the CTT Student Hall,
//   which is therefore shorter here than it really is.
//
// The loop is driven clockwise, as it looks on this map: east along the Walk
// of Founders, south past the Library and Navigator Park, round the gym to
// EDP Plaza, round the tip of the Grand Auditorium, north-west along the outer
// path, up the western gardens, in and out of the courtyards round the CTT
// Student Hall, and back to the Walk of Founders. A lap along the driving
// line is about 1.1 kilometres.
//
// Away from the driving line there is open ground (gardens, squares), so a
// kart can leave the line and skip a detour. It gains nothing: a lap only
// counts if the kart went through every checkpoint, in order (laps.js), and
// there is a checkpoint in each detour.
//
// The numbers after some rows are row numbers, to help find a square.

import { createTrack } from "../track.js";

export const CAMPUS_LOOP = createTrack({
  name: "Campus loop",
  tileSize: 32, // each letter below is a square of 32 by 32 units (6 by 6 metres)
  laps: 3,
  map: [
    "################################################################", // 0
    "##########.#####################################################",
    "##########..,,##################################################",
    "##########.,,.,,################################################",
    "##########.,,,,..,,#############################################",
    "##########.###,,,,..,,##########################################", // 5
    "##########.###,#,,,,,..,########################################",
    "##########.,######,,,,,,...#####################################",
    "##########.,,,##########,,...###################################",
    "##########.,,,,,##########,##..#################################",
    "##########.,,,,,,,,#.########,,,..##############################", // 10
    "##########..,,,,,,,..,,,,####,,,,,..############################",
    "##########................................######################",
    "#########.................................######################",
    "#########...................................####################",
    "########.................,###########..........#################", // 15
    "########..................###########.....,,,,,..###############",
    "#######...................###########.....,,,,,,,,..############",
    "#######....,,,,,,,,.......############....,,,,,,,,,,..##########",
    "######.....,,,,,,,,.......#############...,,,,,,,,,,,,,.,#######",
    "#####.....,############################...,,,,,,,,,,,,,.,,,#####", // 20
    "#####....##############################...,,,,,,,,,,,,,,,,,,,,##",
    "#####....##############################...,,,,,,,,,,,,,,,,,,,,,#",
    "#####....#############################....,,,,,,,,,,,,,.,,,,,,,#",
    "#####....#############################....,,,,,,,,,,,,.,,,,,,,##",
    "######....,####################...........,,,,,,,..,..,,,,,,,###", // 25
    "######....................#####...........,,,,,,,,,,,,,,,,,,####",
    "#####,....................#####...........,,,,,,,,,,.,,,,,,,####",
    "#####,....................#####,..........,,,,,,,,,.,,,,,,,#####",
    "#####.,,,,,,,,,,,,.###....#####...........,,,,,,,,.,,,,,,,######",
    "####,.,,,,,,,,,,,,####....#####,..........,,,,,,,.,,,,,,,#######", // 30
    "####,.,...................#####,,#####....,,,,,,.,,,,,,,########",
    "####,,,...................#####,,#####....,,,,,,.,,,,,,,########",
    "###,.,....................#####,######....,,,,,,.,,,,,,#########",
    "###,.,....................#####...####....,,,,,,.,,,,,##########",
    "###,.,....#####################...####....,,,,,,.,,,,###########", // 35
    "###,,....######################...####....,,,,,,.,,,,###########",
    "##,.,....######################...####....,,,,,,.,,,############",
    "##,.,....######################...####...........,,#############",
    "##,,....,######################...###............,##############",
    "#,,.....,,,,,,,,,,,.......#####..................###############", // 40
    "#,,.....,,,,,,,,,,,.......#####.................,###############",
    "##,,....,,,,,,,,,,,.......#####...######.......,################",
    "###,.....,,,,,,,,,,.......#####.,.########....,#################",
    "###,,.....,,,,,,,,,.#.#########.,.########....##################",
    "####,,.....,,,,,,.#############.,..#######....##################", // 45
    "#####,......,,,,.##############.,..######.....##################",
    "######,.....,,,...#############.....##.......###################",
    "#######,.....,,,..#############..............###################",
    "########,......,..######,,,,......#.........####################",
    "########,,.......,,,,#,........,.##.,.....######################", // 50
    "##########,...........,,,....,,,,###.....#######################",
    "############.........,....,,,,,,#####....#######################",
    "##############.........,,,,,,,,######....#######################",
    "################.........,,,,,######.....#######################",
    "##################..........,#######....########################", // 55
    "####################..........####......########################",
    "#######################................#########################",
    "#########################.............##########################",
    "###########################..........###########################",
    "##############################.....#############################", // 60
    "################################################################",
  ],
  // The kart starts on the Walk of Founders, just after the finish line,
  // pointing right (angle 0), which is the way the loop is driven.
  start: { column: 23, row: 13, angle: 0 },
  // Each checkpoint is a line of squares across the road, long enough to reach
  // a wall at both ends, so there is no way round it. They must be reached in
  // this order.
  checkpoints: [
    { name: "finish line, Walk of Founders", column: 20, row: 10, columns: 1, rows: 10 },
    { name: "east side, past the Library", column: 31, row: 27, columns: 29, rows: 1 },
    { name: "south tip of the Grand Auditorium", column: 32, row: 57, columns: 1, rows: 4 },
    { name: "south, below the KPMG Gallery", column: 27, row: 49, columns: 1, rows: 11 },
    { name: "west side, along the gardens", column: 3, row: 33, columns: 23, rows: 1 },
    { name: "round the end of the CTT Student Hall", column: 22, row: 29, columns: 4, rows: 1 },
  ],
});
