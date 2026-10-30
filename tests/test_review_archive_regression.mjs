// Regression test: homepage recommendations wall must render ALL canonical
// public records of every source (ProvenExpert + LinkedIn), not a filtered set.
//
// Runs against the LIVE public API (https://reviews-api.mb-ics.com), like the
// browser does. Usage: node tests/test_review_archive_regression.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import url from 'node:url';

const API = 'https://reviews-api.mb-ics.com';

// ---------------------------------------------------------------- live truth
async function crawlApi() {
  const items = [];
  let offset = 0, count;
  do {
    const res = await fetch(`${API}/v1/historical?offset=${offset}`);
    assert.equal(res.status, 200, 'API page fetch failed');
    const data = await res.json();
    if (count !== undefined) assert.equal(data.count, count, 'count changed mid-pagination');
    count = data.count;
    items.push(...data.items);
    offset = data.next_offset;
  } while (offset !== null);
  return { count, items };
}

const truth = await crawlApi();
const truthIds = new Set(truth.items.map(r => r.id));
const truthBySource = {};
for (const r of truth.items) truthBySource[r.source] = (truthBySource[r.source] || 0) + 1;

console.log(`API truth: count=${truth.count} distinct=${truthIds.size} sources=${JSON.stringify(truthBySource)}`);
assert.equal(truth.count, truth.items.length, 'count must equal summed items');
assert.equal(truthIds.size, truth.count, 'all API ids must be distinct');

// ------------------------------------------------- review-archive.js in a VM
const archiveSource = await readFile(new URL('../review-archive.js', import.meta.url), 'utf8');
const archiveContext = {
  window: {},
  fetch: globalThis.fetch.bind(globalThis),
  AbortSignal: globalThis.AbortSignal,
  console
};
vm.createContext(archiveContext);
vm.runInContext(archiveSource, archiveContext, { filename: 'review-archive.js' });

const selected = await archiveContext.window.ReviewArchive.prepare(API);
const selectedIds = new Set(selected.map(r => r.id));
const selectedBySource = {};
for (const r of selected) selectedBySource[r.source] = (selectedBySource[r.source] || 0) + 1;

// ------------------------------------------------------------- acceptance
function acceptance(idSet) {
  return idSet.size === truthIds.size && [...idSet].every(id => truthIds.has(id));
}

// GREEN: the fixed code must carry every canonical distinct ID of every source.
assert.ok(acceptance(selectedIds), 'archive selection must equal the full canonical ID set');
assert.equal(selectedIds.size, 72, `expected 72 records, got ${selectedIds.size}`);
assert.deepEqual(selectedBySource, { ProvenExpert: 38, LinkedIn: 34 }, 'source split must be 38 PE + 34 LI');
console.log('PASS prepare(): 72 distinct IDs, 38 ProvenExpert + 34 LinkedIn');

// NEGATIVE: the previously shipped source filter must FAIL this acceptance.
const linkedInOnly = new Set(truth.items.filter(r => r.source === 'LinkedIn').map(r => r.id));
assert.equal(linkedInOnly.size, 34, 'LinkedIn-only set sanity (34)');
assert.equal(acceptance(linkedInOnly), false, 'a source-filtered set must fail acceptance');
console.log('PASS negative: LinkedIn-only filter (34 IDs) correctly fails acceptance');

// NEGATIVE: prepare() must fail closed on malformed record payloads.
{
  const bad = await archiveContext.window.ReviewArchive.prepare;
  let threw = null;
  const savedFetch = archiveContext.fetch;
  const oneBad = JSON.parse(JSON.stringify(truth.items.slice(0, 20)));
  oneBad[3].original_date = 'not-a-date';
  archiveContext.fetch = async (u) => {
    if (String(u).includes('/v1/historical/identities')) return { ok: true, json: async () => ({ homepage_suppressed: [] }) };
    if (String(u).includes('offset=20') || String(u).includes('offset=40') || String(u).includes('offset=60'))
      return { ok: true, json: async () => ({ count: 20, items: truth.items.slice(0, 20), next_offset: null, __stub: true }) };
    return { ok: true, json: async () => ({ count: 20, items: oneBad, next_offset: null }) };
  };
  // re-run script in a fresh context that captures our stub via context fetch
  const ctx2 = { window: {}, fetch: archiveContext.fetch, AbortSignal: globalThis.AbortSignal };
  vm.createContext(ctx2);
  vm.runInContext(archiveSource, ctx2, { filename: 'review-archive.js' });
  try { await ctx2.window.ReviewArchive.prepare(API); } catch (e) { threw = e.message; }
  archiveContext.fetch = savedFetch;
  assert.equal(threw, 'archive_record', 'malformed original_date must fail closed');
  console.log('PASS negative: malformed record (bad original_date) rejected fail-closed');
}

// ------------------------------------------- DOM layer: testimonials.js flow
// Minimal DOM stub sufficient for createTestimonialCard + renderCanonicalArchive.
function makeNode(tag) {
  const listeners = {};
  return {
    tagName: tag, className: '', children: [], dataset: {}, style: {}, lang: '',
    _text: '', _expanded: null,
    get textContent() {
      if (this.children.length) return this.children.map(c => c.textContent).join('');
      return this._text;
    },
    set textContent(v) { this._text = String(v); this.children = []; },
    append(...n) { this.children.push(...n.map(x => typeof x === 'string' ? { textContent: x } : x)); },
    replaceChildren(...n) { this.children = [...n]; },
    removeAttribute(k) { delete this[`_${k}`]; },
    setAttribute(k, v) { this[`_${k}`] = String(v); },
    getAttribute(k) { return this[`_${k}`] ?? null; },
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    _fire(type) { for (const fn of listeners[type] || []) fn({ preventDefault() {} }); },
    classList: null,
    type: '', href: '', target: '', rel: '', dateTime: '', id: ''
  };
}
function withClassList(node) {
  const classes = new Set();
  node.classList = {
    add: (...c) => c.forEach(x => classes.add(x)),
    remove: (...c) => c.forEach(x => classes.delete(x)),
    toggle: (c, force) => {
      const on = force === undefined ? !classes.has(c) : force;
      on ? classes.add(c) : classes.delete(c);
      return on;
    },
    contains: c => classes.has(c)
  };
  node._classes = classes;
  return node;
}

const grid = withClassList(makeNode('div'));
grid.dataset.canonicalApi = API;
const loadMoreBtn = makeNode('button');
loadMoreBtn.style = {};
const status = { textContent: '', dataset: { unavailable: 'Archive temporarily unavailable.' } };
const elements = { testimonialsGrid: grid, loadMoreBtn, 'testimonial-registry-status': status };

globalThis.document = {
  readyState: 'loading',
  documentElement: { getAttribute: () => 'en' },
  createElement: (tag) => withClassList(makeNode(tag)),
  getElementById: (id) => elements[id] || null,
  addEventListener: () => {}
};
globalThis.window = { ReviewArchive: archiveContext.window.ReviewArchive };

const testimonialsMod = await import(new URL('../testimonials.js', import.meta.url));
await globalThis.window.initializeTestimonialArchive();
await new Promise(r => setTimeout(r, 500)); // let the initial render settle

// Walk ALL load-more pages exactly like a user clicking until the button hides.
let guard = 0;
let rendered = new Set();
function collect() {
  rendered = new Set(grid.children.filter(c => c.dataset && c.dataset.reviewId).map(c => c.dataset.reviewId));
}
collect();
while (loadMoreBtn.style.display !== 'none' && guard++ < 30) {
  await globalThis.window.loadMoreTestimonials();
  await new Promise(r => setTimeout(r, 400));
  collect();
}

assert.equal(guard < 30, true, 'load-more must terminate');
assert.ok(acceptance(rendered), `rendered DOM IDs over all load-more pages must equal the canonical set (got ${rendered.size})`);
assert.equal(rendered.size, 72, `DOM must show 72 records, got ${rendered.size}`);
console.log('PASS DOM: 72 distinct reviewIds rendered across all load-more pages');

// Card field checks: source label, date, rating where real, no fabricated HTML.
// Rating-only records (empty canonical comment) must render as honest compact
// cards — never an empty quote card and never an invented quote or name.
const byId = new Map(selected.map(r => [r.id, r]));
let withToggle = 0, withRating = 0, ratingOnly = 0;
const expectedRatingOnly = truth.items.filter(r => !r.comment || !r.comment.trim()).length;
for (const card of grid.children) {
  const rec = byId.get(card.dataset.reviewId);
  assert.ok(rec, `card ${card.dataset.reviewId} maps to a record`);
  const meta = card.children.find(c => c.className === 'testimonial-card__author')?.children.find(c => c.className === 'testimonial-card__meta');
  assert.ok(meta, 'author meta present');
  assert.ok(meta.textContent.startsWith(rec.source + ' ·'), `source label must be the record source (${rec.source})`);
  assert.ok(/\d{4}/.test(meta.textContent), 'original date must be visible');
  const timeEl = meta.children.find(c => c.tagName === 'time');
  assert.equal(timeEl?.dateTime, rec.original_date, 'semantic time element with original date');
  const ratingSpan = meta.children.find(c => c.className === 'testimonial-card__rating');
  if (rec.source_rating !== null) assert.ok(ratingSpan, 'rating in nowrap span');
  const hasRating = meta.textContent.includes(`${rec.source_rating} / ${rec.source_scale}`);
  if (rec.source_rating !== null) { assert.ok(hasRating, 'real rating must be shown'); withRating++; }
  else { assert.equal(hasRating, false, 'no fabricated rating for LinkedIn records'); }
  const hasComment = typeof rec.comment === 'string' && rec.comment.trim().length > 0;
  const quote = card.children.find(c => typeof c.className === 'string' && c.className.startsWith('testimonial-card__quote'));
  if (!hasComment) {
    ratingOnly++;
    assert.ok(card._classes.has('testimonial-card--rating-only'), 'empty comment must render a rating-only card');
    const note = card.children.find(c => c.className === 'testimonial-card__rating-only');
    assert.ok(/without written comment/i.test(note?.textContent || ''), 'localized rating-only note required');
    assert.equal(quote, undefined, 'no empty quote card for rating-only records');
    if (!rec.display_name || !rec.display_name.trim()) {
      const strong = card.children.find(c => c.className === 'testimonial-card__author').children.find(c => c.tagName === 'strong');
      assert.equal(strong.textContent, 'Anonymous', 'missing names shown as Anonymous, never invented');
    }
    continue;
  }
  const p = quote.children.find(c => c.tagName === 'p');
  assert.equal(p.textContent, rec.comment, 'comment must be rendered as plain text, unaltered');
  if (rec.comment.length > 320) { assert.ok(quote._classes.has('testimonial-card__quote--clamped'), 'long text clamped'); withToggle++; }
  else { assert.equal(quote._classes.has('testimonial-card__quote--clamped'), false, 'short text not clamped'); }
}
assert.equal(ratingOnly, expectedRatingOnly, `exactly the ${expectedRatingOnly} canonical rating-only records render as such`);
assert.ok(expectedRatingOnly >= 6, 'the six proven rating-only records stay honest');
assert.equal(withRating, 38, 'exactly the 38 ProvenExpert records carry a rating');
assert.ok(withToggle > 0, 'some long comments are collapsible');
console.log(`PASS cards: source/date/rating correct on all 72; ${withToggle} collapsible; 38 rated; ${ratingOnly} rating-only`);

console.log('\nALL REGRESSION CHECKS PASSED');
process.exit(0);
