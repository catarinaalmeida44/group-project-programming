// What the online page does when the player leaves it, and when the browser
// brings it back with the Back or Forward button.
//
// The problem it solves (17 Nov 2026): a player left the online page for the
// menu, came back, and found their kart twice on the track, then three times.
//
// Browsers can keep a page you left in memory, the "back/forward cache", so
// that Back shows it again instantly without loading it. A page kept there
// may keep its live connection to our server, and the browser may even go
// on answering the server's still-there check. The server then sees a player
// who is still connected, and keeps their kart: a ghost. Coming back adds a
// second kart for the same person.
//
// So the page says goodbye itself:
//   - "pagehide": the browser is about to hide the page, because the player
//     clicked a link, pressed Back, or closed the tab. We close the
//     connection, so the server removes the kart at once.
//   - "pageshow" with "persisted": the page was brought back from that cache.
//     Its connection is closed, so it is reloaded and joins again as one
//     fresh player.

/** The code for "closed normally, on purpose" in a live connection. */
export const LEFT_THE_PAGE = 1000;

/**
 * Sets this up for one page.
 *   page        the browser window (or a stand-in, in the tests)
 *   connection  the page's live connection to the server
 *   reload      what to do when the page comes back from the cache
 */
export function closeWhenLeft(page, connection, reload) {
  page.addEventListener("pagehide", () => {
    // Closing a connection that is already closed does nothing, so this is
    // safe whatever state the connection is in.
    connection.close(LEFT_THE_PAGE, "left the page");
  });
  page.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      reload();
    }
  });
}
