// Owner corrections 2026-10-31 (batch B) — RED-first acceptance tests.
// Covers: (1) certification-prep-first paths section without
// white-label/co-delivery/R2R phrasing and without the unevidenced
// "SD expanding through 2026" claim; (2) de-cluttered metrics block with one
// heading, nachgeordnete collapsible methodology, big visible original-
// evaluation download button (JPG, never PDF), localized decimal commas;
// (3) removed ProvenExpert disclaimer line under the recommendation buttons;
// (4) short character-limit-only hint under the review free-text field;
// (5) course options: full catalogue without an area selection (Foundation
// cert -> S4H00/S4H02 rule preserved), one shared multi-select hint; and
// (6) name-mode-dynamic consent label with re-confirmation on mode switch.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ROOT = new URL('..', import.meta.url);
const read = (p) => readFile(new URL(p, ROOT), 'utf8');

const i18n = JSON.parse(await read('_data/i18n_home.json'));
const home = await read('_includes/home.html');
const mainJs = await read('main.js');
const reviewHtml = await read('review/index.html');
const reviewsJs = await read('reviews.js');
const { translations } = await import(new URL('reviews-i18n.js', ROOT));
const {
  CERT_INVENTORY,
  BOOK_INVENTORY,
  certOptionsForAreas,
  bookOptionsForAreas,
} = await import(new URL('course-options.js', ROOT));

// Package 04 supersedes only the old acquisition/metrics expectations below:
// accepted package-03 facts plus explicit three-buyer-path scope. Review checks
// in sections 3–6 remain byte-for-byte unchanged.
for (const lang of ['de', 'en', 'es']) {
  const t = i18n[lang];
  for (const key of ['company.title', 'education.title', 'partner.title', 'paths.participants']) assert.ok(t[key], `${lang}.${key}`);
  // Owner order 2026-11-04: SAP trainer credential (Train-the-Trainer, SAP Certified Instructor)
  // and MM & SD positioning restored; only Official/Authorized-SAP partner claims stay forbidden.
  assert.ok(!/official|authorized|autorisiert|autorizado/i.test(t['hero.badge'] + t['paths.primaryDesc']));
  assert.ok(/SAP Certified Instructor|Instructor SAP Certificado/i.test(t['hero.badge']));
  assert.ok(/MM/.test(t['hero.title2']) && /SD/.test(t['hero.title2']));
  assert.ok(t['evidence.feedback'].includes('COMCAVE'));
  assert.ok(t['evidence.feedback'].includes('n=107'));
  assert.ok(/1[.,]07/.test(t['evidence.feedback']));
  assert.ok(t['metrics.originalLink'].includes('PNG'));
}
const pathsBlock = home.slice(home.indexOf('id="paths"'), home.indexOf('</section>', home.indexOf('id="paths"')));
assert.ok(pathsBlock.includes("'company,education,partner'"));
assert.ok(pathsBlock.includes('href="#training"'), 'participant route retained below the buyer paths');
const metricsBlock = home.slice(home.indexOf('id="metrics"'), home.indexOf('</section>', home.indexOf('id="metrics"')));
assert.equal((metricsBlock.match(/section-title/g)||[]).length, 1);
assert.ok(!/data-target|metric-card__bar/.test(metricsBlock), 'no animated evidence counters or percentage bars');
assert.ok(metricsBlock.includes('/assets/original/comcave-provided-20260625.png'));
assert.ok(metricsBlock.includes('download'), 'original remains downloadable');
assert.ok(metricsBlock.includes('profile_path'), 'qualified full profile evidence stays one click away');

// ── 3. ProvenExpert disclaimer line under the buttons removed ──────────
assert.ok(!home.includes('testimonials__sources'), 'testimonials sources line removed');
for (const gone of ['kein Unabhängigkeitssiegel', 'not an independence badge', 'no sello de independencia']) {
  assert.ok(!home.includes(gone), `disclaimer fragment still present: ${gone}`);
}

// ── 4. Review free-text hint: character limit only ──────────────────────
assert.equal(translations.de.commentHint, 'Maximal 3.000 Zeichen.');
assert.equal(translations.en.commentHint, 'Up to 3,000 characters.');
assert.equal(translations.es.commentHint, 'Máximo 3.000 caracteres.');
const hintMatch = reviewHtml.match(/id="comment-hint"[^>]*>([\s\S]*?)<\/p>/);
assert.ok(hintMatch, 'comment hint present');
assert.ok(!/sensitive|biometric|religion|political|trade-union|Gesundheit|Religion|politisch|Gewerkschaft|biometrisch|salud|religión|sindical/i.test(hintMatch[1]), 'long sensitive-data enumeration removed from the field hint');
assert.ok(/maxlength="3000"/.test(reviewHtml), 'technical 3,000-character limit preserved');

// ── 5. Course options: full catalogue without an area selection ─────────
assert.deepEqual(certOptionsForAreas([]), CERT_INVENTORY, 'no area selected: full cert catalogue');
assert.ok(bookOptionsForAreas([], false).includes('S4500'), 'no area: MM book visible');
assert.ok(bookOptionsForAreas([], false).includes('S4600'), 'no area: SD book visible');
assert.ok(bookOptionsForAreas([], false).includes('S4F10'), 'no area: FI book visible');
for (const fb of ['S4H00', 'S4H02']) {
  assert.ok(!bookOptionsForAreas([], false).includes(fb), `no area: ${fb} still gated on the Foundation cert`);
}
assert.deepEqual(bookOptionsForAreas([], true), BOOK_INVENTORY, 'no area + Foundation cert: full book catalogue');
assert.deepEqual(bookOptionsForAreas(['basics'], false), [], 'basics area still maps to no area books');
assert.ok(bookOptionsForAreas(['MM'], true).includes('S4H00') && bookOptionsForAreas(['MM'], true).includes('S4500'), 'MM + Foundation cert keeps both book sets');
assert.deepEqual(certOptionsForAreas(['MM']), ['UC_FL_S420XX_DE', 'UC_MM_S42023_DE', 'C_TS452'], 'MM cert mapping unchanged');
// one shared hint, no choose-areas-first prompt, no duplicated generic hints
assert.ok(!reviewHtml.includes('cert-filter-hint') && !reviewHtml.includes('books-filter-hint'), 'choose-areas-first filter hints removed');
assert.ok(!reviewHtml.includes('data-i18n="certHint"') && !reviewHtml.includes('data-i18n="booksHint"'), 'per-group duplicated hints removed');
assert.equal((reviewHtml.match(/data-i18n="courseHint"/g) || []).length, 1, 'exactly one shared course-context hint');
assert.ok(!reviewsJs.includes('cert-filter-hint') && !reviewsJs.includes('books-filter-hint'), 'reviews.js no longer toggles filter hints');
for (const lang of ['en', 'de', 'es']) {
  assert.ok(!('chooseAreasFirst' in translations[lang]), `${lang}: chooseAreasFirst key removed`);
  assert.ok(!('certHint' in translations[lang]) && !('booksHint' in translations[lang]), `${lang}: duplicated hint keys removed`);
  assert.ok(translations[lang].courseHint.length < 120, `${lang}: shared hint stays short`);
  assert.ok(/not published|nicht veröffentlicht|no se publican/i.test(translations[lang].courseHint) === false, `${lang}: old unconditional not-published claim removed`);
  assert.ok(/published|veröffentlicht|publican/i.test(translations[lang].courseHint), `${lang}: hint states automatic publication with the review (owner update 2026-11-01)`);
  assert.ok(!/only if|nur mit|solo si|solo con/i.test(translations[lang].courseHint), `${lang}: no leftover reference to the removed separate consent`);
}

// ── 6. Consent label follows the name mode; re-confirm on switch ────────
const consentExpect = {
  de: { named: 'Anzeigename', anon: 'ohne Namensnennung' },
  en: { named: 'display name', anon: 'without naming me' },
  es: { named: 'nombre elegido', anon: 'sin citar mi nombre' },
};
for (const lang of ['en', 'de', 'es']) {
  const t = translations[lang];
  assert.ok(t.consentNamed.toLowerCase().includes(consentExpect[lang].named.toLowerCase()), `${lang}: named consent names the display name`);
  assert.ok(!t.consentAnonymous.toLowerCase().includes(consentExpect[lang].named.toLowerCase()), `${lang}: anonymous consent must not promise the chosen display name`);
  assert.ok(t.consentAnonymous.toLowerCase().includes(consentExpect[lang].anon.toLowerCase()), `${lang}: anonymous consent explicitly without naming`);
  for (const key of ['consentNamed', 'consentAnonymous']) {
    assert.ok(!/buch|book|libro|zertifizier|certif|certificaci/i.test(t[key]), `${lang}.${key}: no premature public books/certs promise`);
  }
}
assert.match(reviewHtml, /data-i18n="consentNamed"/, 'default consent label is the named variant');
assert.ok(!/id="consent"[^>]*\bchecked\b/.test(reviewHtml), 'consent checkbox is never auto-checked');
assert.match(reviewsJs, /consentNamed/, 'syncNameMode swaps the consent label by mode');
assert.match(reviewsJs, /consentAnonymous/, 'anonymous consent label wired');
assert.match(reviewsJs, /\$\("consent"\)\.checked = false/, 'mode change resets a given consent for re-confirmation');
assert.match(reviewsJs, /addEventListener\("reset"/, 'reset restores the default name mode');
assert.match(reviewsJs, /\$\("display-name"\)\.value = ""/, 'anonymous mode clears any earlier display name (no name in anonymous payload)');

console.log('test_owner_corrections_20261031b: all assertions passed');
