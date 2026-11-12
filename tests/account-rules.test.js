// Tests for shared/account-rules.js (the rules for user names and passwords)
// and client/account-api.js (how the pages ask the server about accounts).

import { describe, it, expect } from "vitest";
import {
  checkUsername,
  checkPassword,
  usernameKey,
  USERNAME_MIN,
  USERNAME_MAX,
  PASSWORD_MIN,
  PASSWORD_MAX,
} from "../shared/account-rules.js";
import { createAccountApi } from "../client/account-api.js";

describe("user names", () => {
  it("accepts 3 to 16 letters, digits and underscores", () => {
    for (const name of ["ana", "Catarina_44", "a_b", "X".repeat(USERNAME_MAX), "123", "___"]) {
      expect(checkUsername(name), name).toBe(null);
    }
    expect(USERNAME_MIN).toBe(3);
    expect(USERNAME_MAX).toBe(16);
  });

  it("refuses a name that is too short or too long, and says which", () => {
    expect(checkUsername("ab")).toContain("at least 3");
    expect(checkUsername("")).toContain("at least 3");
    expect(checkUsername("x".repeat(USERNAME_MAX + 1))).toContain("at most 16");
  });

  it("refuses spaces, accents, symbols and anything that could be code", () => {
    for (const name of ["ana maria", "joão", "ana!", "a-b-c", "<b>ana</b>", "ana'; DROP TABLE players;--", "ana\n", "😀😀😀"]) {
      expect(checkUsername(name), name).not.toBe(null);
    }
  });

  it("refuses anything that is not text", () => {
    for (const notText of [undefined, null, 12345, ["ana"], { name: "ana" }]) {
      expect(checkUsername(notText)).not.toBe(null);
    }
  });

  it("treats names that differ only in capitals as the same player", () => {
    expect(usernameKey("Ana")).toBe(usernameKey("ANA"));
    expect(usernameKey("Ana")).toBe("ana");
    expect(usernameKey("ana_1")).not.toBe(usernameKey("ana_2"));
  });
});

describe("passwords", () => {
  it("accepts 8 characters or more, of any kind", () => {
    for (const password of ["12345678", "correct horse battery", "ção ñ 😀 !!", "x".repeat(PASSWORD_MAX)]) {
      expect(checkPassword(password), password).toBe(null);
    }
    expect(PASSWORD_MIN).toBe(8);
  });

  it("refuses a password shorter than 8 characters", () => {
    expect(checkPassword("1234567")).toContain("at least 8");
    expect(checkPassword("")).toContain("at least 8");
  });

  it("refuses a giant password, so the server never has to work on one", () => {
    expect(checkPassword("x".repeat(PASSWORD_MAX + 1))).toContain("at most");
  });

  it("refuses anything that is not text", () => {
    for (const notText of [undefined, null, 12345678, ["12345678"], {}]) {
      expect(checkPassword(notText)).not.toBe(null);
    }
  });
});

describe("how the pages ask the server about accounts", () => {
  /** A pretend "fetch" that writes down what it was asked and gives a prepared answer. */
  function pretendServer(status, body) {
    const asked = [];
    const fetchFunction = async (address, options) => {
      asked.push({ address, ...options });
      return {
        status,
        json: async () => {
          if (body === "not json") {
            throw new SyntaxError("Unexpected token");
          }
          return body;
        },
      };
    };
    return { api: createAccountApi(fetchFunction), asked };
  }

  it("asks who is signed in, and gives a simple answer", async () => {
    const { api, asked } = pretendServer(200, { ok: true, signedIn: true, username: "Ana" });
    expect(await api.getMe()).toEqual({ available: true, signedIn: true, username: "Ana" });
    expect(asked[0].address).toBe("/api/me");
    expect(asked[0].method).toBe("GET");
  });

  it("says nobody is signed in when the server says so", async () => {
    const { api } = pretendServer(200, { ok: true, signedIn: false });
    expect(await api.getMe()).toEqual({ available: true, signedIn: false, username: null });
  });

  it("says accounts are not available when the server has no database", async () => {
    const { api } = pretendServer(503, { ok: false, code: "unavailable", message: "No database." });
    expect(await api.getMe()).toEqual({ available: false, signedIn: false, username: null });
  });

  it("sends the user name and password to sign up and to sign in, as our own format", async () => {
    const { api, asked } = pretendServer(200, { ok: true, username: "Ana" });
    await api.signUp("Ana", "12345678");
    await api.logIn("Ana", "12345678");
    expect(asked[0].address).toBe("/api/signup");
    expect(asked[1].address).toBe("/api/login");
    for (const question of asked) {
      expect(question.method).toBe("POST");
      expect(question.headers["Content-Type"]).toBe("application/json");
      expect(JSON.parse(question.body)).toEqual({ username: "Ana", password: "12345678" });
      expect(question.credentials).toBe("same-origin");
    }
  });

  it("never puts the password in the address", async () => {
    const { api, asked } = pretendServer(200, { ok: true });
    await api.signUp("Ana", "secret-password");
    await api.logIn("Ana", "secret-password");
    await api.deleteAccount("secret-password");
    for (const question of asked) {
      expect(question.address).not.toContain("secret-password");
    }
  });

  it("passes on the server's reason when it says no", async () => {
    const no = { ok: false, code: "username_taken", message: "Someone already has that user name." };
    const { api } = pretendServer(409, no);
    expect(await api.signUp("Ana", "12345678")).toEqual(no);
  });

  it("asks for the leaderboard of one track, with the track's name made safe for an address", async () => {
    const board = { ok: true, track: "campus-loop", races: [], laps: [], mine: null };
    const { api, asked } = pretendServer(200, board);
    expect(await api.getLeaderboard("campus-loop")).toEqual(board);
    expect(asked[0].address).toBe("/api/leaderboard?track=campus-loop");
    await api.getLeaderboard("a b&c=d");
    expect(asked[1].address).toBe("/api/leaderboard?track=a%20b%26c%3Dd");
  });

  it("gives a calm answer when the server cannot be reached at all", async () => {
    const api = createAccountApi(async () => {
      throw new TypeError("Failed to fetch");
    });
    const answer = await api.logIn("Ana", "12345678");
    expect(answer.ok).toBe(false);
    expect(answer.code).toBe("offline");
    expect(await api.getMe()).toEqual({ available: false, signedIn: false, username: null });
  });

  it("gives a calm answer when the server sends something that is not in our format", async () => {
    for (const strange of ["not json", null, "hello", 42, { no: "ok field" }, { ok: "yes" }]) {
      const { api } = pretendServer(200, strange);
      const answer = await api.getLeaderboard("campus-loop");
      expect(answer.ok).toBe(false);
      expect(answer.code).toBe("unavailable");
    }
  });
});
