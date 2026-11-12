// Making new parts of the page from code, safely.
//
// Names and times that come from the server or from the browser's storage
// could contain anything, including text that looks like HTML (the language
// pages are written in). Here text is always put in as plain text, with
// "textContent". Text put in that way is only ever shown: it can never
// become a part of the page or run as code.

/**
 * Makes one new part of the page, such as <span class="row-name">Ana</span>.
 *   page       the page to make it for (the browser's "document")
 *   tag        the kind of part: "span", "li", "button", ...
 *   className  how it should look (see style.css), or "" for nothing special
 *   text       the text inside it, shown exactly as it is
 * The part is not on the page yet: whoever asked for it puts it there.
 */
export function makePart(page, tag, className = "", text = "") {
  const part = page.createElement(tag);
  if (className !== "") {
    part.className = className;
  }
  part.textContent = String(text);
  return part;
}
