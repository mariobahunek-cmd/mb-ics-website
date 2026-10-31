// Owner UX corrections 2026-10-31 — bundled candidate acceptance tests.
// Covers: (1) two evidence groups + no third website-feedback section,
// (2) no repetitive "(optional)"/"Optional," labels, (3) Foundation-cert
// gated books, (4) name mode 'Vorname oder Initialen' as initial+reset
// default with immediately visible empty input, (5) MM/SD mappings intact,
// (6) compact mobile cookie banner that stays fully operable.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ROOT = new URL('..', import.meta.url);
const read = (p) => readFile(new URL(p, ROOT), 'utf8');

const i18n = JSON.parse(await read('_data/i18n_home.json'));
const home = await read('_includes/home.html');
const reviewHtml = await read('review/index.html');
const reviewsJs = await read('reviews.js');
const css = await read('style.css');

// ── 1. Two coherent evidence groups, third section removed ──────────────
for (const lang of ['de', 'en', 'es']) {
  const t = i18n[lang];
  assert.ok(t['metrics.sourceNoteShort'].includes('COMCAVE'), `${lang}: metrics keep COMCAVE provenance line`);
  const title = t['testimonials.title'];
  const ok = { de: 'teilnehmenden', en: 'participants say', es: 'participantes' };
  assert.ok(title.toLowerCase().includes(ok[lang]), `${lang}: understandable personal-review heading, got "${title}"`);
  assert.ok(!/Website-Feedback|website feedback|feedback de la web|eigene Skala|its own 1–5/i.test(title), `${lang}: no website-feedback own-scale heading`);
}
assert.ok(!home.includes('id="website-feedback"'), 'standalone #website-feedback section must be gone');
assert.ok(!/Direktes Website-Feedback|eigene Skala|its own 1–5 scale/i.test(home), 'no own-scale section copy left in home.html');
// Native direct reviews render INSIDE the #testimonials section, coherently.
const testimonialsStart = home.indexOf('id="testimonials"');
const testimonialsEnd = home.indexOf('</section>', testimonialsStart);
const testimonialsBlock = home.slice(testimonialsStart, testimonialsEnd);
assert.ok(testimonialsBlock.includes('data-trust-reviews'), 'native direct reviews integrated into #testimonials');
const trustOccurrences = (home.match(/data-trust-reviews/g) || []).length;
assert.equal(trustOccurrences, 1, 'exactly one native-reviews container');
// Exactly one review-submission CTA in the contiguous recommendations area.
const writeCtas = (testimonialsBlock.match(/href="[^"]*\/review\/\?lang=/g) || []).length;
assert.equal(writeCtas, 1, 'exactly one review-submission CTA inside #testimonials');
assert.ok(testimonialsBlock.includes('/reviews/methodology/'), 'methodology link stays secondary in the same section');

// trust-reviews.js must hide the native block when empty (no empty-state announcement)
const trustReviewsJs = await read('trust-reviews.js');
assert.ok(/hidden\s*=\s*true|\.hidden = true/.test(trustReviewsJs), 'empty native dataset hides the block instead of announcing emptiness');
assert.ok(!/t\.empty/.test(trustReviewsJs), 'no "no reviews yet" empty-state message in the recommendations section');

// ── 2. Voluntary fields without repetitive optional labels ──────────────
const i18nModule = await read('reviews-i18n.js');
const translations = (await import(new URL('reviews-i18n.js', ROOT))).translations;
const optionalish = /\(optional\)|\(opcional\)|^Optional,|^Opcional,|^Optional:|^Opcional:|^Opcional:/;
for (const lang of ['en', 'de', 'es']) {
  const t = translations[lang];
  for (const key of ['comment', 'periodLegend', 'periodHint', 'certLegend', 'certHint', 'booksLegend', 'booksHint', 'linkedinTitle']) {
    assert.ok(!optionalish.test(t[key]), `${lang}.${key} must not carry repetitive optional markers: "${t[key]}"`);
  }
}
// HTML defaults match (they render before JS replaces them).
for (const legend of ['periodLegend', 'certLegend', 'booksLegend']) {
  const m = reviewHtml.match(new RegExp(`data-i18n="${legend}"[^>]*>([^<]+)<`));
  assert.ok(m && !optionalish.test(m[1]), `review/index.html default for ${legend} must not say optional: ${m && m[1]}`);
}

// ── 3. Foundation books gated on the Foundation CERTIFICATION checkbox ──
const { bookOptionsForAreas, certOptionsForAreas, FOUNDATION_CERT, FOUNDATION_BOOKS } =
  await import(new URL('course-options.js', ROOT));
assert.equal(FOUNDATION_CERT, 'UC_FL_S420XX_DE');
assert.deepEqual(FOUNDATION_BOOKS, ['S4H00', 'S4H02']);
assert.deepEqual(certOptionsForAreas([]), ['UC_FL_S420XX_DE'], 'Foundation cert available with no area');
assert.ok(!bookOptionsForAreas([], false).includes('S4H00'), 'no Foundation book without the Foundation cert');
assert.ok(!bookOptionsForAreas(['basics'], false).includes('S4H02'), 'basics AREA alone does not show Foundation books');
assert.deepEqual(bookOptionsForAreas([], true), ['S4H00', 'S4H02']);
assert.deepEqual(bookOptionsForAreas(['basics'], true), ['S4H00', 'S4H02']);
const mmNoF = bookOptionsForAreas(['MM'], false);
assert.ok(mmNoF.includes('S4500') && !mmNoF.includes('S4H00'), 'MM books without Foundation cert: area books only');
assert.ok(bookOptionsForAreas(['MM'], true).includes('S4H00'), 'Foundation cert adds Foundation books for MM');
// MM/SD mapping incl. both consultant certs preserved.
assert.deepEqual(certOptionsForAreas(['MM']), ['UC_FL_S420XX_DE', 'UC_MM_S42023_DE', 'C_TS452']);
assert.deepEqual(certOptionsForAreas(['SD']), ['UC_FL_S420XX_DE', 'UC_SD_S42022_DE', 'C_TS462']);
// union in canonical inventory order
assert.deepEqual(certOptionsForAreas(['MM', 'SD']), ['UC_FL_S420XX_DE', 'UC_MM_S42023_DE', 'UC_SD_S42022_DE', 'C_TS452', 'C_TS462']);
// Submit path filters books by the actually selected certs (hidden checked never sent).
assert.match(reviewsJs, /bookOptionsForAreas\(\s*areas,\s*[^)]*includes\(FOUNDATION_CERT\)/, 'submit filter passes Foundation-cert state');
// Cert changes re-render the book list.
assert.match(reviewsJs, /cert-options[^]*?addEventListener\("change"/, 'certification selection drives book visibility');

// ── 4. Name mode: 'First name or initials' initial + reset, input visible ─
assert.match(reviewHtml, /<option value="named"[^>]*selected/, 'named is the selected initial mode');
assert.ok(!/<div id="name-field" hidden>/.test(reviewHtml), 'name input visible immediately');
assert.ok(/<option value="anonymous"/.test(reviewHtml), 'Anonymous stays available');
assert.match(reviewsJs, /addEventListener\("reset"/, 'reset restores the default name mode');

// ── 6. Compact, fully operable mobile cookie banner ──────────────────────
assert.match(css, /\.cookie-banner__inner\s*\{[^}]*max-height/s, 'cookie banner gets a bounded height');
assert.ok(css.includes('.cookie-banner__text { font-size: 0.85rem; }'), 'small-viewport cookie compaction exists');

console.log('test_owner_ux_20261031: all assertions passed');
