// Tests for the computer karts switch: the message a browser may send
// (server/messages.js) and the tick box of the online page (client/computers-switch.js).

import { describe, it, expect } from "vitest";
import { readClientMessage } from "../server/messages.js";
import { computersSwitch, namesWithComputers } from "../client/computers-switch.js";

describe("the computer karts message", () => {
  it("lets through an exact true or false", () => {
    expect(readClientMessage('{"type":"computers","on":true}')).toEqual({ type: "computers", on: true });
    expect(readClientMessage('{"type":"computers","on":false}')).toEqual({ type: "computers", on: false });
  });

  it("refuses anything else: no answer, a word, a number, null", () => {
    for (const text of [
      '{"type":"computers"}',
      '{"type":"computers","on":"true"}',
      '{"type":"computers","on":1}',
      '{"type":"computers","on":null}',
    ]) {
      expect(readClientMessage(text), text).toBe(null);
    }
  });

  it("drops anything extra, such as how many computer karts or which characters", () => {
    expect(readClientMessage('{"type":"computers","on":true,"count":7,"characters":["pcp"]}')).toEqual({
      type: "computers",
      on: true,
    });
  });
});

describe("the tick box", () => {
  const OPEN = { phase: "open", countdownSteps: 0, host: 1, watching: [] };
  const RACING = { ...OPEN, phase: "racing" };
  const FINISHED = { ...OPEN, phase: "finished" };
  const update = (on, karts = []) => ({ type: "state", computers: { on, karts } });

  it("is hidden when the server says nothing about computer karts", () => {
    expect(computersSwitch(null, OPEN, 1).shown).toBe(false);
    expect(computersSwitch({ type: "state" }, OPEN, 1).shown).toBe(false);
  });

  it("is hidden when what the server says is not usable", () => {
    for (const computers of [{ on: "yes", karts: [] }, { on: true }, { on: true, karts: ["a"] }, null]) {
      expect(computersSwitch({ computers }, OPEN, 1).shown).toBe(false);
    }
  });

  it("shows what the server says, ticked or not", () => {
    expect(computersSwitch(update(true), OPEN, 1)).toMatchObject({ shown: true, on: true });
    expect(computersSwitch(update(false), OPEN, 1)).toMatchObject({ shown: true, on: false });
  });

  it("can be used by the host while no race is on", () => {
    expect(computersSwitch(update(true), OPEN, 1).canUse).toBe(true);
    expect(computersSwitch(update(true), FINISHED, 1).canUse).toBe(true);
  });

  it("cannot be used by anyone else, or by the host during a race", () => {
    expect(computersSwitch(update(true), OPEN, 2).canUse).toBe(false);
    expect(computersSwitch(update(true), OPEN, null).canUse).toBe(false);
    expect(computersSwitch(update(true), RACING, 1).canUse).toBe(false);
    expect(computersSwitch(update(true), { ...OPEN, phase: "countdown" }, 1).canUse).toBe(false);
  });

  it("says how many computer karts are in the race", () => {
    expect(computersSwitch(update(true, [4, 5, 6]), RACING, 2).text).toBe("3 computer karts in this race.");
    expect(computersSwitch(update(true, [4]), RACING, 2).text).toBe("1 computer kart in this race.");
    expect(computersSwitch(update(true), OPEN, 2).text).toBe("Only the host can switch this.");
    expect(computersSwitch(update(true), OPEN, 1).text).toBe("You are the host: you can switch this.");
  });
});

describe("the names of computer karts on the page", () => {
  const update = {
    computers: { on: true, karts: [4, 5] },
    karts: [
      { id: 1, character: "ro" },
      { id: 4, character: "dean" },
      { id: 5 },
    ],
  };

  it("are their character's name with (computer), or just Computer kart", () => {
    const names = namesWithComputers(new Map([[1, "Ana"]]), update);
    expect(names.get(4)).toBe("Dean (computer)");
    expect(names.get(5)).toBe("Computer kart (computer)");
  });

  it("leave the names of people as they are, and change nothing given", () => {
    const people = new Map([[1, "Ana"]]);
    const names = namesWithComputers(people, update);
    expect(names.get(1)).toBe("Ana");
    expect(people.size).toBe(1);
  });

  it("are none when the server says nothing about computer karts", () => {
    expect([...namesWithComputers(new Map([[1, "Ana"]]), null)]).toEqual([[1, "Ana"]]);
    expect([...namesWithComputers(new Map(), { karts: [{ id: 4, character: "dean" }] })]).toEqual([]);
  });

  it("never name a person as a computer kart", () => {
    const names = namesWithComputers(new Map(), update);
    expect(names.has(1)).toBe(false);
  });
});
