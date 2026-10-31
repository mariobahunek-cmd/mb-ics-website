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

// ── 1. Paths: certification preparation is the primary offering ─────────
const primary = {
  de: { badge: 'Schwerpunkt', title: 'SAP-Zertifizierungsvorbereitung' },
  en: { badge: 'Core focus', title: 'SAP Certification Exam Preparation' },
  es: { badge: 'Enfoque principal', title: 'Preparación para la certificación SAP' },
};
const additional = {
  de: { badge: 'Zusätzliches Angebot', title: 'Maßgeschneiderte Unternehmenstrainings' },
  en: { badge: 'Additional offering', title: 'Tailored Corporate Training' },
  es: { badge: 'Oferta adicional', title: 'Formaciones corporativas a medida' },
};
for (const lang of ['de', 'en', 'es']) {
  const t = i18n[lang];
  assert.equal(t['paths.primaryBadge'], primary[lang].badge, `${lang}: primary badge`);
  assert.ok(t['paths.primaryTitle'].includes(primary[lang].title.split(' ').slice(0, 2).join(' ')), `${lang}: primary title`);
  assert.ok(/MM/.test(t['paths.primaryDesc']) && /SD/.test(t['paths.primaryDesc']), `${lang}: primary desc covers MM and SD`);
  assert.ok(/SAP-zertifizierter Trainer|SAP-certified trainer|formador SAP certificado/i.test(t['paths.primaryDesc']), `${lang}: primary desc names the certified-trainer basis`);
  assert.equal(t['paths.additionalBadge'], additional[lang].badge, `${lang}: additional badge`);
  assert.ok(t['paths.additionalTitle'].includes(additional[lang].title.split(' ')[0]), `${lang}: additional title`);
  for (const key of Object.keys(t)) {
    if (!key.startsWith('paths.')) continue;
    assert.ok(!/white-?label|co-?delivery|right-to-?represent/i.test(t[key]), `${lang}.${key}: no white-label/co-delivery/R2R phrasing`);
  }
}
const i18nRaw = await read('_data/i18n_home.json');
for (const stale of ['im Ausbau über 2026', 'expanding through 2026', 'en expansión durante 2026']) {
  assert.ok(!i18nRaw.includes(stale), `unevidenced SD-2026 claim still present: ${stale}`);
}
const pathsStart = home.indexOf('id="paths"');
const pathsEnd = home.indexOf('</section>', pathsStart);
const pathsBlock = home.slice(pathsStart, pathsEnd);
assert.ok(pathsBlock.includes('href="#training"'), 'primary path card targets the training section');
assert.ok(pathsBlock.includes('href="#corporate"'), 'additional path card targets the corporate section');
const trainingHref = pathsBlock.indexOf('href="#training"');
const corporateHref = pathsBlock.indexOf('href="#corporate"');
assert.ok(trainingHref > -1 && trainingHref < corporateHref, 'certification card comes first');
const firstCard = pathsBlock.slice(0, corporateHref);
assert.ok(/path-card--primary/.test(firstCard), 'certification card is the visually primary card');
assert.ok(!/path-card--primary/.test(pathsBlock.slice(corporateHref)), 'corporate card is not styled as primary');

// ── 2. Metrics: one heading, methodology nachgeordnet, big JPG download ─
assert.ok(!home.includes('metrics__source-title'), 'separate leading evidence-group heading dissolved');
assert.ok(!home.includes("t['trust.historical']"), 'no separate historical-evaluations intro block');
assert.ok(!home.includes("t['metrics.sourceNoteShort']"), 'duplicated leading source note removed');
assert.ok(!('metrics.sourceNoteShort' in i18n.de), 'stale sourceNoteShort key removed from i18n');
const metricsStart = home.indexOf('id="metrics"');
const metricsEnd = home.indexOf('</section>', metricsStart);
const metricsBlock = home.slice(metricsStart, metricsEnd);
assert.equal((metricsBlock.match(/section-title/g) || []).length, 1, 'exactly one metrics heading');
assert.ok(metricsBlock.indexOf('metrics__grid') < metricsBlock.indexOf('metrics__method-details'), 'collapsible methodology sits after the numbers');
assert.ok(/metrics__download/.test(metricsBlock) && /class="btn/.test(metricsBlock), 'original download rendered as a button, not a text link');
const css = await read('style.css');
const dlRule = css.match(/\.metrics__download\s*\{[^}]*\}/)?.[0] || '';
assert.ok(/background:\s*var\(--navy-800\)/.test(dlRule) && /color:\s*var\(--white\)/.test(dlRule),
  'download button must be high-contrast on the light metrics background (btn--outline is white-on-transparent for dark heroes)');
const dl = metricsBlock.match(/<a[^>]*href="(\/assets\/original\/[^"]+)"[^>]*download[^>]*>/);
assert.ok(dl, 'download anchor with download attribute near the metrics');
assert.equal(dl[1], '/assets/original/comcave-kursauswertung-original.jpg');
assert.ok(!/pdf/i.test(i18n.de['metrics.originalLink']), 'download label must not claim PDF');
assert.equal(i18n.de['metrics.originalLink'], 'Originalauswertung herunterladen (JPG)');
assert.equal(i18n.en['metrics.originalLink'], 'Download the original evaluation (JPG)');
assert.equal(i18n.es['metrics.originalLink'], 'Descargar la evaluación original (JPG)');
// essential interpretation kept briefly, at the numbers' section
for (const [lang, opWord] of [['de', 'Betreiberangaben'], ['en', 'operator'], ['es', 'operador']]) {
  assert.ok(i18n[lang]['metrics.subtitle'].includes('COMCAVE'), `${lang}: subtitle keeps COMCAVE provenance`);
  assert.ok(i18n[lang]['metrics.subtitle'].toLowerCase().includes(opWord.toLowerCase()), `${lang}: subtitle keeps separate-operator-figures note`);
}
// localized decimal commas, no bare point grades in the template
assert.equal(i18n.de['metrics.vPreparation'], '1,07');
assert.equal(i18n.en['metrics.vPreparation'], '1.07');
assert.equal(i18n.es['metrics.vPreparation'], '1,07');
assert.equal(i18n.de['metrics.vDidactic'], '1,14');
for (const key of ['vPreparation', 'vExpertise', 'vStructure', 'vDidactic']) {
  assert.ok(metricsBlock.includes(`t['metrics.${key}']`), `grade value ${key} rendered from i18n`);
}
assert.ok(!/>1\.07</.test(metricsBlock) && !/>1\.08</.test(metricsBlock), 'no hardcoded point grades in metrics block');
assert.ok(/data-decimal/.test(metricsBlock), 'animated grade honors the localized decimal separator');
assert.ok(/dataset\.decimal/.test(mainJs), 'counter animation applies the localized decimal separator');

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
  assert.ok(/only if|nur mit|solo si|solo con/i.test(translations[lang].courseHint), `${lang}: hint states conditional publication (2026-10-31 consent)`);
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
