import type { Context } from "./context.ts";
import { digest } from "./crypto.ts";
import { HttpError } from "./schema.ts";
import { moderate } from "./admin.ts";
import { transaction } from "./db.ts";
export function withdraw(ctx: Context, token: unknown) {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new HttpError(400, "invalid_token");
  const row = ctx.db
    .prepare("SELECT review_id FROM review_private WHERE manage_digest=?")
    .get(digest(ctx.key, "manage:" + token));
  if (!row) throw new HttpError(400, "invalid_token");
  return moderate(
    ctx,
    { sub: "author-capability", role: "moderator" },
    String(row.review_id),
    "withdrawn",
    "author_request",
  );
}
export function cleanup(ctx: Context) {
  return transaction(ctx.db, () => {
    const removed = ctx.db
      .prepare(
        "DELETE FROM reviews WHERE (status='pending_email' AND created_at<?) OR (status='rejected' AND created_at<?)",
      )
      .run(ctx.now() - 14 * 86400000, ctx.now() - 30 * 86400000).changes;
    ctx.db
      .prepare("DELETE FROM rate_limits WHERE expires_at<=?")
      .run(ctx.now());
    ctx.db
      .prepare(
        "DELETE FROM outbox WHERE review_id IN (SELECT review_id FROM review_private WHERE token_expiry<=?)",
      )
      .run(ctx.now());
    return { removed };
  });
}
