// Who is which character in one online room.
//
// A player can be one of the characters of shared/cast.js. A character
// belongs to one player in the room at a time, and is free again when that
// player leaves. Being a character only changes the colours of the kart:
// online.js passes the character's colours to the room (room.setLook), and
// adds each player's character to the updates it sends.
//
// Why this is not inside room.js: the room moves the karts, and a test
// (room-bananas.test.js) checks the exact list of things the room can be
// asked to do, so that nothing new can slip in that touches the bananas.
// Characters have nothing to do with driving, so they are kept here, apart.
//
// Like room.js, this file knows nothing about the internet, so it is tested
// without any network.

import { characterById, firstFreeCharacter } from "../shared/cast.js";

/**
 * May this player of this room change character now? Not while they are
 * racing, from the countdown to the end of the race: a kart must not change
 * colours in the middle of a race. Someone who is watching may: they join
 * the next race as their new character.
 */
export function mayChangeCharacter(room, id) {
  const phase = room.phase();
  if (phase !== "countdown" && phase !== "racing") {
    return true;
  }
  return room.snapshot().race.watching.includes(id);
}

/** Makes an empty list of who is which character, for one room. */
export function createCastKeeper() {
  const chosen = new Map(); // player number -> character id

  function takenBySomeoneElse(id, characterId) {
    return [...chosen].some(([other, taken]) => other !== id && taken === characterId);
  }

  return {
    /**
     * Makes a player a character. Gives that character (with its colours),
     * or null, changing nothing, if there is no such character, if someone
     * else in the room already is it, or if "mayChange" is false (see
     * mayChangeCharacter). Asking again for the character you already are
     * gives it again.
     */
    choose(id, characterId, mayChange) {
      const character = characterById(characterId);
      if (character === null || !mayChange || takenBySomeoneElse(id, character.id)) {
        return null;
      }
      chosen.set(id, character.id);
      return character;
    },

    /**
     * For a player whose chosen character was taken: makes them the first
     * character nobody in the room is, and gives it. Gives null if every
     * character is taken (their kart then keeps the colours of its place)
     * or if "mayChange" is false. A player who already is a character keeps it.
     */
    giveFree(id, mayChange) {
      if (chosen.has(id)) {
        return characterById(chosen.get(id));
      }
      if (!mayChange) {
        return null;
      }
      const free = firstFreeCharacter(chosen.values());
      if (free !== null) {
        chosen.set(id, free.id);
      }
      return free;
    },

    /** The id of the character this player is, or undefined if they are none. */
    characterOf(id) {
      return chosen.get(id);
    },

    /** Forgets a player who left the room. Their character is free again. */
    forget(id) {
      chosen.delete(id);
    },

    /**
     * An update of the room (room.snapshot()) with each kart's character
     * added to it, for the karts whose player is one. The update given is
     * not changed: a new one is made.
     */
    dress(update) {
      return {
        ...update,
        karts: update.karts.map((kart) => (chosen.has(kart.id) ? { ...kart, character: chosen.get(kart.id) } : kart)),
      };
    },
  };
}
