/* No local archive. Canonical public IDs, publication and withdrawal are
   service-owned; never infer person equivalence or publish a fallback quote. */
(function () {
  const MAX_RECORDS = 1000;
  async function prepare(api) {
    const base = api.replace(/\/$/, '');
    async function request(path) {
      const response = await fetch(base + path, {
        credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
        signal: AbortSignal.timeout(8000)
      });
      if (!response.ok) throw new Error('archive_unavailable');
      return response.json();
    }
    const registry = await request('/v1/historical/identities');
    if (!registry || !Array.isArray(registry.homepage_suppressed) ||
        !registry.homepage_suppressed.every(id => typeof id === 'string' && /^homepage\/[a-f0-9]{64}$/.test(id)))
      throw new Error('archive_registry');
    const selected = new Map();
    let offset = 0, total;
    do {
      const data = await request('/v1/historical?offset=' + offset);
      if (!data || !Array.isArray(data.items) || !Number.isSafeInteger(data.count) ||
          data.count < 0 || data.count > MAX_RECORDS || (total !== undefined && total !== data.count) ||
          data.items.length !== Math.min(20, data.count - offset) ||
          data.next_offset !== (offset + 20 < data.count ? offset + 20 : null))
        throw new Error('archive_feed');
      total = data.count;
      for (const record of data.items) {
        if (!record || typeof record.id !== 'string' || !record.id ||
            typeof record.source !== 'string' || typeof record.comment !== 'string' ||
            typeof record.display_name !== 'string' ||
            (record.original_language !== null && (typeof record.original_language !== 'string' || !/^[a-z]{2,3}(?:-[A-Za-z0-9]+)*$/.test(record.original_language))))
          throw new Error('archive_record');
        // The canonical projection already selects distinct experiences. Do not
        // use stars, names, language, array position or local archive aliases.
        if (record.source === 'LinkedIn') selected.set(record.id, record);
      }
      offset = data.next_offset;
    } while (offset !== null);
    return [...selected.values()];
  }
  window.ReviewArchive = Object.freeze({prepare});
})();
