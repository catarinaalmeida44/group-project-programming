// Full screen: the game fills the whole screen, not just a box on the page.
//
// What goes full screen is the "play area" of a race page: the numbers above
// the track (lap, time, place) and the picture with everything shown on top
// of it (messages, results). The picture keeps its shape: it grows until it
// touches the edges of the screen, and the rest is dark (style.css).
//
// The browser does the actual work (its "Fullscreen API"). This file only
// asks for it, and keeps the button's words right. It works with whatever
// "document" and play area it is given, so it is tested with pretend ones
// (tests/full-screen.test.js). Safari before 2023 uses older names that
// start with "webkit"; those are tried too.
//
// The F key and the button switch it on and off. Esc always leaves full
// screen: the browser does that by itself, and the button follows.

/** Can this browser put the play area on the whole screen? */
export function canGoFullScreen(document) {
  return document.fullscreenEnabled === true || document.webkitFullscreenEnabled === true;
}

/** Is something on the whole screen right now? */
export function isFullScreen(document) {
  return (document.fullscreenElement ?? document.webkitFullscreenElement ?? null) !== null;
}

/** The words on the button: what pressing it will do. */
export function fullScreenLabel(full) {
  return full ? "Leave full screen" : "Full screen";
}

/**
 * Puts the play area on the whole screen, or takes it off if it is on.
 * The browser may say no (for example when the page is inside another page
 * that does not allow it): then nothing changes and nothing breaks.
 */
export function toggleFullScreen(document, area) {
  try {
    if (isFullScreen(document)) {
      const leave = document.exitFullscreen ?? document.webkitExitFullscreen;
      return Promise.resolve(leave?.call(document)).catch(() => {});
    }
    const enter = area.requestFullscreen ?? area.webkitRequestFullscreen;
    return Promise.resolve(enter?.call(area)).catch(() => {});
  } catch {
    return Promise.resolve(); // an older browser that throws instead of saying no
  }
}

/**
 * Sets up the full screen button of a race page. The button is hidden in a
 * browser that cannot do it. Gives back toggle(), for the F key.
 */
export function setUpFullScreen(document, area, button) {
  if (!canGoFullScreen(document)) {
    button.hidden = true;
    return { toggle: () => Promise.resolve() };
  }
  const showLabel = () => {
    button.textContent = fullScreenLabel(isFullScreen(document));
  };
  const toggle = () => toggleFullScreen(document, area);
  button.hidden = false;
  showLabel();
  button.addEventListener("click", () => {
    toggle();
    button.blur(); // so Space and the arrow keys go back to driving
  });
  // Esc, F or the button: whatever changed it, the words follow.
  document.addEventListener("fullscreenchange", showLabel);
  document.addEventListener("webkitfullscreenchange", showLabel);
  return { toggle };
}
