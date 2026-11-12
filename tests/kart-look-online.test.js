// Tests for the colours of a kart travelling through the server: a browser
// says "paint my kart in these colours" (server/messages.js), the room
// remembers it (server/room.js), and every browser in the room is told
// (server/online.js). Also: the banana peels the online page takes from an
// update (client/net.js).
//
// A choice of colours is the one thing a browser sends that other players
// get to see, so most of these tests are about what must be refused.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import WebSocket from "ws";
import { readClientMessage } from "../server/messages.js";
import { createRoom } from "../server/room.js";
import { createApp } from "../server/app.js";
import { attachOnlinePlay, ONLINE_ADDRESS } from "../server/online.js";
import { bananasOf } from "../client/net.js";
import { lookFromChoice } from "../client/kart-choice.js";
import { LOOK_PARTS } from "../shared/kart-looks.js";
import { TEST_DRIVER } from "../shared/characters.js";
import { TEST_OVAL } from "../shared/tracks/test-oval.js";

const BROKE_THE_RULES = 1008;
const kartOf = (room, id) => room.snapshot().karts.find((kart) => kart.id === id);

describe("reading 'paint my kart in these colours'", () => {
  it("accepts three whole numbers from the allowed ranges, and gives back only those", () => {
    expect(readClientMessage('{"type":"look","body":2,"helmet":0,"suit":4}')).toEqual({
      type: "look",
      look: { body: 2, helmet: 0, suit: 4 },
    });
    const last = { type: "look", body: LOOK_PARTS.body - 1, helmet: LOOK_PARTS.helmet - 1, suit: LOOK_PARTS.suit - 1 };
    expect(readClientMessage(JSON.stringify(last)).look).toEqual({ body: last.body, helmet: last.helmet, suit: last.suit });
  });

  it("drops anything extra that came with the choice", () => {
    const message = readClientMessage('{"type":"look","body":1,"helmet":1,"suit":1,"id":7,"name":"Ana","speed":999}');
    expect(message).toEqual({ type: "look", look: { body: 1, helmet: 1, suit: 1 } });
  });

  it("refuses colours written out, names, numbers out of range and anything else that is not three small whole numbers", () => {
    const refused = [
      '{"type":"look"}',
      '{"type":"look","body":0,"helmet":0}',
      '{"type":"look","body":-1,"helmet":0,"suit":0}',
      `{"type":"look","body":${LOOK_PARTS.body},"helmet":0,"suit":0}`,
      '{"type":"look","body":0,"helmet":0,"suit":99}',
      '{"type":"look","body":1.5,"helmet":0,"suit":0}',
      '{"type":"look","body":"1","helmet":0,"suit":0}',
      '{"type":"look","body":"#e23d3d","helmet":"#ffffff","suit":"#000000"}',
      '{"type":"look","body":"<img src=x onerror=alert(1)>","helmet":0,"suit":0}',
      '{"type":"look","body":null,"helmet":0,"suit":0}',
      '{"type":"look","body":[1],"helmet":0,"suit":0}',
      '{"type":"look","look":{"body":1,"helmet":1,"suit":1}}',
      '{"type":"LOOK","body":1,"helmet":1,"suit":1}',
    ];
    for (const text of refused) {
      expect(readClientMessage(text), text).toBe(null);
    }
  });
});

describe("the room remembering a player's colours", () => {
  it("shows no colours for a player who chose none: the page then uses the colours of their place", () => {
    const room = createRoom(TEST_OVAL, TEST_DRIVER);
    const { id } = room.addPlayer();
    expect("look" in kartOf(room, id)).toBe(false);
  });

  it("tells everyone the colours a player chose, as the three numbers", () => {
    const room = createRoom(TEST_OVAL, TEST_DRIVER);
    const ana = room.addPlayer().id;
    const rui = room.addPlayer().id;
    expect(room.setLook(ana, { body: 6, helmet: 2, suit: 1 })).toBe(true);
    expect(kartOf(room, ana).look).toEqual({ body: 6, helmet: 2, suit: 1 });
    expect("look" in kartOf(room, rui)).toBe(false); // only Ana's kart changed
  });

  it("lets a player change their mind", () => {
    const room = createRoom(TEST_OVAL, TEST_DRIVER);
    const { id } = room.addPlayer();
    room.setLook(id, { body: 1, helmet: 1, suit: 1 });
    room.setLook(id, { body: 3, helmet: 4, suit: 5 });
    expect(kartOf(room, id).look).toEqual({ body: 3, helmet: 4, suit: 5 });
  });

  it("refuses a choice that is not allowed, and keeps the colours the kart had", () => {
    const room = createRoom(TEST_OVAL, TEST_DRIVER);
    const { id } = room.addPlayer();
    room.setLook(id, { body: 1, helmet: 1, suit: 1 });
    const bad = [null, undefined, "red", {}, { body: 99, helmet: 0, suit: 0 }, { body: "1", helmet: 0, suit: 0 }, { body: 0.5, helmet: 0, suit: 0 }];
    for (const choice of bad) {
      expect(room.setLook(id, choice), JSON.stringify(choice)).toBe(false);
    }
    expect(kartOf(room, id).look).toEqual({ body: 1, helmet: 1, suit: 1 });
  });

  it("says no for a player who is not in the room", () => {
    const room = createRoom(TEST_OVAL, TEST_DRIVER);
    expect(room.setLook(42, { body: 1, helmet: 1, suit: 1 })).toBe(false);
  });

  it("keeps its own copy: changing the object that was handed in changes nothing", () => {
    const room = createRoom(TEST_OVAL, TEST_DRIVER);
    const { id } = room.addPlayer();
    const mine = { body: 1, helmet: 1, suit: 1, extra: "dropped" };
    room.setLook(id, mine);
    mine.body = 9;
    expect(kartOf(room, id).look).toEqual({ body: 1, helmet: 1, suit: 1 });
    // And changing what the room hands out does not change what it keeps.
    kartOf(room, id).look.body = 7;
    expect(kartOf(room, id).look.body).toBe(1);
  });

  it("changes nothing but the picture: the same place on the grid, the same driving", () => {
    const plain = createRoom(TEST_OVAL, TEST_DRIVER);
    const painted = createRoom(TEST_OVAL, TEST_DRIVER);
    const a = plain.addPlayer().id;
    const b = painted.addPlayer().id;
    painted.setLook(b, { body: 9, helmet: 9, suit: 5 });
    for (const room of [plain, painted]) {
      room.setKeys(room === plain ? a : b, { gas: true, brake: false, left: false, right: true });
      for (let step = 0; step < 200; step++) {
        room.step();
      }
    }
    const { look, ...paintedKart } = kartOf(painted, b);
    expect(look).toEqual({ body: 9, helmet: 9, suit: 5 });
    expect(paintedKart).toEqual(kartOf(plain, a));
  });

  it("turns every choice the room can hold into colours the page can paint", () => {
    const room = createRoom(TEST_OVAL, TEST_DRIVER);
    const { id } = room.addPlayer();
    room.setLook(id, { body: 4, helmet: 8, suit: 2 });
    const look = lookFromChoice(kartOf(room, id).look);
    expect(look.body).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("colours over a live connection", () => {
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

  const stateWhere = (test) => (message) => message.type === "state" && test(message);

  it("shows one player's chosen colours to the other player", async () => {
    const ana = await connect();
    const rui = await connect();
    ana.send({ type: "look", body: 6, helmet: 2, suit: 1 });
    const update = await rui.next(stateWhere((state) => state.karts.find((kart) => kart.id === ana.id)?.look !== undefined));
    expect(update.karts.find((kart) => kart.id === ana.id).look).toEqual({ body: 6, helmet: 2, suit: 1 });
    expect("look" in update.karts.find((kart) => kart.id === rui.id)).toBe(false);
  });

  it("cannot be used to paint someone else's kart", async () => {
    const ana = await connect();
    const rui = await connect();
    // Rui names Ana's kart in every way he can think of.
    rui.send({ type: "look", body: 9, helmet: 9, suit: 5, id: ana.id, player: ana.id, kart: ana.id });
    const update = await ana.next(stateWhere((state) => state.karts.find((kart) => kart.id === rui.id)?.look !== undefined));
    expect(update.karts.find((kart) => kart.id === rui.id).look).toEqual({ body: 9, helmet: 9, suit: 5 }); // his own
    expect("look" in update.karts.find((kart) => kart.id === ana.id)).toBe(false);
  });

  it("sends a browser away for a choice of colours that is not allowed", async () => {
    for (const message of [
      { type: "look", body: 99, helmet: 0, suit: 0 },
      { type: "look", body: "#e23d3d", helmet: "#fff", suit: "#000" },
      { type: "look", body: "<script>alert(1)</script>", helmet: 0, suit: 0 },
      { type: "look" },
    ]) {
      const browser = await connect();
      browser.send(message);
      expect((await browser.closed).code, JSON.stringify(message)).toBe(BROKE_THE_RULES);
    }
    expect(online.room.playerCount()).toBe(0);
  });
});

describe("the banana peels the online page takes from an update", () => {
  it("takes where each one is", () => {
    const update = { type: "state", bananas: [{ id: 1, x: 100.5, y: 200 }, { id: 2, x: 300, y: 80.5 }] };
    expect(bananasOf(update)).toEqual([{ x: 100.5, y: 200 }, { x: 300, y: 80.5 }]);
  });

  it("gives none for an update without a list of them, such as one from an older server", () => {
    for (const update of [{ type: "state" }, { bananas: null }, { bananas: "three" }, { bananas: { 0: { x: 1, y: 1 } } }, null, undefined]) {
      expect(bananasOf(update)).toEqual([]);
    }
  });

  it("leaves out anything in the list that is not a spot on the track, and never breaks", () => {
    const update = {
      bananas: [{ x: 10, y: 20 }, null, "banana", { x: "10", y: 20 }, { x: NaN, y: 5 }, { x: Infinity, y: 5 }, { y: 5 }, 42, { x: 30, y: 40, extra: "<b>" }],
    };
    expect(bananasOf(update)).toEqual([{ x: 10, y: 20 }, { x: 30, y: 40 }]);
  });

  it("does not take an endless list", () => {
    const many = { bananas: Array.from({ length: 5000 }, (unused, i) => ({ x: i, y: i })) };
    expect(bananasOf(many).length).toBeLessThanOrEqual(60);
  });
});
