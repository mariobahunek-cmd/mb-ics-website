// Public course context (books/certifications) 2026-10-31 — candidate tests.
// Contract: new explicit, versioned publication consent (checkbox never
// prechecked, unchecked again on name-mode change), payload only when
// checked, honest hints, privacy text updated, and native review cards
// render localized participant-provided labels with small codes (XSS-safe,
// unknown codes hidden, no verification seal, legacy cards unchanged).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ROOT = new URL('..', import.meta.url);
const read = (p) => readFile(new URL(p, ROOT), 'utf8');

const i18n = await import('../reviews-i18n.js');
const translations = i18n.translations;
const options = await import('../course-options.js');
const { reviewCard } = await import('../trust-reviews.js');

const reviewHtml = await read('review/index.html');
const reviewsJs = await read('reviews.js');
const trustJs = await read('trust-reviews.js');
const privacy = await read('privacy.html');

// ── 1. Form: separate, never-prechecked consent checkbox ───────────────
assert.ok(reviewHtml.includes('id="course-consent"'), 'course-context consent checkbox exists');
const cb = reviewHtml.slice(reviewHtml.indexOf('id="course-consent"'));
assert.ok(!/\bchecked\b/.test(cb.slice(0, cb.indexOf('>'))), 'course-context consent is never prechecked');
assert.ok(reviewHtml.includes('data-i18n="courseConsent"'), 'checkbox label is localized via i18n');

// ── 2. i18n: all languages, version consistent with backend ────────────
for (const lang of ['en', 'de', 'es']) {
  const t = translations[lang];
  assert.equal(typeof t.courseConsent, 'string', `${lang}: courseConsent present`);
  assert.ok(t.courseConsent.includes('2026-10-31'), `${lang}: courseConsent names version 2026-10-31`);
  assert.ok(/book|Büch|manuales/i.test(t.courseConsent), `${lang}: courseConsent mentions books`);
  assert.ok(/certif|Zertifiz|certificac/i.test(t.courseConsent), `${lang}: courseConsent mentions certifications`);
  // Hint no longer promises unconditional non-publication of books/certs.
  assert.ok(!/not published|werden nicht veröffentlicht|no se publican/i.test(t.courseHint),
    `${lang}: courseHint no longer claims selections are never published`);
  assert.ok(/only if|nur mit|solo si|solo con/i.test(t.courseHint),
    `${lang}: courseHint explains conditional publication`);
  // Key parity retained.
  assert.equal(typeof t.certLegend, 'string');
  assert.equal(typeof t.booksLegend, 'string');
}

// ── 3. Form logic: mode change unchecks; payload only when checked ─────
assert.ok(/\$\("course-consent"\)\.checked = false/.test(reviewsJs),
  'name-mode change unchecks the course-context consent');
assert.ok(/course_context_publication/.test(reviewsJs), 'payload carries course_context_publication');
const payloadLine = reviewsJs.slice(reviewsJs.indexOf('course_context_publication'), reviewsJs.indexOf('course_context_publication') + 300);
assert.ok(/consent:\s*true/.test(payloadLine) && /"2026-10-31"/.test(payloadLine),
  'payload uses the authorized version 2026-10-31');

// ── 4. Native review cards: localized labels, codes secondary, fail closed
function stubDoc() {
  const mk = (tag) => {
    const n = { tagName: tag, className: '', dataset: {}, children: [], _text: '', lang: '', dateTime: '' };
    n.append = (...cs) => { n.children.push(...cs); };
    Object.defineProperty(n, 'textContent', {
      get() { return n._text + n.children.map((c) => c.textContent).join(''); },
      set(v) { n._text = String(v); n.children = []; },
    });
    return n;
  };
  return { createElement: mk };
}
const record = (extra) => ({
  id: 'r1', stars: 5, comment: 'gut', display_name: 'Ben',
  course_category: 'MM', course_month: null, original_language: 'de',
  published_at: Date.UTC(2026, 9, 31), verification_level: 'email_only',
  ...extra,
});
for (const lang of ['en', 'de', 'es']) {
  const card = reviewCard(stubDoc(), record({
    course_context: { certifications: ['UC_MM_S42023_DE'], books: ['S4500', 'S4520'] },
  }), lang);
  const t = translations[lang];
  assert.ok(card.textContent.includes(t.certLegend), `${lang}: brief certifications label`);
  assert.ok(card.textContent.includes(t.booksLegend), `${lang}: brief books label`);
  assert.ok(card.textContent.includes(options.certLabel('UC_MM_S42023_DE', lang)), `${lang}: readable cert name`);
  assert.ok(card.textContent.includes(options.bookLabel('S4500', lang)), `${lang}: readable book name`);
  // Codes stay visible but secondary (inside the localized label string).
  assert.ok(card.textContent.includes('UC_MM_S42023_DE') && card.textContent.includes('S4500'), `${lang}: small codes retained`);
  // Participant indication, never a verification seal.
  assert.ok(!/verified credential|verifiziert|verificad/i.test(card.textContent) || !/seal|Siegel|sello/i.test(card.textContent),
    `${lang}: no verification seal claim`);
}
// Unknown/tampered codes are hidden fail-closed; consented-but-empty renders nothing.
const tampered = reviewCard(stubDoc(), record({
  course_context: { certifications: ['INVENTED_CERT', 42], books: [] },
}), 'en');
assert.ok(!tampered.textContent.includes('INVENTED_CERT'), 'unknown codes never render');
const empty = reviewCard(stubDoc(), record({ course_context: { certifications: [], books: [] } }), 'en');
assert.ok(!empty.textContent.includes(translations.en.certLegend), 'no empty context block');
// Legacy records (no course_context key) keep the exact previous structure.
const legacy = reviewCard(stubDoc(), record(), 'en');
assert.ok(!legacy.textContent.includes(translations.en.certLegend), 'legacy cards unchanged');
// XSS safety: rendering is textContent-only.
assert.ok(!/innerHTML|insertAdjacentHTML|document\.write/.test(trustJs), 'trust-reviews.js never injects HTML');

// ── 5. Privacy notice describes the actual behavior, versioned ─────────
const section = privacy.slice(privacy.indexOf('id="participant-reviews"'));
assert.ok(!/certifications achieved, course books used\) are never published/.test(section),
  'privacy no longer claims books/certs are never published');
assert.ok(section.includes('2026-10-31'), 'privacy names the new consent version');
assert.ok(/never published/.test(section), 'training period/areas stay explicitly private');

process.stdout.write('public-course-context frontend tests: all assertions passed\n');
