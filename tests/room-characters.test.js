// Tests for characters online: a browser says "I want to be this
// character" (server/messages.js), the room's list of characters checks
// that nobody else in it already is (server/cast-keeper.js), and every
// browser in the room is told (server/online.js).
//
// A character belongs to one player in a room at a time, so most of these
// tests are about what must be refused.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import WebSocket from "ws";
import { readClientMessage } from "../server/messages.js";
import { createRoom } from "../server/room.js";
import { createCastKeeper, mayChangeCharacter } from "../server/cast-keeper.js";
import { createApp } from "../server/app.js";
import { attachOnlinePlay, ONLINE_ADDRESS } from "../server/online.js";
import { CAST, characterById } from "../shared/cast.js";
import { COUNTDOWN_STEPS } from "../shared/countdown.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";

const BROKE_THE_RULES = 1008;
const newRoom = (maxPlayers) => createRoom(TEST_OVAL, TEST_DRIVER, maxPlayers);

describe("reading 'I want to be this character'", () => {
  it("accepts the id of every character in the cast, and gives back only that", () => {
    for (const { id } of CAST) {
      expect(readClientMessage(JSON.stringify({ type: "character", id }))).toEqual({ type: "character", character: id });
    }
  });

  it("drops anything extra that came with it", () => {
    expect(readClientMessage('{"type":"character","id":"pcp","player":3,"look":{"body":1}}')).toEqual({
      type: "character",
      character: "pcp",
    });
  });

  it("refuses anything that is not exactly the id of a character", () => {
    for (const text of [
      '{"type":"character"}',
      '{"type":"character","id":"mario"}',
      '{"type":"character","id":"PCP"}',
      '{"type":"character","id":" pcp"}',
      '{"type":"character","id":"../pcp"}',
      '{"type":"character","id":"<img src=x onerror=alert(1)>"}',
      '{"type":"character","id":3}',
      '{"type":"character","id":null}',
      '{"type":"character","id":["pcp"]}',
      '{"type":"character","character":"pcp"}',
    ]) {
      expect(readClientMessage(text), text).toBe(null);
    }
  });
});

describe("who is which character in a room", () => {
  const YES = true; // the player may change character now

  it("has nobody as a character at first", () => {
    const cast = createCastKeeper();
    expect(cast.characterOf(1)).toBe(undefined);
  });

  it("lets a player choose a character, and gives its colours", () => {
    const cast = createCastKeeper();
    expect(cast.choose(1, "pcp", YES)).toBe(characterById("pcp"));
    expect(cast.characterOf(1)).toBe("pcp");
  });

  it("refuses a character to a second player while the first one has it", () => {
    const cast = createCastKeeper();
    cast.choose(1, "cici", YES);
    expect(cast.choose(2, "cici", YES)).toBe(null);
    expect(cast.characterOf(1)).toBe("cici"); // the first keeps it
    expect(cast.characterOf(2)).toBe(undefined); // the second got nothing
  });

  it("gives a character to exactly one of two players who ask one right after the other", () => {
    const cast = createCastKeeper();
    const answers = [cast.choose(1, "dean", YES), cast.choose(2, "dean", YES)];
    expect(answers).toEqual([characterById("dean"), null]);
  });

  it("says yes when you ask again for the character you already are", () => {
    const cast = createCastKeeper();
    cast.choose(1, "ro", YES);
    expect(cast.choose(1, "ro", YES)).toBe(characterById("ro"));
  });

  it("lets a player change to another free character, which frees the first", () => {
    const cast = createCastKeeper();
    cast.choose(1, "ro", YES);
    expect(cast.choose(1, "franfon", YES)).not.toBe(null);
    expect(cast.choose(2, "ro", YES)).not.toBe(null);
    expect([cast.characterOf(1), cast.characterOf(2)]).toEqual(["franfon", "ro"]);
  });

  it("frees a character when its player leaves", () => {
    const cast = createCastKeeper();
    cast.choose(1, "pcp", YES);
    cast.forget(1);
    expect(cast.choose(2, "pcp", YES)).not.toBe(null);
  });

  it("refuses a character that is not in the cast, and changes nothing", () => {
    const cast = createCastKeeper();
    cast.choose(1, "dean", YES);
    for (const notAnId of ["mario", "DEAN", "", null, undefined, 3, { id: "pcp" }]) {
      expect(cast.choose(1, notAnId, YES), JSON.stringify(notAnId)).toBe(null);
    }
    expect(cast.characterOf(1)).toBe("dean");
  });

  it("refuses any change when the player may not change now", () => {
    const cast = createCastKeeper();
    cast.choose(1, "dean", YES);
    expect(cast.choose(1, "pcp", false)).toBe(null);
    expect(cast.choose(2, "pcp", false)).toBe(null);
    expect(cast.giveFree(2, false)).toBe(null);
    expect([cast.characterOf(1), cast.characterOf(2)]).toEqual(["dean", undefined]);
  });

  it("gives a player whose choice was taken the first free character, in the order of the cast", () => {
    const cast = createCastKeeper();
    cast.choose(1, "dean", YES);
    expect(cast.giveFree(2, YES)).toBe(characterById("ricardo"));
    expect(cast.giveFree(3, YES)).toBe(characterById("ro"));
  });

  it("does not take away a character a player already is when giving a free one", () => {
    const cast = createCastKeeper();
    cast.choose(1, "pcp", YES);
    expect(cast.giveFree(1, YES)).toBe(characterById("pcp"));
    expect(cast.giveFree(1, false)).toBe(characterById("pcp"));
  });

  it("has no character left for a seventh player: that kart stays plain", () => {
    const cast = createCastKeeper();
    CAST.forEach((character, index) => cast.choose(index + 1, character.id, YES));
    expect(cast.giveFree(7, YES)).toBe(null);
    expect(cast.characterOf(7)).toBe(undefined);
  });

  it("adds each player's character to an update of the room, without changing the update", () => {
    const cast = createCastKeeper();
    cast.choose(1, "cici", YES);
    const update = { type: "state", step: 5, karts: [{ id: 1, x: 1 }, { id: 2, x: 2 }] };
    const dressed = cast.dress(update);
    expect(dressed.karts).toEqual([{ id: 1, x: 1, character: "cici" }, { id: 2, x: 2 }]);
    expect(dressed.step).toBe(5);
    expect("character" in update.karts[0]).toBe(false);
  });
});

describe("when a player may change character", () => {
  it("is any time while the room is open, or after a race", () => {
    const room = newRoom();
    const host = room.addPlayer().id;
    expect(mayChangeCharacter(room, host)).toBe(true);
  });

  it("is never during the countdown or the race, for someone who is racing", () => {
    const room = newRoom();
    const host = room.addPlayer().id;
    room.startRace(host);
    expect(room.phase()).toBe("countdown");
    expect(mayChangeCharacter(room, host)).toBe(false);
    for (let step = 0; step <= COUNTDOWN_STEPS; step++) {
      room.step();
    }
    expect(room.phase()).toBe("racing");
    expect(mayChangeCharacter(room, host)).toBe(false);
  });

  it("is during a race for someone who is watching: they race with it next time", () => {
    const room = newRoom();
    const host = room.addPlayer().id;
    room.startRace(host);
    const late = room.addPlayer().id; // joins during the countdown: watches
    expect(mayChangeCharacter(room, late)).toBe(true);
  });
});

describe("characters over a live connection", () => {
  let app;
  let online;
  let port;
  let sockets;

  beforeEach(async () => {
    app = createApp();
    online = attachOnlinePlay(app, { track: TEST_OVAL, character: TEST_DRIVER, maxPlayers: 4, goodbyeWaitMs: 300 });
    await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
    port = app.address().port;
    sockets = [];
  });

  afterEach(async () => {
    for (const socket of sockets) {
      socket.terminate();
    }
    online.close();
    await new Promise((resolve) => app.close(resolve));
  });

  /** Connects a pretend browser. Gives { id, send, next, closed } once the server has welcomed it. */
  function connect() {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(`ws://127.0.0.1:${port}${ONLINE_ADDRESS}`);
      sockets.push(socket);
      const waiting = [];
      const browser = {
        id: null,
        send: (message) => socket.send(typeof message === "string" ? message : JSON.stringify(message)),
        next: (test) =>
          new Promise((found, gaveUp) => {
            const timer = setTimeout(() => gaveUp(new Error("No such message arrived in time")), 3000);
            waiting.push({ test, found, timer });
          }),
        closed: new Promise((done) => socket.on("close", (code) => done({ code }))),
      };
      socket.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "welcome") {
          browser.id = message.id;
          resolve(browser);
        }
        for (const waiter of [...waiting]) {
          if (waiter.test(message)) {
            clearTimeout(waiter.timer);
            waiting.splice(waiting.indexOf(waiter), 1);
            waiter.found(message);
          }
        }
      });
      socket.on("error", reject);
    });
  }

  const characterOf = (state, id) => state.karts.find((kart) => kart.id === id)?.character;
  const stateWhere = (test) => (message) => message.type === "state" && test(message);

  it("shows one player's character to the other player", async () => {
    const ana = await connect();
    const rui = await connect();
    ana.send({ type: "character", id: "cici" });
    const update = await rui.next(stateWhere((state) => characterOf(state, ana.id) !== undefined));
    expect(characterOf(update, ana.id)).toBe("cici");
    expect(update.karts.find((kart) => kart.id === ana.id).look).toEqual(characterById("cici").look);
  });

  it("gives the second player who asks for a taken character the first free one", async () => {
    const ana = await connect();
    ana.send({ type: "character", id: "dean" });
    await ana.next(stateWhere((state) => characterOf(state, ana.id) === "dean"));
    const rui = await connect();
    rui.send({ type: "character", id: "dean" });
    const update = await rui.next(stateWhere((state) => characterOf(state, rui.id) !== undefined));
    expect(characterOf(update, rui.id)).toBe("ricardo");
    expect(characterOf(update, ana.id)).toBe("dean"); // Ana keeps hers
  });

  it("keeps the character's colours when that player sends other colours", async () => {
    const ana = await connect();
    ana.send({ type: "character", id: "pcp" });
    await ana.next(stateWhere((state) => characterOf(state, ana.id) === "pcp"));
    ana.send({ type: "look", body: 3, helmet: 3, suit: 4 });
    ana.send({ type: "restart" }); // something after it, to know the look message was read
    await new Promise((resolve) => setTimeout(resolve, 150));
    const update = await ana.next(stateWhere(() => true));
    expect(update.karts.find((kart) => kart.id === ana.id).look).toEqual(characterById("pcp").look);
  });

  it("frees a character when its player closes the page", async () => {
    const ana = await connect();
    const rui = await connect();
    ana.send({ type: "character", id: "franfon" });
    await rui.next(stateWhere((state) => characterOf(state, ana.id) === "franfon"));
    sockets[0].close();
    await ana.closed;
    await rui.next(stateWhere((state) => state.karts.length === 1));
    rui.send({ type: "character", id: "franfon" });
    const update = await rui.next(stateWhere((state) => characterOf(state, rui.id) !== undefined));
    expect(characterOf(update, rui.id)).toBe("franfon");
  });

  it("sends the face pictures to the browser, as pictures", async () => {
    const answer = await fetch(`http://127.0.0.1:${port}/faces/pcp.jpg`);
    expect(answer.status).toBe(200);
    expect(answer.headers.get("content-type")).toBe("image/jpeg");
  });

  it("sends a browser away for a character that is not in the cast", async () => {
    for (const message of [{ type: "character", id: "mario" }, { type: "character", id: 1 }, { type: "character" }]) {
      const browser = await connect();
      browser.send(message);
      expect((await browser.closed).code, JSON.stringify(message)).toBe(BROKE_THE_RULES);
    }
    expect(online.room.playerCount()).toBe(0);
  });
});
