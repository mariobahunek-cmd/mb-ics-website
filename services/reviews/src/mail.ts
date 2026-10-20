import type { Context, Mail } from "./context.ts";
import { decrypt } from "./crypto.ts";
import { checkMailDispatch, MAIL_RECEIVE_MARGIN_MS, MAIL_RETRY_RESERVE_MS } from "./mail-window.ts";
// Transactional outbox: failed delivery stays queued. Provider receives a stable idempotency key.
export async function deliver(ctx: Context, id: string) {
  if (ctx.mailEnabled !== true) return;
  // Reserve 10s for the request and a separate 10s receive/processing margin.
  // Token lifetime is not a safe dispatch deadline by itself.
  const now = ctx.now();
  const started = performance.now();
  const r = ctx.db
    .prepare(
      "UPDATE outbox SET state='sending',attempts=attempts+1,updated_at=? WHERE review_id=? AND attempts<12 AND review_id IN (SELECT review_id FROM review_private WHERE token_expiry>?) AND (state='queued' OR (state='sending' AND updated_at<?)) RETURNING payload_cipher, (SELECT token_expiry FROM review_private WHERE review_id=outbox.review_id) AS token_expiry",
    )
    .get(now, id, now + MAIL_RETRY_RESERVE_MS, now - 300_000);
  if (!r) return;
  try {
    const mail = JSON.parse(decrypt(ctx.key, String(r.payload_cipher))) as Mail;
    const dispatch = {
      deadline: Number(r.token_expiry) - MAIL_RECEIVE_MARGIN_MS,
      // Elapsed in-process pauses cannot be hidden by a wall-clock rollback.
      now: () => Math.max(ctx.now(), now + performance.now() - started),
    };
    checkMailDispatch(dispatch);
    await ctx.send(mail, id, dispatch);
    ctx.db
      .prepare(
        "UPDATE outbox SET state='sent',payload_cipher='',updated_at=? WHERE review_id=?",
      )
      .run(ctx.now(), id);
  } catch {
    ctx.db
      .prepare(
        "UPDATE outbox SET state='queued',updated_at=? WHERE review_id=?",
      )
      .run(ctx.now(), id);
  }
}
export async function retryMail(ctx: Context) {
  if (ctx.mailEnabled !== true) return;
  const rows = ctx.db
    .prepare(
      "SELECT o.review_id FROM outbox o JOIN review_private p ON p.review_id=o.review_id WHERE o.state!='sent' AND o.attempts<12 AND p.token_expiry>? AND o.updated_at<? LIMIT 20",
    )
    .all(ctx.now() + MAIL_RETRY_RESERVE_MS, ctx.now() - 300_000);
  for (const row of rows) await deliver(ctx, String(row.review_id));
}
