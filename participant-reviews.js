// Public records only; never persist review text or infer matching authors.
export async function loadParticipantReviews(api, request = fetch) {
  const records = new Map(), cursors = new Set();
  let cursor = null;
  do {
    const response = await request(api.replace(/\/$/,'') + '/v1/reviews?sort=newest&limit=50' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''), {
      credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error('native_unavailable');
    const data = await response.json();
    if (!data || !Array.isArray(data.items) || !(data.next_cursor === null || typeof data.next_cursor === 'string')) throw new Error('native_feed');
    for (const r of data.items) {
      if (!r || typeof r.id !== 'string' || !r.id || typeof r.comment !== 'string' ||
          !(r.display_name === null || typeof r.display_name === 'string') ||
          !Number.isFinite(r.published_at) || !Number.isFinite(new Date(r.published_at).getTime()) ||
          !Number.isInteger(r.stars) || r.stars < 1 || r.stars > 5) throw new Error('native_record');
      records.set(r.id,r);
    }
    if (records.size > 1000 || cursors.size >= 20 || (data.next_cursor !== null && (!data.next_cursor || cursors.has(data.next_cursor)))) throw new Error('native_pagination');
    cursor = data.next_cursor;
    if (cursor) cursors.add(cursor);
  } while (cursor);
  return [...records.values()];
}
export function mergeReviews(historical, native) {
  return [...historical, ...native.map(r=>({...r, id:'native:'+r.id, native:true,
    source:'Participant review', source_rating:r.stars,source_scale:5,
    original_date:new Date(r.published_at).toISOString().slice(0,10)}))]
    .sort((a,b)=>(b.native ? b.published_at : Date.parse(b.original_date+'T00:00:00Z')) - (a.native ? a.published_at : Date.parse(a.original_date+'T00:00:00Z')) || a.id.localeCompare(b.id));
}
