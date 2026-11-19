// Tests for full screen: client/full-screen.js and the F key in client/keyboard.js.
// There is no real browser here, so the document, the play area, the button
// and the window are pretend ones that write down what was asked of them.

import { describe, it, expect } from "vitest";
import { canGoFullScreen, isFullScreen, fullScreenLabel, toggleFullScreen, setUpFullScreen } from "../client/full-screen.js";
import { createKeyboard } from "../client/keyboard.js";

/** Something that can be listened to, like a window or a button: send(type, event) plays an event. */
function listenable(extra = {}) {
  const listeners = {};
  return {
    ...extra,
    addEventListener(type, listener) {
      (listeners[type] ??= []).push(listener);
    },
    send(type, event = {}) {
      for (const listener of listeners[type] ?? []) {
        listener(event);
      }
    },
  };
}

/** A pretend browser with the Fullscreen API. "full" says what is on the whole screen now. */
function pretendBrowser({ enabled = true, refuse = false } = {}) {
  const asked = [];
  const document = listenable({
    fullscreenEnabled: enabled,
    fullscreenElement: null,
    exitFullscreen() {
      asked.push("leave");
      document.fullscreenElement = null;
      document.send("fullscreenchange");
      return Promise.resolve();
    },
  });
  const area = {
    requestFullscreen() {
      asked.push("enter");
      if (refuse) {
        return Promise.reject(new Error("not allowed here"));
      }
      document.fullscreenElement = area;
      document.send("fullscreenchange");
      return Promise.resolve();
    },
  };
  const button = listenable({
    hidden: true,
    textContent: "",
    blurred: 0,
    blur() {
      this.blurred++;
    },
  });
  return { document, area, button, asked };
}

describe("whether full screen can be used", () => {
  it("follows what the browser says, also in older Safari", () => {
    expect(canGoFullScreen({ fullscreenEnabled: true })).toBe(true);
    expect(canGoFullScreen({ webkitFullscreenEnabled: true })).toBe(true);
    expect(canGoFullScreen({ fullscreenEnabled: false })).toBe(false);
    expect(canGoFullScreen({})).toBe(false);
  });

  it("knows whether something is on the whole screen", () => {
    expect(isFullScreen({ fullscreenElement: null })).toBe(false);
    expect(isFullScreen({})).toBe(false);
    expect(isFullScreen({ fullscreenElement: {} })).toBe(true);
    expect(isFullScreen({ webkitFullscreenElement: {} })).toBe(true);
  });

  it("puts on the button what pressing it will do", () => {
    expect(fullScreenLabel(false)).toBe("Full screen");
    expect(fullScreenLabel(true)).toBe("Leave full screen");
  });
});

describe("switching full screen on and off", () => {
  it("puts the play area on the whole screen, then takes it off", async () => {
    const { document, area, asked } = pretendBrowser();
    await toggleFullScreen(document, area);
    expect(document.fullscreenElement).toBe(area);
    await toggleFullScreen(document, area);
    expect(document.fullscreenElement).toBe(null);
    expect(asked).toEqual(["enter", "leave"]);
  });

  it("uses the older Safari names when the new ones are missing", async () => {
    const asked = [];
    const document = { webkitFullscreenEnabled: true, webkitFullscreenElement: null, webkitExitFullscreen: () => asked.push("leave") };
    const area = { webkitRequestFullscreen: () => asked.push("enter") };
    await toggleFullScreen(document, area);
    document.webkitFullscreenElement = area;
    await toggleFullScreen(document, area);
    expect(asked).toEqual(["enter", "leave"]);
  });

  it("breaks nothing when the browser says no, throws, or cannot do it at all", async () => {
    const { document, area } = pretendBrowser({ refuse: true });
    await expect(toggleFullScreen(document, area)).resolves.toBe(undefined);
    expect(document.fullscreenElement).toBe(null);
    const throwing = { requestFullscreen: () => { throw new Error("old browser"); } };
    await expect(toggleFullScreen({}, throwing)).resolves.toBe(undefined);
    await expect(toggleFullScreen({}, {})).resolves.toBe(undefined);
  });
});

describe("the full screen button", () => {
  it("is hidden in a browser that cannot do full screen, and then does nothing", async () => {
    const { document, area, button, asked } = pretendBrowser({ enabled: false });
    button.hidden = false; // shown at first, so the test sees it being hidden
    const fullScreen = setUpFullScreen(document, area, button);
    expect(button.hidden).toBe(true);
    await fullScreen.toggle();
    button.send("click");
    expect(asked).toEqual([]);
  });

  it("is shown, says Full screen, and switches it on when pressed, giving the keys back to driving", () => {
    const { document, area, button } = pretendBrowser();
    setUpFullScreen(document, area, button);
    expect(button.hidden).toBe(false);
    expect(button.textContent).toBe("Full screen");
    button.send("click");
    expect(document.fullscreenElement).toBe(area);
    expect(button.blurred).toBe(1);
  });

  it("changes its words whatever switched full screen: the button, F, or Esc", async () => {
    const { document, area, button } = pretendBrowser();
    const fullScreen = setUpFullScreen(document, area, button);
    await fullScreen.toggle(); // F
    expect(button.textContent).toBe("Leave full screen");
    // Esc: the browser leaves full screen by itself, and says so.
    document.fullscreenElement = null;
    document.send("fullscreenchange");
    expect(button.textContent).toBe("Full screen");
  });
});

describe("the F key", () => {
  const press = (window, key, more = {}) => window.send("keydown", { key, repeat: false, preventDefault() {}, ...more });

  it("switches full screen, in small or capital letters", () => {
    const window = listenable();
    let times = 0;
    createKeyboard(window, { onFullScreen: () => times++ });
    press(window, "f");
    press(window, "F");
    expect(times).toBe(2);
  });

  it("does not switch it again while held down", () => {
    const window = listenable();
    let times = 0;
    createKeyboard(window, { onFullScreen: () => times++ });
    press(window, "f");
    press(window, "f", { repeat: true });
    expect(times).toBe(1);
  });

  it("leaves Ctrl+F, Cmd+F and Alt+F to the browser", () => {
    const window = listenable();
    let times = 0;
    createKeyboard(window, { onFullScreen: () => times++ });
    press(window, "f", { ctrlKey: true });
    press(window, "f", { metaKey: true });
    press(window, "F", { altKey: true });
    expect(times).toBe(0);
  });

  it("is not a driving key, and no other key switches full screen", () => {
    const window = listenable();
    let times = 0;
    const keyboard = createKeyboard(window, { onFullScreen: () => times++ });
    press(window, "f");
    expect(keyboard.input()).toEqual({ gas: false, brake: false, left: false, right: false });
    for (const key of ["r", "v", "m", "Enter", "ArrowUp", "g", "Escape"]) {
      press(window, key);
    }
    expect(times).toBe(1);
  });

  it("does nothing on a page that does not ask for it", () => {
    const window = listenable();
    createKeyboard(window, {});
    expect(() => press(window, "f")).not.toThrow();
  });
});
