// The kinds of ground a kart can drive on.
//
// "offRoad" means the ground slows karts down. How much it slows a kart
// depends on that driver's off-road score (see physics.js).
//
// Sand and sea come later, with the campus tracks.

export const ROAD = { name: "road", offRoad: false };
export const GRASS = { name: "grass", offRoad: true };
