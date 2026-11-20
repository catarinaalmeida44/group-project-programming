// Tests for the recorded music (20 November 2026): which tune plays when
// (client/music-files.js), the player's rules, checked on a pretend sound
// system that makes no sound (createFilePlayer in client/music.js), the
// files themselves, and how the server sends them (server/app.js).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, statSync } from "node:fs";
import { TUNES, isTune, lapTune, tuneFor, tunesAhead, loopPoints, MOST_TRIM_SECONDS, SILENCE } from "../client/music-files.js";
import { createFilePlayer, FILE_MUSIC_VOLUME } from "../client/music.js";
import { raceMoment } from "../client/music-cues.js";
import { createApp } from "../server/app.js";

const inClient = (address) => new URL(`../client${address}`, import.meta.url);

describe("the five tunes", () => {
  it("are the menu, three for the laps of a race, and the podium", () => {
    expect(Object.keys(TUNES)).toEqual(["menu", "lap-first", "lap-middle", "lap-last", "podium"]);
  });

  it("go round and round, except the podium's, which plays once", () => {
    for (const name of ["menu", "lap-first", "lap-middle", "lap-last"]) {
      expect(TUNES[name].loops, name).toBe(true);
    }
    expect(TUNES.podium.loops).toBe(false);
  });

  it("each have a file in client/music that is really there", () => {
    for (const [name, tune] of Object.entries(TUNES)) {
      expect(tune.file, name).toMatch(/^\/music\/[a-z-]+\.(mp3|flac)$/);
      expect(statSync(inClient(tune.file)).size, name).toBeGreaterThan(100_000);
    }
  });

  it("are the kinds of file they say they are", () => {
    const start = (name) => readFileSync(inClient(TUNES[name].file)).subarray(0, 4).toString("latin1");
    expect(start("podium")).toBe("fLaC");
    for (const name of ["menu", "lap-first", "lap-middle", "lap-last"]) {
      expect(start(name).startsWith("ID3") || start(name).charCodeAt(0) === 0xff, name).toBe(true);
    }
  });

  it("cannot be changed by mistake", () => {
    expect(Object.isFrozen(TUNES)).toBe(true);
    expect(Object.isFrozen(TUNES.menu)).toBe(true);
  });

  it("are only known by their exact names", () => {
    expect(isTune("menu")).toBe(true);
    expect(isTune("podium")).toBe(true);
    for (const name of ["race", "finish", "Menu", "", "toString", null, undefined, 3]) {
      expect(isTune(name), String(name)).toBe(false);
    }
  });
});

describe("the tune of a lap", () => {
  it("in a race of three laps: one for the first, one for the second, one for the last", () => {
    expect(lapTune(0, 3)).toBe("lap-first");
    expect(lapTune(1, 3)).toBe("lap-middle");
    expect(lapTune(2, 3)).toBe("lap-last");
  });

  it("in a longer race: every lap between the first and the last gets the middle one", () => {
    expect([0, 1, 2, 3, 4].map((done) => lapTune(done, 5))).toEqual(["lap-first", "lap-middle", "lap-middle", "lap-middle", "lap-last"]);
  });

  it("in a race of two laps: the first, then the last", () => {
    expect(lapTune(0, 2)).toBe("lap-first");
    expect(lapTune(1, 2)).toBe("lap-last");
  });

  it("in a race of one lap: the last lap's tune, because it is the last", () => {
    expect(lapTune(0, 1)).toBe("lap-last");
  });

  it("stays the last lap's tune once every lap is done", () => {
    expect(lapTune(3, 3)).toBe("lap-last");
    expect(lapTune(9, 3)).toBe("lap-last");
  });

  it("does not break on strange numbers", () => {
    expect(lapTune(-1, 3)).toBe("lap-first");
    expect(lapTune(undefined, 3)).toBe("lap-first");
    expect(lapTune(1.5, 3)).toBe("lap-first");
    expect(lapTune(0, 0)).toBe("lap-last");
    expect(lapTune(0, undefined)).toBe("lap-last");
  });
});

describe("the tune for a moment", () => {
  it("is the menu tune on the menu, and in an online room before a race", () => {
    expect(tuneFor({ place: "menu" })).toBe("menu");
  });

  it("is silence during the countdown, so the beeps are heard", () => {
    expect(tuneFor({ place: "countdown" })).toBeNull();
  });

  it("follows the laps while racing", () => {
    expect(tuneFor({ place: "racing", lapsDone: 0, laps: 3 })).toBe("lap-first");
    expect(tuneFor({ place: "racing", lapsDone: 1, laps: 3 })).toBe("lap-middle");
    expect(tuneFor({ place: "racing", lapsDone: 2, laps: 3 })).toBe("lap-last");
  });

  it("goes on with the last lap's tune after your finish, while the others still drive", () => {
    expect(tuneFor({ place: "finished", lapsDone: 3, laps: 3 })).toBe("lap-last");
  });

  it("is trumpets and clapping on the podium", () => {
    expect(tuneFor({ place: "podium", lapsDone: 3, laps: 3 })).toBe("podium");
  });

  it("is silence everywhere when the music is switched off", () => {
    for (const place of ["menu", "countdown", "racing", "finished", "podium"]) {
      expect(tuneFor({ place, lapsDone: 1, laps: 3, musicOn: false }), place).toBeNull();
    }
  });

  it("is silence for a place it does not know, or none at all", () => {
    expect(tuneFor({ place: "cup" })).toBeNull();
    expect(tuneFor({ place: null })).toBeNull();
    expect(tuneFor({})).toBeNull();
  });

  it("through a whole single race: silence, three tunes, and the podium", () => {
    const at = (facts) => tuneFor({ place: raceMoment({ laps: 3, ...facts }).place, lapsDone: facts.lapsDone ?? 0, laps: 3 });
    expect(at({})).toBeNull(); //                                              on the grid, before the first key
    expect(at({ started: true })).toBeNull(); //                                3, 2, 1
    expect(at({ started: true, racing: true, lapsDone: 0 })).toBe("lap-first");
    expect(at({ started: true, racing: true, lapsDone: 1 })).toBe("lap-middle");
    expect(at({ started: true, racing: true, lapsDone: 2 })).toBe("lap-last");
    expect(at({ started: true, racing: true, finished: true, lapsDone: 3 })).toBe("lap-last");
    expect(at({ started: true, racing: true, finished: true, podium: true, lapsDone: 3 })).toBe("podium");
  });

  it("in an online room: the menu tune while it waits for its first race", () => {
    expect(tuneFor({ place: raceMoment({ inLobby: true }).place })).toBe("menu");
  });
});

describe("the tunes a page fetches ahead", () => {
  it("are the menu tune for the menu", () => {
    expect(tunesAhead("menu")).toEqual(["menu"]);
  });

  it("are the three laps and the podium for a race page", () => {
    expect(tunesAhead("race")).toEqual(["lap-first", "lap-middle", "lap-last", "podium"]);
  });

  it("are none for a page that did not say", () => {
    expect(tunesAhead(null)).toEqual([]);
    expect(tunesAhead("cup")).toEqual([]);
  });

  it("are all real tunes", () => {
    for (const name of [...tunesAhead("menu"), ...tunesAhead("race")]) {
      expect(isTune(name), name).toBe(true);
    }
  });
});

describe("where a tune that goes round and round jumps back", () => {
  const RATE = 1000; // a thousand numbers a second, to keep the sums easy
  /** A second of sound with this many silent numbers at the start and at the end. */
  function sound(silentStart, silentEnd, length = RATE) {
    const list = new Float32Array(length).fill(0.5);
    list.fill(0, 0, silentStart);
    list.fill(0, length - silentEnd);
    return list;
  }

  it("skips the short silence an MP3 file has at its start and at its end", () => {
    const { start, end } = loopPoints([sound(30, 50)], RATE);
    expect(start).toBeCloseTo(0.03, 5);
    expect(end).toBeCloseTo(0.95, 5);
  });

  it("is the whole tune when there is no silence", () => {
    expect(loopPoints([sound(0, 0)], RATE)).toEqual({ start: 0, end: 1 });
  });

  it("never cuts more than a tenth of a second at either end, so a tune that begins quietly is not shortened", () => {
    expect(MOST_TRIM_SECONDS).toBe(0.1);
    const { start, end } = loopPoints([sound(400, 300)], RATE);
    expect(start).toBeCloseTo(0.1, 5);
    expect(end).toBeCloseTo(0.9, 5);
  });

  it("listens to both loudspeakers: sound in either one is not silence", () => {
    const left = sound(60, 60);
    const right = sound(20, 10);
    const { start, end } = loopPoints([left, right], RATE);
    expect(start).toBeCloseTo(0.02, 5);
    expect(end).toBeCloseTo(0.99, 5);
  });

  it("counts very quiet numbers as silence, and anything louder as music", () => {
    const list = new Float32Array(RATE).fill(0.5);
    list.fill(SILENCE / 2, 0, 40); // too quiet to hear
    list[10] = -0.3; //               but here is a sound
    expect(loopPoints([list], RATE).start).toBeCloseTo(0.01, 5);
  });

  it("does not break on nothing, on silence only, or on a strange speed", () => {
    expect(loopPoints([], RATE)).toEqual({ start: 0, end: 0 });
    expect(loopPoints(null, RATE)).toEqual({ start: 0, end: 0 });
    expect(loopPoints([sound(0, 0)], 0)).toEqual({ start: 0, end: 0 });
    const silent = loopPoints([new Float32Array(RATE)], RATE);
    expect(silent.start).toBeLessThan(silent.end); // still a stretch to play, never backwards
  });
});

// ---------------------------------------------------------------------------
// The player, on a pretend sound system: it writes down what would be heard
// ---------------------------------------------------------------------------

/** A pretend sound system. Nothing is heard: every sound that is started or stopped is written down. */
function pretendSoundSystem() {
  const log = [];
  const gain = () => ({
    gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime(value) { log.push(`volume ${value.toFixed(3)}`); } },
    connect() {},
    disconnect() {},
  });
  return {
    log,
    currentTime: 0,
    destination: {},
    createGain: gain,
    createBufferSource() {
      const source = {
        buffer: null,
        loop: false,
        loopStart: 0,
        loopEnd: 0,
        onended: null,
        connect() {},
        start() {
          log.push(`start ${source.buffer.name}${source.loop ? " (round and round)" : " (once)"}`);
        },
        stop() {
          log.push(`stop ${source.buffer.name}`);
        },
        /** For the tests: the sound has played to its end. */
        finish() {
          source.onended?.();
        },
      };
      this.sources.push(source);
      return source;
    },
    sources: [],
  };
}

/** A pretend sound: half a second of noise with a little silence at each end. */
function pretendSound(name) {
  const list = new Float32Array(500).fill(0.4);
  list.fill(0, 0, 20);
  list.fill(0, 480);
  return { name, numberOfChannels: 1, sampleRate: 1000, getChannelData: () => list };
}

/** A loader the test controls: arrive(name) hands the sound over, fail(name) loses it. */
function pretendLoader() {
  const waiting = new Map();
  const asked = [];
  return {
    asked,
    load(name) {
      asked.push(name);
      return new Promise((resolve, reject) => waiting.set(name, { resolve, reject }));
    },
    async arrive(name) {
      waiting.get(name).resolve(pretendSound(name));
      await Promise.resolve();
      await Promise.resolve();
    },
    async fail(name) {
      waiting.get(name).reject(new Error("offline"));
      await Promise.resolve();
      await Promise.resolve();
    },
  };
}

describe("the player of the recorded music", () => {
  it("starts a tune as soon as its sound has arrived, round and round", async () => {
    const system = pretendSoundSystem();
    const loader = pretendLoader();
    const player = createFilePlayer(system, loader.load);
    player.play("menu");
    expect(player.playing()).toBeNull(); // not here yet
    await loader.arrive("menu");
    expect(player.playing()).toBe("menu");
    expect(system.log).toContain("start menu (round and round)");
  });

  it("jumps back inside the silence at the ends of the file", async () => {
    const system = pretendSoundSystem();
    const loader = pretendLoader();
    const player = createFilePlayer(system, loader.load);
    player.play("lap-first");
    await loader.arrive("lap-first");
    const [source] = system.sources;
    expect(source.loop).toBe(true);
    expect(source.loopStart).toBeCloseTo(0.02, 5);
    expect(source.loopEnd).toBeCloseTo(0.48, 5);
  });

  it("asks for each file once, however often the tune is wanted", async () => {
    const system = pretendSoundSystem();
    const loader = pretendLoader();
    const player = createFilePlayer(system, loader.load);
    player.play("menu");
    player.play("menu");
    await loader.arrive("menu");
    player.play(null);
    player.play("menu");
    expect(loader.asked).toEqual(["menu"]);
  });

  it("does not start the tune again when asked for the one that is playing", async () => {
    const system = pretendSoundSystem();
    const loader = pretendLoader();
    const player = createFilePlayer(system, loader.load);
    player.play("menu");
    await loader.arrive("menu");
    player.play("menu");
    player.play("menu");
    expect(system.log.filter((line) => line.startsWith("start"))).toEqual(["start menu (round and round)"]);
  });

  it("lets the tune before play on until the next one is ready: no hole between two laps", async () => {
    const system = pretendSoundSystem();
    const loader = pretendLoader();
    const player = createFilePlayer(system, loader.load);
    player.play("lap-first");
    await loader.arrive("lap-first");
    player.play("lap-middle");
    expect(player.playing()).toBe("lap-first"); // still the first lap's tune
    await loader.arrive("lap-middle");
    expect(player.playing()).toBe("lap-middle");
    expect(system.log).toContain("stop lap-first");
  });

  it("changes at once when the next tune was got ready ahead", async () => {
    const system = pretendSoundSystem();
    const loader = pretendLoader();
    const player = createFilePlayer(system, loader.load);
    player.prepare(["lap-first", "lap-middle", "lap-last", "podium"]);
    expect(loader.asked).toEqual(["lap-first", "lap-middle", "lap-last", "podium"]);
    for (const name of loader.asked) {
      await loader.arrive(name);
    }
    expect(player.playing()).toBeNull(); // getting ready is not playing
    player.play("lap-first");
    player.play("lap-middle");
    player.play("lap-last");
    expect(player.playing()).toBe("lap-last");
  });

  it("does not start a tune that arrives after something else was asked for", async () => {
    const system = pretendSoundSystem();
    const loader = pretendLoader();
    const player = createFilePlayer(system, loader.load);
    player.play("menu");
    player.play(null); // the countdown began before the file was here
    await loader.arrive("menu");
    expect(player.playing()).toBeNull();
    expect(system.log.some((line) => line.startsWith("start"))).toBe(false);
  });

  it("falls silent when asked for silence", async () => {
    const system = pretendSoundSystem();
    const loader = pretendLoader();
    const player = createFilePlayer(system, loader.load);
    player.play("menu");
    await loader.arrive("menu");
    player.play(null);
    expect(player.playing()).toBeNull();
    expect(system.log).toContain("stop menu");
  });

  it("plays the podium's tune once, and not again while the podium stays up", async () => {
    const system = pretendSoundSystem();
    const loader = pretendLoader();
    const player = createFilePlayer(system, loader.load);
    player.play("podium");
    await loader.arrive("podium");
    expect(system.log).toContain("start podium (once)");
    system.sources[0].finish(); // the trumpets are over
    expect(player.playing()).toBeNull();
    player.play("podium"); // the page says "podium" again, for example after M was pressed twice
    expect(system.log.filter((line) => line.startsWith("start podium"))).toHaveLength(1);
  });

  it("plays the podium's tune again at the next podium", async () => {
    const system = pretendSoundSystem();
    const loader = pretendLoader();
    const player = createFilePlayer(system, loader.load);
    player.play("podium");
    await loader.arrive("podium");
    system.sources[0].finish();
    player.play(null); //       a new race: the countdown
    player.play("podium"); //   and its podium
    expect(system.log.filter((line) => line.startsWith("start podium"))).toHaveLength(2);
  });

  it("stays quiet, and does not break, when a file cannot be fetched", async () => {
    const system = pretendSoundSystem();
    const loader = pretendLoader();
    const player = createFilePlayer(system, loader.load);
    player.play("lap-first");
    await loader.arrive("lap-first");
    player.play("lap-middle");
    await loader.fail("lap-middle");
    expect(player.playing()).toBeNull(); // the first lap's tune does not play on for ever
    player.play("lap-middle"); //           and the file is asked for again
    expect(loader.asked.filter((name) => name === "lap-middle")).toHaveLength(2);
  });

  it("refuses a tune that does not exist", () => {
    const player = createFilePlayer(pretendSoundSystem(), pretendLoader().load);
    expect(() => player.play("race")).toThrow();
    expect(() => player.play("../secret")).toThrow();
  });

  it("is silenced and brought back by the volume", () => {
    const system = pretendSoundSystem();
    const player = createFilePlayer(system, pretendLoader().load);
    player.setVolume(0);
    player.setVolume(1);
    expect(system.log).toEqual(["volume 0.000", `volume ${FILE_MUSIC_VOLUME.toFixed(3)}`]);
  });
});

describe("the music files, as the server sends them", () => {
  let app;
  let base;

  beforeAll(async () => {
    app = createApp();
    await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${app.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => app.close(resolve));
  });

  it("are sent whole, each labelled as the kind of sound it is", async () => {
    for (const [name, tune] of Object.entries(TUNES)) {
      const answer = await fetch(`${base}${tune.file}`);
      expect(answer.status, name).toBe(200);
      expect(answer.headers.get("content-type"), name).toBe(tune.file.endsWith(".flac") ? "audio/flac" : "audio/mpeg");
      expect((await answer.arrayBuffer()).byteLength, name).toBe(statSync(inClient(tune.file)).size);
    }
  });

  it("may be kept by the browser for a day, so they are not downloaded again on every page", async () => {
    const answer = await fetch(`${base}/music/lap-first.mp3`);
    expect(answer.headers.get("cache-control")).toBe("public, max-age=86400");
    expect(answer.headers.get("x-content-type-options")).toBe("nosniff");
    await answer.arrayBuffer();
  });

  it("leave pages and code as they were: the browser still asks for the newest each time", async () => {
    for (const address of ["/", "/music-files.js", "/style.css"]) {
      const answer = await fetch(`${base}${address}`);
      expect(answer.headers.get("cache-control"), address).toBe("no-cache");
      await answer.text();
    }
  });

  it("are the only sound the server sends: no other kind of file from that folder", async () => {
    for (const address of ["/music/README.md", "/music/", "/music", "/music/menu.wav", "/music/menu.mp3.zip", "/music/../../server/app.js"]) {
      const answer = await fetch(`${base}${address}`);
      expect(answer.status, address).toBe(404);
      await answer.text();
    }
  });
});

describe("who made the music, written down", () => {
  const notes = readFileSync(inClient("/music/README.md"), "utf8");
  const credits = readFileSync(new URL("../README.md", import.meta.url), "utf8");

  it("is in the folder of the music, for every file", () => {
    for (const tune of Object.values(TUNES)) {
      expect(notes, tune.file).toContain(tune.file.replace("/music/", ""));
    }
    expect(notes).toContain("MintoDog");
    expect(notes).toContain("CC0");
    expect(notes).toContain("CC-BY 3.0");
  });

  it("names the maker of the podium's tune in the main README, as its licence asks", () => {
    expect(credits).toContain("YoFrankie! (c) 2008, Blender Foundation, www.blender.org");
    expect(credits).toContain("CC-BY 3.0");
    expect(credits).toContain("MintoDog");
  });
});
