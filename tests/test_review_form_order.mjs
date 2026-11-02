import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const html = readFileSync(new URL("../review/index.html", import.meta.url), "utf8");
const markers = ['data-i18n="certLegend"', 'data-i18n="rating"', 'for="comment"', 'data-i18n="booksLegend"', 'data-i18n="periodLegend"', 'for="visibility"', 'for="email"', 'id="consent"'];
for (let i = 1; i < markers.length; i++) {
  assert.ok(html.indexOf(markers[i-1]) >= 0 && html.indexOf(markers[i-1]) < html.indexOf(markers[i]), `${markers[i-1]} must precede ${markers[i]}`);
}
assert.match(html, /id="books-section"/);
console.log("PASS: participant form order and distinct books section");
