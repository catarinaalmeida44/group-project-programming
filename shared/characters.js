// The drivers and their strengths.
//
// Each strength is a score from 1 (weakest) to 5.75 (strongest), in steps of
// 0.25. A score is not a speed or a distance. The driving rules in
// physics.js turn each score into real motion.
//
// For now there is one placeholder driver with middle scores. The real
// characters come later. Two more scores will be added with the rules that
// need them: weight (for karts bumping each other) and mini-turbo (for the
// boost after a drift).

export const STAT_LOWEST = 1;
export const STAT_HIGHEST = 5.75;

export const TEST_DRIVER = {
  id: "test-driver",
  name: "Test driver",
  speed: 3.5, //        how high the top speed is
  acceleration: 3.5, // how quickly the kart reaches its top speed
  handling: 3.5, //     how quickly the kart can turn
  grip: 3.5, //         how well the kart follows the direction it points
  offRoad: 3.5, //      how much speed the kart keeps on grass
};
