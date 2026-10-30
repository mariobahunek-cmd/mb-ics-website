import { sourceLink } from './trust-reviews.js';
// Selected recommendations come only from the current canonical public feed,
// every published source (ProvenExpert and LinkedIn), service order preserved.
const BATCH_SIZE = 6;
const COLLAPSE_THRESHOLD = 320;
const UI_TEXT = {
  en: { expand: 'Show more', collapse: 'Show less',
        empty: 'No rights-reviewed recommendations are currently published here.',
        loadMore: remaining => `Load more (${remaining} remaining)`,
        loading: 'Loading…',
        ratingOnly: 'Rating without written comment',
        anonymous: 'Anonymous' },
  de: { expand: 'Mehr anzeigen', collapse: 'Weniger anzeigen',
        empty: 'Hier sind derzeit keine rechtegeprüften Empfehlungen veröffentlicht.',
        loadMore: remaining => `Mehr laden (${remaining} weitere)`,
        loading: 'Lädt…',
        ratingOnly: 'Bewertung ohne schriftlichen Kommentar',
        anonymous: 'Anonym' },
  es: { expand: 'Ver más', collapse: 'Ver menos',
        empty: 'Actualmente no hay recomendaciones con derechos revisados publicadas aquí.',
        loadMore: remaining => `Cargar más (${remaining} restantes)`,
        loading: 'Cargando…',
        ratingOnly: 'Valoración sin comentario escrito',
        anonymous: 'Anónimo' }
};
function ui(lang) { return UI_TEXT[lang] || UI_TEXT.en; }
function formatDate(iso, lang) {
  try {
    const d = new Date(iso + 'T00:00:00Z');
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(lang, { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' }).format(d);
  } catch { return ''; }
}
let archiveEpoch = 0;
let requestedCount = BATCH_SIZE;
let inFlight = null;
let archiveInitialization;
function getCurrentLang() {
  return document.documentElement.getAttribute('data-lang') || 'en';
}
function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true; // no motion support → jump-free instant positioning
  }
}
// A3: never clear the visible grid during a fetch. The canonical feed is
// reloaded with no-store on every action, so after it resolves the DOM is
// reconciled atomically: cards already present (and still published) stay in
// place, withdrawn IDs are removed, new IDs are appended — then the viewport
// is placed at the FIRST newly added card so the user never lands at the
// page bottom/footer. A language refresh supersedes any pending load (epoch
// invalidation); repeated load-more clicks while a request is pending reuse
// the same in-flight promise (no reentrant request storm, no duplicate IDs).
let lastRemaining = 0;
function applyArchive(count, rebuild = false) {
  requestedCount = count;
  const epoch = ++archiveEpoch;
  const run = (async () => {
    const grid = document.getElementById('testimonialsGrid');
    const btn = document.getElementById('loadMoreBtn');
    const status = document.getElementById('testimonial-registry-status');
    if (!grid) return;
    grid.setAttribute('aria-busy', 'true');
    if (btn && btn.style.display !== 'none') {
      btn.disabled = true;
      btn.textContent = ui(getCurrentLang()).loading;
    }
    try {
      const records = await window.ReviewArchive.prepare(grid.dataset.canonicalApi);
      if (epoch !== archiveEpoch) return;
      const lang = getCurrentLang();
      const target = records.slice(0, count);
      const existing = new Map(
        [...grid.children].map(card => [card.dataset.reviewId, card]),
      );
      const newIds = new Set(
        target.map(r => r.id).filter(id => !existing.has(id)),
      );
      const nodes = [];
      for (const record of target) {
        const keep = !rebuild && existing.get(record.id);
        nodes.push(keep || createTestimonialCard(record, lang));
      }
      grid.replaceChildren(...nodes); // single atomic reconcile, no blank grid
      if (existing.size > 0 && newIds.size > 0) {
        let firstNew = null;
        for (const card of grid.children)
          if (newIds.has(card.dataset.reviewId)) { firstNew = card; break; }
        // scroll-margin-top (trust.css) keeps the sticky header from
        // covering the first new card. Environments without layout (jsdom)
        // simply skip the positioning.
        if (firstNew && typeof firstNew.scrollIntoView === 'function')
          firstNew.scrollIntoView({
            block: 'start',
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          });
      }
      if (status) status.textContent = records.length ? '' : ui(lang).empty;
      if (btn) {
        const remaining = Math.max(0, records.length - count);
        lastRemaining = remaining;
        btn.style.display = remaining ? '' : 'none';
        btn.disabled = false;
        btn.textContent = ui(lang).loadMore(remaining);
      }
    } catch {
      if (epoch !== archiveEpoch) return;
      const lang = getCurrentLang();
      // A failed load-more keeps the already validated cards visible with an
      // error status (no blank-grid collapse). A failed full rebuild (e.g.
      // language refresh) fails closed instead: without a fresh canonical
      // validation the grid is cleared so no withdrawn record lingers.
      if (rebuild) grid.replaceChildren();
      if (status) status.textContent = status.dataset.unavailable || 'Recommendations temporarily unavailable.';
      if (btn && btn.style.display !== 'none') {
        btn.disabled = false;
        btn.textContent = ui(lang).loadMore(lastRemaining);
      }
    } finally {
      grid.removeAttribute('aria-busy');
    }
  })();
  inFlight = run;
  run.finally(() => { if (inFlight === run) inFlight = null; });
  return run;
}
function loadMoreTestimonials() {
  if (inFlight) return inFlight; // ignore repeated clicks while pending
  return applyArchive(requestedCount + BATCH_SIZE);
}
function refreshTestimonialLanguage() {
  // Supersedes any pending load via epoch invalidation — never waits on it.
  return applyArchive(requestedCount, true);
}
function initializeTestimonialArchive() {
  if (!archiveInitialization) {
    document.getElementById('loadMoreBtn')?.addEventListener('click', loadMoreTestimonials);
    archiveInitialization = applyArchive(BATCH_SIZE);
  }
  return archiveInitialization;
}
function createTestimonialCard(record, lang) {
  const t = ui(lang);
  const card = document.createElement('article');
  card.className = 'testimonial-card';
  card.dataset.reviewId = record.id;
  // Rating-only records (empty canonical comment) are rendered honestly and
  // compactly: no empty quote card pretending prose exists, no invented
  // quote or name. Source, date and rating are retained.
  const hasComment = typeof record.comment === 'string' && record.comment.trim().length > 0;
  let quote = null, note = null;
  if (hasComment) {
    quote = document.createElement('div');
    quote.className = 'testimonial-card__quote';
    const text = document.createElement('p');
    text.textContent = record.comment; // plain text only – never inject HTML
    if (record.original_language) text.lang = record.original_language;
    text.style.whiteSpace = 'pre-wrap';
    quote.append(text);
    if (record.comment.length > COLLAPSE_THRESHOLD) {
      quote.classList.add('testimonial-card__quote--clamped');
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'testimonial-card__toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = t.expand;
      toggle.addEventListener('click', () => {
        const expanded = quote.classList.toggle('testimonial-card__quote--expanded');
        quote.classList.toggle('testimonial-card__quote--clamped', !expanded);
        toggle.setAttribute('aria-expanded', String(expanded));
        toggle.textContent = expanded ? t.collapse : t.expand;
      });
      quote.append(toggle);
    }
    card.append(quote);
  } else {
    card.classList.add('testimonial-card--rating-only');
    note = document.createElement('p');
    note.className = 'testimonial-card__rating-only';
    note.textContent = t.ratingOnly;
    card.append(note);
  }
  const author = document.createElement('div');
  author.className = 'testimonial-card__author';
  const name = document.createElement('strong');
  name.textContent =
    typeof record.display_name === 'string' && record.display_name.trim().length > 0
      ? record.display_name
      : t.anonymous;
  const meta = document.createElement('span');
  meta.className = 'testimonial-card__meta';
  const sourceLabel = document.createElement('span');
  sourceLabel.textContent = record.source;
  meta.append(sourceLabel);
  const dateLabel = formatDate(record.original_date, lang);
  if (dateLabel) {
    const time = document.createElement('time');
    time.dateTime = record.original_date;
    time.textContent = dateLabel;
    meta.append(' · ', time);
  }
  // Show the record's own source rating only. Never average across foreign scales.
  if (Number.isFinite(record.source_rating) && Number.isFinite(record.source_scale)) {
    const rating = document.createElement('span');
    rating.className = 'testimonial-card__rating';
    rating.textContent = `${record.source_rating} / ${record.source_scale}`;
    meta.append(' · ', rating);
  }
  author.append(name, meta);
  card.append(quote ?? note, author, sourceLink(document, record, lang));
  return card;
}
window.refreshTestimonialLanguage = refreshTestimonialLanguage;
window.loadMoreTestimonials = loadMoreTestimonials;
window.initializeTestimonialArchive = initializeTestimonialArchive;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeTestimonialArchive);
else initializeTestimonialArchive();
