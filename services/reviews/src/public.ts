import type { Context } from "./context.ts";
import { digest } from "./crypto.ts";
import { HttpError, publicDTO } from "./schema.ts";
export function summary(ctx: Context, snapshot = Number.MAX_SAFE_INTEGER) {
  const rows = ctx.db
    .prepare(
      "SELECT stars,count(*) n FROM reviews WHERE status='published' AND id IN (SELECT review_id FROM publication_revisions WHERE revision<=?) GROUP BY stars",
    )
    .all(snapshot);
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let count = 0,
    total = 0;
  for (const row of rows) {
    const n = Number(row.n),
      stars = Number(row.stars);
    distribution[stars] = n;
    count += n;
    total += stars * n;
  }
  return { count, mean: count ? total / count : null, distribution };
}
export function publicList(ctx: Context, p: URLSearchParams) {
  // Keep rows and aggregates in one SQLite read snapshot, including when
  // another connection moderates a review between these two SELECTs.
  ctx.db.exec("SAVEPOINT public_list");
  try {
    return readPublicList(ctx, p);
  } finally {
    ctx.db.exec("RELEASE public_list");
  }
}
function readPublicList(ctx: Context, p: URLSearchParams) {
  const sort = p.get("sort") ?? "newest";
  if (!["newest", "critical"].includes(sort)) throw new HttpError(400, "sort");
  const limit = Number(p.get("limit") ?? 10);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50)
    throw new HttpError(400, "limit");
  let cursor:
    | {
        version: number;
        sort: string;
        date: number;
        id: string;
        stars: number;
        snapshot: number;
      }
    | undefined;
  if (p.has("cursor")) {
    try {
      const raw = p.get("cursor")!;
      if (raw.length > 1000) throw 0;
      const [data, mac] = raw.split(".");
      if (digest(ctx.key, "cursor:" + data) !== mac) throw 0;
      cursor = JSON.parse(Buffer.from(data, "base64url").toString());
      if (
        !cursor ||
        cursor.version !== 2 ||
        cursor.snapshot < 0 ||
        cursor.sort !== sort ||
        !Number.isSafeInteger(cursor.date) ||
        !Number.isSafeInteger(cursor.snapshot) ||
        typeof cursor.id !== "string" ||
        !Number.isInteger(cursor.stars)
      )
        throw 0;
    } catch {
      throw new HttpError(400, "cursor");
    }
  }
  const snapshot =
    cursor?.snapshot ??
    Number(
      ctx.db
        .prepare(
          "SELECT coalesce((SELECT seq FROM sqlite_sequence WHERE name='publication_revisions'),0) revision",
        )
        .get()!.revision,
    );
  const args: (string | number)[] = [snapshot];
  let after = "";
  if (cursor) {
    const tuple = "(published_at<? OR (published_at=? AND id<?))";
    if (sort === "critical") {
      after = ` AND (stars>? OR (stars=? AND ${tuple}))`;
      args.push(cursor.stars, cursor.stars);
    } else after = ` AND ${tuple}`;
    args.push(cursor.date, cursor.date, cursor.id);
  }
  args.push(limit + 1);
  const rows = ctx.db
    .prepare(
      `SELECT * FROM reviews WHERE status='published' AND id IN (SELECT review_id FROM publication_revisions WHERE revision<=?) ${after} ORDER BY ${sort === "critical" ? "stars ASC," : ""}published_at DESC,id DESC LIMIT ?`,
    )
    .all(...args);
  const hasMore = rows.length > limit;
  const shown = rows.slice(0, limit);
  const last = shown.at(-1);
  let next_cursor: string | null = null;
  if (hasMore && last) {
    const data = Buffer.from(
      JSON.stringify({
        version: 2,
        sort,
        date: last.published_at,
        id: last.id,
        stars: last.stars,
        snapshot,
      }),
    ).toString("base64url");
    next_cursor = `${data}.${digest(ctx.key, "cursor:" + data)}`;
  }
  return {
    items: shown.map(publicDTO),
    next_cursor,
    summary: summary(ctx, snapshot),
  };
}
// Representative selection is deterministic and rating-neutral. The group is
// explicit, immutable evidence; unlinked legacy rows remain separate.
const historicalCanonical = `WITH ranked AS (
 SELECT h.*, CASE WHEN i.canonical_id IS NULL THEN 'source:' || h.source_id ELSE 'canonical:' || i.canonical_id END canonical_key,
 row_number() OVER (PARTITION BY CASE WHEN i.canonical_id IS NULL THEN 'source:' || h.source_id ELSE 'canonical:' || i.canonical_id END ORDER BY h.source_id) representative
 FROM historical h LEFT JOIN historical_identity i USING(source_id) WHERE h.status='published'
), visible AS (SELECT * FROM ranked WHERE representative=1)`;
export function homepageIdentities(ctx: Context) {
  const ids = ctx.db.prepare("SELECT homepage_id FROM historical_identity WHERE homepage_id IS NOT NULL UNION SELECT substr(object_id,13) FROM recovery_events WHERE kind='historical_withdrawn' AND object_id LIKE 'historical:@homepage/%' ORDER BY 1").all();
  return { homepage_suppressed: ids.map(row => String(row.homepage_id)) };
}
export function historicalList(ctx: Context, p: URLSearchParams) {
  const offset = Number(p.get("offset") ?? 0);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000)
    throw new HttpError(400, "offset");
  ctx.db.exec("SAVEPOINT historical_list");
  try {
    const items = ctx.db.prepare(historicalCanonical + " SELECT * FROM visible ORDER BY original_date DESC,source_id LIMIT 20 OFFSET ?").all(offset);
    const count = Number(ctx.db.prepare(historicalCanonical + " SELECT count(*) n FROM visible").get()!.n);
    return {
      items: items.map(row => ({
        id: digest(ctx.key, "historical-public:" + (String(row.canonical_key).startsWith("source:") ? String(row.source_id) : String(row.canonical_key))),
        source: row.source, source_rating: row.source_rating, source_scale: row.source_scale,
        original_date: row.original_date, imported_at: row.imported_at,
        comment: row.comment_plaintext, display_name: row.display_name, original_language: row.original_language,
      })),
      count,
      source_counts: Object.fromEntries(ctx.db.prepare(historicalCanonical + " SELECT source,count(*) n FROM visible GROUP BY source ORDER BY CASE source WHEN 'ProvenExpert' THEN 0 ELSE 1 END").all().map(row => [String(row.source), Number(row.n)])),
      next_offset: offset + 20 < count ? offset + 20 : null,
    };
  } finally {ctx.db.exec("RELEASE historical_list");}
}
