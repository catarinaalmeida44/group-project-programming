// The fronts of the buildings on the Nova lap: what is painted on each wall.
//
// A wall in the race view is a flat picture stood upright (scenery.js works
// out where, scenery-paint.js puts it there). Each picture is painted once,
// by the code in this file, when the page opens. There are no image files:
// every front is rectangles, lines and letters, drawn after the video filmed
// on campus on 17 November 2026.
//
// Every entry of WALL_ART says:
//   length   how long the picture is, in metres, for a wall that has one
//            picture from end to end (the entrance front, a hall's name)
//   period   or: after how many metres the picture repeats, for a wall that
//            is the same all the way along (bands of windows, a hedge)
//   height   how tall the picture is, in metres, from the ground up
//   fits     true for a picture that is stretched to whatever is there
//            (a white wall, a railing), instead of keeping its own height
//   holes    true when parts of the picture are see-through (a railing)
//   paint    paint(c, length, height): draws it. Inside, 1 is one metre, x
//            runs along the wall from its left end, y runs DOWN from the top.
//            "up(m)" below turns "m metres above the ground" into a y.
//
// The names on the walls are the names on the real walls. The banner on the
// entrance is our own: the real one is an advertisement.

const WHITE = "#f3f2ed";
const WHITE_SHADE = "#e3e4e1";
const GLASS = "#2b3d4d";
const GLASS_LIGHT = "#5b7385";
const FRAME = "#e9eaea";
const LETTER_GREY = "#8c9096";
const CREAM = "#dcd2bd";
const LIMESTONE = "#e6dcc4";
const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';

/** A plain white wall with faint joints, the way the rendered concrete of the campus looks. */
function whiteWall(c, x, y, width, height, colour = WHITE) {
  c.fillStyle = colour;
  c.fillRect(x, y, width, height);
  // A little darker towards the foot, where rain leaves its marks.
  const dirt = c.createLinearGradient(0, y, 0, y + height);
  dirt.addColorStop(0, "rgba(120, 125, 130, 0)");
  dirt.addColorStop(0.85, "rgba(120, 125, 130, 0.03)");
  dirt.addColorStop(1, "rgba(120, 125, 130, 0.13)");
  c.fillStyle = dirt;
  c.fillRect(x, y, width, height);
}

/**
 * A pane of dark glass with the sky reflected in it, and thin frames.
 *   across, down   how many panes it is divided into
 */
function glass(c, x, y, width, height, across = 1, down = 1, { dark = GLASS, light = GLASS_LIGHT, frame = FRAME, thick = 0.07 } = {}) {
  const shine = c.createLinearGradient(0, y, 0, y + height);
  shine.addColorStop(0, light);
  shine.addColorStop(0.45, dark);
  shine.addColorStop(1, dark);
  c.fillStyle = shine;
  c.fillRect(x, y, width, height);
  // A pale slanting streak: the reflection of a bright sky.
  c.save();
  c.beginPath();
  c.rect(x, y, width, height);
  c.clip();
  c.fillStyle = "rgba(255, 255, 255, 0.07)";
  for (let streak = x - height; streak < x + width; streak += 2.6) {
    c.beginPath();
    c.moveTo(streak, y + height);
    c.lineTo(streak + height * 0.55, y);
    c.lineTo(streak + height * 0.55 + 0.7, y);
    c.lineTo(streak + 0.7, y + height);
    c.closePath();
    c.fill();
  }
  c.restore();
  c.fillStyle = frame;
  for (let i = 0; i <= across; i++) {
    c.fillRect(x + (width * i) / across - thick / 2, y, thick, height);
  }
  for (let i = 0; i <= down; i++) {
    c.fillRect(x, y + (height * i) / down - thick / 2, width, thick);
  }
}

/** Letters on a wall. "size" is the height of a capital letter, in metres. */
function lettering(c, text, x, y, size, colour = LETTER_GREY, { align = "left", weight = 600, family = SANS, style = "" } = {}) {
  c.fillStyle = colour;
  c.font = `${style} ${weight} ${size * 1.38}px ${family}`;
  c.textAlign = align;
  c.textBaseline = "alphabetic";
  c.fillText(text, x, y);
}

/**
 * The school's name as it stands on its walls and doors: N, a ring with a
 * short bar under it, V, and an A without its crossbar. Drawn with lines,
 * so it needs no font. "size" is the height of the letters, x the left edge,
 * y the foot of the letters.
 */
function novaName(c, x, y, size, colour) {
  const thick = size * 0.2;
  const wide = size * 0.78;
  const gap = size * 0.34;
  c.strokeStyle = colour;
  c.fillStyle = colour;
  c.lineWidth = thick;
  c.lineJoin = "miter";
  c.lineCap = "butt";
  // N
  c.beginPath();
  c.moveTo(x + thick / 2, y);
  c.lineTo(x + thick / 2, y - size);
  c.lineTo(x + wide - thick / 2, y);
  c.lineTo(x + wide - thick / 2, y - size);
  c.stroke();
  // The ring, raised a little, with its bar underneath.
  const ringX = x + wide + gap + wide / 2;
  c.beginPath();
  c.arc(ringX, y - size * 0.62, size * 0.36, 0, Math.PI * 2);
  c.stroke();
  c.fillRect(ringX - wide * 0.42, y - thick * 0.75, wide * 0.84, thick * 0.75);
  // V
  const vX = x + (wide + gap) * 2;
  c.beginPath();
  c.moveTo(vX + thick * 0.35, y - size);
  c.lineTo(vX + wide / 2, y - thick * 0.2);
  c.lineTo(vX + wide - thick * 0.35, y - size);
  c.stroke();
  // A without a crossbar: a V upside down.
  const aX = x + (wide + gap) * 3;
  c.beginPath();
  c.moveTo(aX + thick * 0.35, y);
  c.lineTo(aX + wide / 2, y - size + thick * 0.2);
  c.lineTo(aX + wide - thick * 0.35, y);
  c.stroke();
  return (wide + gap) * 4 - gap; // how wide the whole name is
}

/** Colours that look random but are the same every time. */
function chooser(seed) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

export const WALL_ART = {
  // ---- Plain things that fit whatever they are put on ----

  white: {
    period: 3,
    height: 4,
    fits: true,
    paint(c, length, height) {
      whiteWall(c, 0, 0, length, height);
    },
  },

  cream: {
    period: 3,
    height: 4,
    fits: true,
    paint(c, length, height) {
      whiteWall(c, 0, 0, length, height, CREAM);
    },
  },

  // The deep white edge of the long roof over the promenade.
  fascia: {
    period: 3,
    height: 3,
    fits: true,
    paint(c, length, height) {
      const shade = c.createLinearGradient(0, 0, 0, height);
      shade.addColorStop(0, "#fbfbf8");
      shade.addColorStop(0.8, "#eeeeea");
      shade.addColorStop(1, "#cfd2d0");
      c.fillStyle = shade;
      c.fillRect(0, 0, length, height);
    },
  },

  // The white steel lattice along the edge of the entrance roof.
  truss: {
    period: 3,
    height: 1.3,
    fits: true,
    paint(c, length, height) {
      c.fillStyle = "#59636c";
      c.fillRect(0, 0, length, height);
      c.strokeStyle = "#f4f5f3";
      c.lineWidth = 0.13;
      c.beginPath();
      c.moveTo(0, 0.1);
      c.lineTo(length, 0.1);
      c.moveTo(0, height - 0.1);
      c.lineTo(length, height - 0.1);
      for (let x = 0; x < length; x += 1.5) {
        c.moveTo(x, height - 0.1);
        c.lineTo(x + 0.75, 0.1);
        c.lineTo(x + 1.5, height - 0.1);
      }
      c.stroke();
    },
  },

  // A low wall of pale limestone blocks, as along the coast road.
  "low-wall": {
    period: 6,
    height: 0.6,
    fits: true,
    paint(c, length, height) {
      c.fillStyle = LIMESTONE;
      c.fillRect(0, 0, length, height);
      c.fillStyle = "rgba(255, 255, 255, 0.35)";
      c.fillRect(0, 0, length, height * 0.16);
      c.fillStyle = "rgba(90, 80, 60, 0.28)";
      for (let x = 0; x < length; x += 2) {
        c.fillRect(x, 0, 0.05, height);
      }
      c.fillRect(0, height * 0.9, length, height * 0.1);
    },
  },

  concrete: {
    period: 6,
    height: 1,
    fits: true,
    paint(c, length, height) {
      c.fillStyle = "#b9b7b0";
      c.fillRect(0, 0, length, height);
      c.fillStyle = "rgba(255, 255, 255, 0.25)";
      c.fillRect(0, 0, length, height * 0.1);
      c.fillStyle = "rgba(60, 60, 55, 0.2)";
      for (let x = 0; x < length; x += 3) {
        c.fillRect(x, 0, 0.04, height);
      }
    },
  },

  "sand-wall": {
    period: 3,
    height: 3,
    fits: true,
    paint(c, length, height) {
      c.fillStyle = "#dfc072";
      c.fillRect(0, 0, length, height);
      c.fillStyle = "rgba(140, 100, 30, 0.15)";
      c.fillRect(0, height * 0.82, length, height * 0.18);
    },
  },

  // Clipped shrubs.
  hedge: {
    period: 6,
    height: 1.4,
    fits: true,
    paint(c, length, height) {
      c.fillStyle = "#3c6a35";
      c.fillRect(0, 0, length, height);
      const random = chooser(41);
      for (let i = 0; i < 260; i++) {
        c.fillStyle = random() < 0.5 ? "rgba(120, 170, 90, 0.5)" : "rgba(20, 50, 25, 0.45)";
        const size = 0.06 + random() * 0.12;
        c.fillRect(random() * length, random() * height, size, size);
      }
      c.fillStyle = "rgba(15, 35, 18, 0.35)";
      c.fillRect(0, height * 0.86, length, height * 0.14);
    },
  },

  // A railing of thin bronze bars with a rail on top. You can see through it.
  railing: {
    period: 3,
    height: 1.1,
    fits: true,
    holes: true,
    paint(c, length, height) {
      c.fillStyle = "#8b7a5f";
      c.fillRect(0, 0, length, 0.07);
      c.fillRect(0, height - 0.06, length, 0.06);
      for (let x = 0; x < length; x += 0.14) {
        c.fillRect(x, 0, 0.035, height);
      }
      c.fillStyle = "#6f6049";
      for (let x = 0; x < length; x += 1.5) {
        c.fillRect(x, 0, 0.09, height);
      }
    },
  },

  // The glass rail of the gallery inside the atrium.
  "glass-rail": {
    period: 3,
    height: 1.1,
    fits: true,
    holes: true,
    paint(c, length, height) {
      c.fillStyle = "rgba(190, 215, 225, 0.28)";
      c.fillRect(0, 0, length, height);
      c.fillStyle = "#d9dcdc";
      c.fillRect(0, 0, length, 0.06);
      for (let x = 0; x < length; x += 1.5) {
        c.fillRect(x, 0, 0.05, height);
      }
    },
  },

  // ---- The entrance front, 48 metres from its north end to its south end ----
  //
  // 0 to 15 m:  the white wall with the school's name
  // 15 to 48 m: glass, with the banner across its upper half. The doors
  //             are from 18 to 30 m: the map has an opening there.
  front: {
    length: 48,
    height: 12.5,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      // The white wall.
      whiteWall(c, 0, 0, 15, height);
      c.fillStyle = LIMESTONE; // a stone bench along its foot
      c.fillRect(0, up(0.7), 15, 0.7);
      c.fillStyle = "rgba(90, 80, 60, 0.25)";
      c.fillRect(0, up(0.7), 15, 0.05);
      const nameWide = novaName(c, 0, 0, 1.25, "rgba(0, 0, 0, 0)"); // measured first
      novaName(c, 7.5 - nameWide / 2, up(6.9), 1.25, LETTER_GREY);
      lettering(c, "NOVA SCHOOL OF", 7.5 - nameWide / 2 + 1.7, up(6.2), 0.2, LETTER_GREY);
      lettering(c, "BUSINESS & ECONOMICS", 7.5 - nameWide / 2 + 1.7, up(5.85), 0.2, LETTER_GREY);

      // Behind the glass part: steel and shadow up under the roof.
      c.fillStyle = "#48525b";
      c.fillRect(15, 0, 33, height);
      // The ground floor: tall panes of dark glass.
      glass(c, 15.3, up(4.4), 32.7, 4.3, 22, 1);
      c.fillStyle = "#d5d8d8"; // the thin canopy over the doors
      c.fillRect(15, up(4.75), 33, 0.3);
      c.fillStyle = "rgba(0, 0, 0, 0.25)";
      c.fillRect(15, up(4.45), 33, 0.12);
      // White steel posts.
      c.fillStyle = "#eef0ef";
      for (const post of [15, 21.6, 28.2, 34.8, 41.4, 47.7]) {
        c.fillRect(post, 0, 0.3, height);
      }

      // The banner: sky blue, a white building in its corner, white writing.
      const left = 16.4;
      const wide = 30.4;
      const top = up(11.2);
      const tall = 6.1;
      const sky = c.createLinearGradient(0, top, 0, top + tall);
      sky.addColorStop(0, "#5f95d6");
      sky.addColorStop(1, "#a5c6ea");
      c.fillStyle = sky;
      c.fillRect(left, top, wide, tall);
      // A drawing of the campus in the lower left corner of the banner.
      c.fillStyle = "#e9edf1";
      c.beginPath();
      c.moveTo(left, top + tall);
      c.lineTo(left, top + 3.4);
      c.lineTo(left + 4.6, top + 3.1);
      c.lineTo(left + 7.6, top + 4.3);
      c.lineTo(left + 13, top + 4.9);
      c.lineTo(left + 13, top + tall);
      c.closePath();
      c.fill();
      c.fillStyle = "#c9d2da";
      c.fillRect(left + 4.9, top + 3.6, 1.3, 2.5);
      c.fillStyle = "#5d7890";
      c.fillRect(left + 7.8, top + 4.8, 5, 0.55);
      c.fillRect(left + 0.4, top + 5.3, 4, 0.4);
      // The writing.
      lettering(c, "We race the times", left + 16.6, top + 1.95, 1.0, "#ffffff", {
        align: "center",
        weight: 400,
        style: "italic",
        family: '"Segoe Script", "Brush Script MT", "Lucida Handwriting", cursive',
      });
      lettering(c, "one lap round Nova SBE", left + 16.6, top + 3.0, 0.52, "#ffffff", {
        align: "center",
        weight: 700,
        family: 'Georgia, "Times New Roman", serif',
      });
      const facts = [
        ["#3", "laps to win"],
        ["#8", "corners a lap"],
        ["#1", "kart race on campus"],
      ];
      facts.forEach(([number, words], i) => {
        const x = left + 13.6 + i * 5.4;
        lettering(c, number, x, top + 4.75, 0.62, "#ffffff", { weight: 700, family: 'Georgia, "Times New Roman", serif' });
        lettering(c, words, x + 1.45, top + 4.6, 0.2, "#ffffff", { weight: 500 });
      });
      c.fillStyle = "#ffffff";
      c.fillRect(left + 0.7, top + 0.6, 0.75, 0.75);
      lettering(c, "NOVA KART", left + 1.7, top + 1.05, 0.26, "#ffffff", { weight: 600, family: 'Georgia, "Times New Roman", serif' });
      lettering(c, "GRAND PRIX", left + 1.7, top + 1.42, 0.2, "#ffffff", { weight: 500, family: 'Georgia, "Times New Roman", serif' });
      novaName(c, left + wide - 5.2, top + 2.5, 0.42, "#ffffff");
      novaName(c, left + wide - 2.6, top + 2.5, 0.42, "#ffffff");
      // The school's name on the glass beside the doors.
      novaName(c, 31.3, up(1.9), 0.42, "#ffffff");
      novaName(c, 16.3, up(1.9), 0.42, "#ffffff");
    },
  },

  // ---- The residence across the avenue: three floors of deep, dark balconies ----
  residence: {
    period: 6,
    height: 10,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      c.fillStyle = "#e7e6e0";
      c.fillRect(0, 0, length, height);
      c.fillStyle = "#3b4249"; // a dark ground floor
      c.fillRect(0, up(1.4), length, 1.4);
      for (let floor = 0; floor < 3; floor++) {
        const foot = 1.75 + floor * 2.75;
        for (const [x, wide] of [[0.25, 2.55], [3.1, 2.65]]) {
          c.fillStyle = "#454d55";
          c.fillRect(x, up(foot + 2.35), wide, 2.35);
          c.fillStyle = "#2c3238";
          c.fillRect(x + 0.2, up(foot + 2.2), wide * 0.45, 2.0); // the window at the back of the balcony
          c.fillStyle = "rgba(235, 235, 228, 0.9)";
          c.fillRect(x, up(foot + 0.95), wide, 0.07); // the rail
        }
      }
    },
  },

  // ---- The academic halls: two long bands of glass between white slabs ----
  "hall-bands": {
    period: 3,
    height: 8,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      whiteWall(c, 0, 0, length, height);
      glass(c, 0, up(3.5), length, 2.7, 2, 2, { thick: 0.06 });
      glass(c, 0, up(7.2), length, 2.6, 2, 2, { thick: 0.06 });
      c.fillStyle = "rgba(0, 0, 0, 0.16)"; // the shadow under each slab
      c.fillRect(0, up(7.2), length, 0.14);
      c.fillRect(0, up(3.5), length, 0.14);
    },
  },

  // The west end of the Cascais Academic Hall: a white box with one great window.
  "cascais-head": {
    length: 21,
    height: 9.5,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      whiteWall(c, 0, 0, length, height);
      c.fillStyle = "rgba(0, 0, 0, 0.5)"; // it hangs out over the grass: a dark gap under it
      c.fillRect(0, up(1.1), length, 1.1);
      c.fillStyle = "#cfd2d0"; // the deep white frame, seen at an angle
      c.fillRect(1.1, up(8.7), length - 2.2, 7.2);
      glass(c, 1.6, up(8.3), length - 3.2, 6.4, 6, 2, { dark: "#31485c", light: "#7d98ab" });
    },
  },

  "cascais-name": {
    length: 18,
    height: 9.5,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      whiteWall(c, 0, 0, length, height);
      lettering(c, "Cascais", 1.6, up(6.2), 0.5);
      lettering(c, "Academic Hall", 1.6, up(5.3), 0.5);
    },
  },

  // The Santander Academic Hall ends in a tall white fin that slopes down
  // into a long blank wall with the name on it.
  "santander-name": {
    length: 21,
    height: 13,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      whiteWall(c, 0, 0, length, height);
      c.fillStyle = "rgba(0, 0, 0, 0.07)"; // the fold where the fin meets the wall
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(5.4, 0);
      c.lineTo(3.2, height);
      c.lineTo(0, height);
      c.closePath();
      c.fill();
      lettering(c, "Santander", 12.6, up(5.1), 0.5);
      lettering(c, "Academic Hall", 12.6, up(4.2), 0.5);
    },
  },

  // The open end of that fin: a tall frame with shadow inside.
  "portal-open": {
    length: 21,
    height: 13,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      whiteWall(c, 0, 0, length, height);
      c.fillStyle = "#c9cdcc";
      c.fillRect(1.2, up(12.1), length - 2.4, 12.1);
      c.fillStyle = "#39444d";
      c.fillRect(2, up(11.4), length - 4, 11.4);
      glass(c, 3, up(7.4), length - 6, 6.6, 5, 2, { dark: "#22303c", light: "#3f5566" });
    },
  },

  // The head of the hall nearest the coast road: a white box with a dark window.
  "hall-head-glass": {
    length: 21,
    height: 9,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      whiteWall(c, 0, 0, length, height);
      c.fillStyle = "rgba(0, 0, 0, 0.45)";
      c.fillRect(0, up(1.4), length, 1.4);
      c.fillStyle = "#cfd2d0";
      c.fillRect(3, up(8.2), 15, 5.8);
      glass(c, 3.5, up(7.8), 14, 5, 4, 1, { dark: "#27353f", light: "#4c6475" });
    },
  },

  // ---- The long main building beside the promenade (its east side) ----

  // By the terrace: glass with the white steel of the roof showing through,
  // and a block of pale stone at its south end.
  "galleria-plaza": {
    length: 36,
    height: 9,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      glass(c, 0, 0, length, height, 12, 2, { dark: "#3b4f5e", light: "#8fa6b5", thick: 0.1 });
      c.strokeStyle = "rgba(240, 243, 244, 0.55)"; // steel braces inside
      c.lineWidth = 0.09;
      c.beginPath();
      for (let x = 9; x < length; x += 6) {
        c.moveTo(x, up(4.5));
        c.lineTo(x + 3, up(8.6));
        c.lineTo(x + 6, up(4.5));
      }
      c.stroke();
      whiteWall(c, 0, up(5.6), 9, 5.6, CREAM);
      lettering(c, "Fidelidade Seguros", 0.8, up(4.2), 0.3, "#f6f4ee");
      lettering(c, "Plaza", 0.8, up(3.6), 0.3, "#f6f4ee");
    },
  },

  // Along the promenade: study rooms behind the glass, each with a coloured wall.
  "galleria-colour": {
    length: 51,
    height: 9,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      c.fillStyle = "#33434f";
      c.fillRect(0, 0, length, height);
      const colours = ["#8d5aa8", "#e6c84a", "#4a86c8", "#59a868", "#d86a9a", "#7c4f9c", "#e0b83e", "#3f9cb5"];
      const random = chooser(77);
      for (let x = 0; x < length; x += 3) {
        for (const foot of [0.3, 4.7]) {
          if (random() < 0.82) {
            c.fillStyle = colours[Math.floor(random() * colours.length)];
            c.globalAlpha = 0.78;
            c.fillRect(x + 0.25, up(foot + 3.6), 2.5, 3.4);
            c.globalAlpha = 1;
          }
        }
      }
      // The glass in front of the rooms, with its white frame.
      c.fillStyle = "rgba(160, 190, 205, 0.2)";
      c.fillRect(0, 0, length, height);
      c.fillStyle = "#edf0ef";
      for (let x = 0; x <= length; x += 3) {
        c.fillRect(x - 0.07, 0, 0.14, height);
      }
      c.fillRect(0, up(4.5), length, 0.22);
      c.fillRect(0, 0, length, 0.2);
    },
  },

  // Further south: clear glass, with the steel that braces it.
  "galleria-clear": {
    length: 36,
    height: 9,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      glass(c, 0, 0, length, height, 12, 3, { dark: "#33444f", light: "#8fa7b6", thick: 0.1 });
      c.strokeStyle = "rgba(240, 243, 244, 0.75)";
      c.lineWidth = 0.08;
      c.beginPath();
      for (let x = 0; x < length; x += 6) {
        c.moveTo(x, up(0.2));
        c.lineTo(x + 6, up(8.8));
        c.moveTo(x + 6, up(0.2));
        c.lineTo(x, up(8.8));
      }
      c.stroke();
    },
  },

  // Its other side, seen across the lawns: grey glass behind a steel lattice.
  "galleria-west": {
    period: 6,
    height: 9,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      c.fillStyle = "#77848d";
      c.fillRect(0, 0, length, height);
      glass(c, 0, up(8.4), length, 7.8, 4, 4, { dark: "#56656f", light: "#9aa9b2", frame: "#c9d0d3", thick: 0.06 });
      c.fillStyle = WHITE_SHADE;
      c.fillRect(0, 0, length, 0.5);
    },
  },

  // ---- The cafe on the terrace: warm light behind glass, under a flat white roof ----
  "cafe-glass": {
    period: 6,
    height: 4.2,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      const warm = c.createLinearGradient(0, 0, 0, height);
      warm.addColorStop(0, "#f0c684");
      warm.addColorStop(0.6, "#d8a35c");
      warm.addColorStop(1, "#9a7a55");
      c.fillStyle = warm;
      c.fillRect(0, 0, length, height);
      // Round lamps hanging inside, and the dark shapes of tables and chairs.
      c.fillStyle = "#ffe9b8";
      for (const x of [0.9, 2.4, 3.9, 5.3]) {
        c.beginPath();
        c.arc(x, up(2.9), 0.2, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = "rgba(60, 50, 45, 0.55)";
      for (const x of [0.5, 2.1, 3.6, 5]) {
        c.fillRect(x, up(1.05), 0.9, 0.08);
        c.fillRect(x + 0.4, up(1.0), 0.08, 1.0);
      }
      c.fillStyle = "rgba(200, 225, 235, 0.16)"; // the glass itself
      c.fillRect(0, 0, length, height);
      c.fillStyle = "#e8eae9";
      for (let x = 0; x <= length; x += 1.5) {
        c.fillRect(x - 0.035, 0, 0.07, height);
      }
      c.fillStyle = WHITE;
      c.fillRect(0, 0, length, 0.35);
    },
  },

  // ---- The library: a white box, glass below and dark glass above ----
  "library-north": {
    length: 33,
    height: 10,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      whiteWall(c, 0, 0, length, height);
      glass(c, 0.8, up(9.2), length - 1.6, 4.0, 14, 1, { dark: "#232f3a", light: "#44596a" });
      glass(c, 0.8, up(4.5), length - 1.6, 4.3, 14, 2, { dark: "#33444f", light: "#6f8797", thick: 0.06 });
      c.fillStyle = "rgba(255, 220, 160, 0.16)"; // lamps on inside
      c.fillRect(0.8, up(4.5), length - 1.6, 2);
    },
  },

  // The part of the library that bridges the way through.
  "library-bridge": {
    length: 18,
    height: 10,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      whiteWall(c, 0, 0, length, height);
      glass(c, 1.2, up(9.2), length - 2.4, 3.9, 6, 1, { dark: "#232f3a", light: "#44596a" });
      c.fillStyle = "rgba(0, 0, 0, 0.1)";
      c.fillRect(0, up(4.9), length, 0.3);
    },
  },

  // Its west side: glass doors under the bridge, then windows between white piers.
  "library-west": {
    length: 54,
    height: 10,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      whiteWall(c, 0, 0, length, height);
      for (let x = 1.5; x < 24; x += 7.5) {
        glass(c, x, up(4.0), 6, 3.8, 4, 1, { dark: "#1f2a33", light: "#3d5060" });
        c.fillStyle = "#d8382f";
        c.beginPath();
        c.arc(x + 2.25, up(2.2), 0.22, 0, Math.PI * 2);
        c.fill();
      }
      for (let x = 25.5; x < length - 4; x += 6) {
        glass(c, x, up(3.9), 4.5, 3.6, 3, 1, { dark: "#31424e", light: "#7890a0" });
      }
    },
  },

  // The pier beside the way through, with the library's name in small letters.
  "pier-name": {
    length: 3,
    height: 10,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      whiteWall(c, 0, 0, length, height);
      lettering(c, "Teresa e Alexandre", 0.25, up(6.0), 0.16);
      lettering(c, "Soares dos Santos", 0.25, up(5.7), 0.16);
      lettering(c, "Library", 0.25, up(5.4), 0.16);
    },
  },

  // A glass entrance in a frame of pale stone.
  "cream-entrance": {
    length: 9,
    height: 9,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      whiteWall(c, 0, 0, length, height, CREAM);
      glass(c, 0.9, up(8.2), length - 1.8, 8.0, 4, 3, { dark: "#1f2a33", light: "#4a6072", frame: "#2a2f33", thick: 0.08 });
    },
  },

  // ---- The Westmont Hospitality Hall: a box of pale stone on a base of dark glass ----
  westmont: {
    length: 27,
    height: 10,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      whiteWall(c, 0, 0, length, height, CREAM);
      glass(c, 0, up(3.5), length, 3.4, 18, 1, { dark: "#22303b", light: "#4f7186", frame: "#39444c", thick: 0.06 });
      c.fillStyle = "rgba(0, 0, 0, 0.22)";
      c.fillRect(0, up(3.6), length, 0.2);
      lettering(c, "Westmont", 19.2, up(8.2), 0.5, "#f8f6f0");
      lettering(c, "Hospitality", 19.2, up(7.3), 0.5, "#f8f6f0");
      lettering(c, "Hall", 19.2, up(6.4), 0.5, "#f8f6f0");
    },
  },

  // ---- The south end of the main building, round the lower plaza ----

  // Facing the stairs: terraces one above the other, with rails and glass.
  "balcony-east": {
    length: 24,
    height: 11,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      glass(c, 0, 0, length, height, 8, 3, { dark: "#34454f", light: "#8ba3b2" });
      for (const slab of [3.6, 7.4]) {
        c.fillStyle = WHITE;
        c.fillRect(0, up(slab + 1.0), length, 1.0);
        c.fillStyle = "rgba(0, 0, 0, 0.22)";
        c.fillRect(0, up(slab), length, 0.18);
        c.fillStyle = "#b8b3a6"; // the rail on top of the slab
        c.fillRect(0, up(slab + 2.05), length, 0.06);
        for (let x = 0; x < length; x += 0.3) {
          c.fillRect(x, up(slab + 2.05), 0.03, 1.05);
        }
      }
      c.fillStyle = WHITE;
      c.fillRect(0, 0, length, 0.5);
    },
  },

  // Facing the plaza: a deep shaded entrance under a white balcony.
  "south-end": {
    length: 24,
    height: 11,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      glass(c, 0, 0, length, height, 8, 3, { dark: "#34454f", light: "#8ba3b2" });
      c.fillStyle = "#3a3632";
      c.fillRect(0, up(3.5), length, 3.5);
      c.fillStyle = "#57504a";
      c.fillRect(2, up(3.1), 5, 3.1);
      c.fillRect(15, up(3.1), 6, 3.1);
      c.fillStyle = WHITE;
      c.fillRect(0, up(4.7), length, 1.2);
      c.fillStyle = "rgba(0, 0, 0, 0.25)";
      c.fillRect(0, up(3.5), length, 0.2);
      c.fillStyle = "#b8b3a6";
      c.fillRect(0, up(5.8), length, 0.06);
      for (let x = 0; x < length; x += 0.3) {
        c.fillRect(x, up(5.8), 0.03, 1.1);
      }
      c.fillStyle = WHITE;
      for (const x of [5.6, 13.4, 21.2]) {
        c.fillRect(x, up(3.5), 0.34, 3.5); // round white columns
      }
      c.fillRect(0, 0, length, 0.5);
    },
  },

  // Brown slats over a service yard, with white wall above.
  louvres: {
    length: 18,
    height: 9,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      whiteWall(c, 0, 0, length, height);
      c.fillStyle = "#4f4238";
      c.fillRect(0.6, up(4.3), length - 1.2, 4.2);
      c.fillStyle = "#77665a";
      for (let y = 0.2; y < 4.3; y += 0.22) {
        c.fillRect(0.6, up(y + 0.1), length - 1.2, 0.1);
      }
      c.fillStyle = "#2f2823";
      c.fillRect(7, up(3.9), 6.5, 0.7);
    },
  },

  // The tall plain wall that holds up the ground behind it.
  retaining: {
    period: 6,
    height: 5.5,
    paint(c, length, height) {
      whiteWall(c, 0, 0, length, height, "#eeeeea");
      c.fillStyle = "rgba(110, 115, 115, 0.2)";
      c.fillRect(0, height * 0.52, length, 0.04);
      for (let x = 0; x < length; x += 3) {
        c.fillRect(x, 0, 0.035, height);
      }
    },
  },

  "white-box-window": {
    length: 15,
    height: 9,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      whiteWall(c, 0, 0, length, height);
      glass(c, 2, up(8.3), length - 4, 2.2, 4, 1, { dark: "#33444f", light: "#6f8797" });
    },
  },

  // ---- The Jeronimo Martins Grand Auditorium: all white, folded, no windows ----
  "auditorium-west": {
    length: 45,
    height: 14,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      whiteWall(c, 0, 0, length, height, "#f6f5f1");
      // Folds: wide slanting planes, each a little lighter or darker.
      const folds = [
        [0, 9, "rgba(0, 0, 0, 0.05)"],
        [9, 21, "rgba(255, 255, 255, 0.5)"],
        [21, 30, "rgba(0, 0, 0, 0.035)"],
        [30, 45, "rgba(0, 0, 0, 0.075)"],
      ];
      for (const [from, to, shade] of folds) {
        c.fillStyle = shade;
        c.beginPath();
        c.moveTo(from + 2.2, 0);
        c.lineTo(to + 2.2, 0);
        c.lineTo(to - 1.4, height);
        c.lineTo(from - 1.4, height);
        c.closePath();
        c.fill();
      }
      // The body is cut away at its foot: shadow underneath.
      c.fillStyle = "#3a3f44";
      c.beginPath();
      c.moveTo(0, height);
      c.lineTo(0, up(2.6));
      c.lineTo(20, up(1.9));
      c.lineTo(27, height);
      c.closePath();
      c.fill();
      lettering(c, "Jerónimo Martins", 17, up(7.6), 0.5);
      lettering(c, "Grand Auditorium", 17, up(6.7), 0.5);
    },
  },

  // ---- The way to the beach: the mouth of the tunnel under the coast road ----
  "tunnel-portal": {
    length: 12,
    height: 3.2,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      c.fillStyle = "#15191d";
      c.fillRect(0, 0, length, height);
      // Murals on the walls inside: big bright shapes.
      const shapes = [
        [1.0, 1.1, 0.8, "#f2c531"],
        [2.6, 0.9, 0.6, "#e2493a"],
        [3.9, 1.3, 0.7, "#3f8fd8"],
        [8.2, 1.0, 0.75, "#f2c531"],
        [9.7, 1.3, 0.6, "#3fb58a"],
        [10.9, 0.9, 0.55, "#e2493a"],
      ];
      for (const [x, y, radius, colour] of shapes) {
        c.fillStyle = colour;
        c.beginPath();
        c.arc(x, up(y), radius, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = "rgba(10, 12, 14, 0.55)"; // deeper in, it is dark
      c.fillRect(4.6, up(2.3), 2.8, 2.3);
      c.fillStyle = "#a9a59b"; // the concrete beam over the mouth
      c.fillRect(0, 0, length, 0.95);
      c.fillStyle = "rgba(255, 255, 255, 0.2)";
      c.fillRect(0, 0, length, 0.08);
      lettering(c, "Sagres Beach Way", length / 2, up(2.47), 0.3, "#f4f2ec", { align: "center", weight: 600 });
    },
  },

  // ---- Inside the Hovione Atrium ----

  // The entrance front from inside: daylight through the glass.
  "atrium-west-in": {
    length: 48,
    height: 12.5,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      const day = c.createLinearGradient(0, 0, 0, height);
      day.addColorStop(0, "#dfe9f0");
      day.addColorStop(1, "#c3d2dc");
      c.fillStyle = day;
      c.fillRect(0, 0, length, height);
      c.fillStyle = "#8f989e";
      for (let x = 0; x <= 33; x += 1.5) {
        c.fillRect(x - 0.04, 0, 0.08, height);
      }
      c.fillRect(0, up(4.5), 33, 0.25);
      c.fillRect(0, up(8.6), 33, 0.12);
      whiteWall(c, 33, 0, 15, height, "#ecebe6"); // the back of the white wall
    },
  },

  // The north side: the reception, and rooms behind glass upstairs.
  "atrium-north-in": {
    length: 72,
    height: 12.5,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      whiteWall(c, 0, 0, length, height, "#eeede8");
      c.fillStyle = "#8a5a3a"; // the wooden wall behind the reception
      c.fillRect(4, up(3.6), 12, 3.6);
      c.fillStyle = "#6f4429";
      for (let x = 4; x < 16; x += 0.6) {
        c.fillRect(x, up(3.6), 0.04, 3.6);
      }
      for (let x = 20; x < length - 3; x += 9) {
        c.fillStyle = "#d9d3c6"; // doorways
        c.fillRect(x, up(3.2), 3.2, 3.2);
      }
      const rooms = c.createLinearGradient(0, up(10.4), 0, up(6.4));
      rooms.addColorStop(0, "#c9b48f");
      rooms.addColorStop(1, "#9c9484");
      c.fillStyle = rooms;
      c.fillRect(0, up(10.4), length, 4);
      c.fillStyle = "#e9e9e4";
      for (let x = 0; x <= length; x += 3) {
        c.fillRect(x - 0.05, up(10.4), 0.1, 4);
      }
    },
  },

  // The east side: a white wall with strokes of colour, and bright doorways.
  "atrium-east-in": {
    length: 54,
    height: 12.5,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      whiteWall(c, 0, 0, length, height, "#eeede8");
      const colours = ["#d8382f", "#2f6fc4", "#e9b92c", "#3a9a6a", "#7a4aa0"];
      const random = chooser(303);
      for (let cluster = 0; cluster < 6; cluster++) {
        const x = 5 + cluster * 8.4;
        for (let i = 0; i < 9; i++) {
          c.save();
          c.translate(x + random() * 3.4, up(1.9 + random() * 1.8));
          c.rotate((random() - 0.5) * 1.2);
          c.fillStyle = colours[Math.floor(random() * colours.length)];
          c.fillRect(0, 0, 0.9 + random() * 0.8, 0.17);
          c.restore();
        }
      }
      for (const x of [14, 30, 44]) {
        c.fillStyle = "#f7f3e6";
        c.fillRect(x, up(3.4), 2.6, 3.4);
      }
      const rooms = c.createLinearGradient(0, up(10.4), 0, up(6.4));
      rooms.addColorStop(0, "#c9b48f");
      rooms.addColorStop(1, "#9c9484");
      c.fillStyle = rooms;
      c.fillRect(0, up(10.4), length, 4);
      c.fillStyle = "#e9e9e4";
      for (let x = 0; x <= length; x += 3) {
        c.fillRect(x - 0.05, up(10.4), 0.1, 4);
      }
    },
  },

  // The south side: the name of the hall, and the glass doors to the terrace.
  "atrium-south-in": {
    length: 72,
    height: 12.5,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      whiteWall(c, 0, 0, length, height, "#eeede8");
      // From its left end (the east) the wall has glass to the terrace.
      const day = c.createLinearGradient(0, up(4.2), 0, height);
      day.addColorStop(0, "#f1dfbd");
      day.addColorStop(1, "#d6c7a6");
      c.fillStyle = day;
      c.fillRect(3, up(4.2), 33, 4.2);
      c.fillStyle = "#8f989e";
      for (let x = 3; x <= 36; x += 1.5) {
        c.fillRect(x - 0.04, up(4.2), 0.08, 4.2);
      }
      c.fillStyle = "#2f9a5a"; // the green sign over the way out
      c.fillRect(25.8, up(4.9), 0.9, 0.5);
      lettering(c, "Hovione", 47, up(3.0), 0.55);
      lettering(c, "Atrium", 47, up(2.0), 0.55);
      const rooms = c.createLinearGradient(0, up(10.4), 0, up(6.4));
      rooms.addColorStop(0, "#c9b48f");
      rooms.addColorStop(1, "#9c9484");
      c.fillStyle = rooms;
      c.fillRect(0, up(10.4), length, 4);
      c.fillStyle = "#e9e9e4";
      for (let x = 0; x <= length; x += 3) {
        c.fillRect(x - 0.05, up(10.4), 0.1, 4);
      }
    },
  },

  // The atrium's south wall from outside, on the terrace: glass under a white wall.
  "terrace-wall": {
    length: 72,
    height: 12.5,
    paint(c, length, height) {
      const up = (metres) => height - metres;
      whiteWall(c, 0, 0, length, height);
      glass(c, 0, up(4.3), length, 4.2, 48, 1, { dark: "#3a4b57", light: "#7f96a5", thick: 0.06 });
      glass(c, 0, up(10.6), length, 4.2, 24, 1, { dark: "#2b3d4d", light: "#5b7385" });
    },
  },

  // The white letters that stand on the floor of the atrium, one picture each.
  "letter-n": letter((c, size) => novaLetter(c, 0, size)),
  "letter-o": letter((c, size) => novaLetter(c, 1, size)),
  "letter-v": letter((c, size) => novaLetter(c, 2, size)),
  "letter-a": letter((c, size) => novaLetter(c, 3, size)),
};

/** A picture for one standing letter: 1.7 metres wide and tall, see-through round the letter. */
function letter(draw) {
  return {
    length: 1.7,
    height: 1.7,
    fits: true,
    holes: true,
    paint(c) {
      draw(c, 1.7);
    },
  };
}

/** One of the four standing letters (0 is N, 1 the ring, 2 V, 3 the A without a crossbar), with a grey edge for depth. */
function novaLetter(c, which, size) {
  const thick = size * 0.2;
  const draw = (shiftX, colour) => {
    c.strokeStyle = colour;
    c.fillStyle = colour;
    c.lineWidth = thick;
    c.beginPath();
    if (which === 0) {
      c.moveTo(shiftX + thick / 2 + 0.1, size);
      c.lineTo(shiftX + thick / 2 + 0.1, 0.06);
      c.lineTo(shiftX + size - thick / 2 - 0.2, size - 0.06);
      c.lineTo(shiftX + size - thick / 2 - 0.2, 0);
    } else if (which === 1) {
      c.arc(shiftX + size / 2, size * 0.48, size * 0.36, 0, Math.PI * 2);
    } else if (which === 2) {
      c.moveTo(shiftX + 0.16, 0);
      c.lineTo(shiftX + size / 2, size - 0.08);
      c.lineTo(shiftX + size - 0.16, 0);
    } else {
      c.moveTo(shiftX + 0.16, size);
      c.lineTo(shiftX + size / 2, 0.08);
      c.lineTo(shiftX + size - 0.16, size);
    }
    c.stroke();
    if (which === 1) {
      c.fillRect(shiftX + size * 0.12, size - 0.14, size * 0.76, 0.14);
    }
  };
  draw(0.07, "#b9bcbd");
  draw(0, "#fbfbf9");
}
