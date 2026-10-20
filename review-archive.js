/* Archive fingerprints identify exact records, never people. Only the canonical
   registry's explicitly reviewed aliases establish cross-source equivalence. */
(function () {
  const pattern = /^homepage\/[a-f0-9]{64}$/;
  async function identity(card) {
    if (card.homepage_id !== undefined) {
      if (!pattern.test(card.homepage_id)) throw new Error('archive_identity');
      return card.homepage_id;
    }
    // Fixed field order; all translations are included, independent of active UI
    // language and array position. Not name matching or identity inference.
    const fields = [card.source, card.name, card.initials,
      ...['de','en','es'].map(lang => card.role?.[lang] ?? ''),
      ...['de','en','es'].map(lang => card.quote?.[lang] ?? '')];
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(fields)));
    return 'homepage/' + Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2,'0')).join('');
  }
  async function prepare(cards, api) {
    const response = await fetch(api.replace(/\/$/, '') + '/v1/historical/identities', {
      credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error('archive_registry');
    const registry = await response.json();
    if (!registry || !Array.isArray(registry.homepage_suppressed) ||
        !registry.homepage_suppressed.every(id => typeof id === 'string' && pattern.test(id)))
      throw new Error('archive_registry');
    const suppressed = new Set(registry.homepage_suppressed), seen = new Set(), result = [];
    for (const card of cards) {
      const id = await identity(card);
      if (!suppressed.has(id) && !seen.has(id)) { seen.add(id); result.push(card); }
    }
    return result;
  }
  window.ReviewArchive = Object.freeze({identity, prepare});
})();
