// Tests for server/start-pretend.js: the game on a laptop with pretend
// accounts kept in memory ("npm run start:pretend").
//
// The test starts it the way the command does, as a program of its own,
// talks to it like a browser, and stops it again.

import { describe, it, expect, afterEach } from "vitest";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_FOLDER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let running = null;

afterEach(() => {
  running?.kill();
  running = null;
});

/** A port number nobody is using right now. */
function freePort() {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

/**
 * Starts the program and waits until it says it is running.
 * "settings" are extra settings from outside the code, as a ".env" file or Render would give them.
 */
async function start(settings = {}) {
  const port = await freePort();
  running = spawn(process.execPath, ["server/start-pretend.js"], {
    cwd: PROJECT_FOLDER,
    env: { ...process.env, ...settings, PORT: String(port) },
  });
  let said = "";
  await new Promise((resolve, reject) => {
    const giveUp = setTimeout(() => reject(new Error(`It did not start. It said: ${said}`)), 10_000);
    const listen = (piece) => {
      said += piece;
      if (said.includes("The server is running")) {
        clearTimeout(giveUp);
        resolve();
      }
    };
    running.stdout.on("data", listen);
    running.stderr.on("data", listen);
    running.on("exit", () => reject(new Error(`It stopped. It said: ${said}`)));
  });
  return { base: `http://127.0.0.1:${port}`, said: () => said };
}

describe("the game with pretend accounts", () => {
  it("lets a player sign up, stay signed in and read a leaderboard, without any database", async () => {
    const { base, said } = await start({ DATABASE_URL: "" });
    expect(said()).toContain("PRETEND accounts");

    const signUp = await fetch(`${base}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "Ana", password: "12345678" }),
    });
    expect(signUp.status).toBe(201);
    const cookie = signUp.headers.get("set-cookie").split(";")[0];

    const me = await (await fetch(`${base}/api/me`, { headers: { Cookie: cookie } })).json();
    expect(me).toEqual({ ok: true, signedIn: true, username: "Ana" });

    const board = await (await fetch(`${base}/api/leaderboard?track=campus-loop`)).json();
    expect(board).toEqual({ ok: true, track: "campus-loop", races: [], laps: [], mine: null });

    expect((await fetch(`${base}/`)).status).toBe(200); // and the game itself is there
  }, 20_000);

  it("never uses the real database, even when its address is set", async () => {
    // An address that cannot work. If the program tried to use it, signing up would fail.
    const { base, said } = await start({ DATABASE_URL: "postgres://nobody:nothing@127.0.0.1:1/none" });
    const signUp = await fetch(`${base}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "Ana", password: "12345678" }),
    });
    expect(signUp.status).toBe(201);
    expect(said()).not.toContain("Database");
  }, 20_000);

  it("forgets everything when it is stopped and started again", async () => {
    const first = await start();
    await fetch(`${first.base}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "Ana", password: "12345678" }),
    });
    running.kill();

    const second = await start();
    const login = await fetch(`${second.base}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "Ana", password: "12345678" }),
    });
    expect(login.status).toBe(401);
  }, 30_000);

  it("only listens on this laptop, whatever the HOST setting says", async () => {
    const { base } = await start({ HOST: "0.0.0.0" });
    expect((await fetch(`${base}/health`)).status).toBe(200);
    // The same port on this computer's address on the network must not answer.
    const port = Number(new URL(base).port);
    const addresses = Object.values((await import("node:os")).networkInterfaces())
      .flat()
      .filter((each) => each.family === "IPv4" && !each.internal)
      .map((each) => each.address);
    for (const address of addresses) {
      const reached = await new Promise((resolve) => {
        const socket = net.connect({ host: address, port, timeout: 1500 });
        socket.on("connect", () => {
          socket.destroy();
          resolve(true);
        });
        socket.on("error", () => resolve(false));
        socket.on("timeout", () => {
          socket.destroy();
          resolve(false);
        });
      });
      expect(reached, address).toBe(false);
    }
  }, 20_000);
});
