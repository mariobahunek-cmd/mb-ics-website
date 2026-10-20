import type { Context } from "./context.ts";
import { digest } from "./crypto.ts";
import { transaction } from "./db.ts";
import { HttpError } from "./schema.ts";
export function confirm(ctx: Context, token: unknown) {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new HttpError(400, "invalid_token");
  return transaction(ctx.db, () => {
    const row = ctx.db
      .prepare(
        "UPDATE review_private SET consumed_at=? WHERE token_digest=? AND consumed_at IS NULL AND token_expiry>? RETURNING review_id",
      )
      .get(ctx.now(), digest(ctx.key, "confirm:" + token), ctx.now());
    if (!row) throw new HttpError(400, "invalid_token");
    const updated = ctx.db
      .prepare(
        "UPDATE reviews SET status='pending_moderation' WHERE id=? AND status='pending_email'",
      )
      .run(String(row.review_id));
    if (updated.changes !== 1) throw new HttpError(400, "invalid_token");
    return { status: "pending_moderation" };
  });
}
