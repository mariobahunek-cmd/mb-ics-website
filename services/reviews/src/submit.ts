import { randomUUID } from "node:crypto";
import type { Context } from "./context.ts";
import { validateReview, HttpError } from "./schema.ts";
import { digest, encrypt, token } from "./crypto.ts";
import { transaction } from "./db.ts";
import { deliver } from "./mail.ts";
import { reserveMailBudget, requireMailEnabled } from "./mail-budget.ts";
export function limit(
  ctx: Context,
  scope: string,
  value: string,
  max: number,
  window: number,
) {
  const now = ctx.now(),
    bucket = Math.floor(now / window),
    key = digest(ctx.key, `${scope}:${bucket}:${value}`);
  const r = ctx.db
    .prepare(
      "INSERT INTO rate_limits(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
    )
    .get(key, (bucket + 1) * window);
  if (Number(r!.count) > max) throw new HttpError(429, "rate_limit");
}
export async function submit(
  ctx: Context,
  input: unknown,
  idempotency: string,
  ip: string,
) {
  requireMailEnabled(ctx);
  ctx.backupAdmission?.();
  const v = validateReview(input);
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(idempotency))
    throw new HttpError(400, "idempotency");
  // Shared classroom NAT: 30 participants plus one safe retry each per hour.
  // Mailbox/day, challenge, idempotency and manual-publication controls remain unchanged.
  limit(ctx, "ip", ip, 60, 3600_000);
  if (v.website) return { status: "pending_email" };
  const ik = digest(ctx.key, "idempotency:" + idempotency),
    body = digest(
      ctx.key,
      JSON.stringify([
        v.stars,
        v.comment,
        v.display_name,
        v.visibility_choice,
        v.course_category,
        v.course_month,
        v.original_language,
        v.email,
        v.consent_version,
      ]),
    );
  const prior = ctx.db
    .prepare("SELECT * FROM idempotency WHERE key_digest=?")
    .get(ik);
  if (prior) {
    if (prior.body_digest !== body)
      throw new HttpError(409, "idempotency_conflict");
    await deliver(ctx, String(prior.review_id));
    return { status: "pending_email" };
  }
  if (!(await ctx.challenge(v.challenge ?? "")))
    throw new HttpError(400, "challenge");
  const emailKey = digest(ctx.key, "email:" + v.email);
  // Return the same generic acceptance for a mailbox already contacted within a day.
  try {
    limit(ctx, "email", emailKey, 3, 86400_000);
  } catch (e) {
    if (e instanceof HttpError && e.status === 429)
      return { status: "pending_email" };
    throw e;
  }
  const id = randomUUID(),
    confirmation = token(),
    manage = token(),
    now = ctx.now();
  ctx.backupAdmission?.(); // challenge/network await must not bypass a newly stale backup
  const persistedId = transaction(ctx.db, () => {
    const concurrent = ctx.db
      .prepare(
        "SELECT body_digest,review_id FROM idempotency WHERE key_digest=?",
      )
      .get(ik);
    if (concurrent) {
      if (concurrent.body_digest !== body)
        throw new HttpError(409, "idempotency_conflict");
      return String(concurrent.review_id);
    }
    reserveMailBudget(ctx);
    ctx.db
      .prepare(
        "INSERT INTO reviews(id,stars,comment_plaintext,display_name,visibility_choice,course_category,course_month,original_language,status,created_at,consent_version,consent_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        v.stars,
        v.comment,
        v.visibility_choice === "anonymous" ? "" : v.display_name,
        v.visibility_choice,
        v.course_category,
        v.course_month || null,
        v.original_language,
        "pending_email",
        now,
        v.consent_version,
        now,
      );
    ctx.db
      .prepare(
        "INSERT INTO review_private(review_id,email_cipher,dedupe_hmac,token_digest,token_expiry,manage_digest) VALUES (?,?,?,?,?,?)",
      )
      .run(
        id,
        encrypt(ctx.key, v.email),
        emailKey,
        digest(ctx.key, "confirm:" + confirmation),
        now + 86400_000,
        digest(ctx.key, "manage:" + manage),
      );
    ctx.db
      .prepare("INSERT INTO idempotency VALUES (?,?,?,?)")
      .run(ik, body, id, now);
    const mail = {
      to: v.email,
      language: v.original_language,
      confirm: `${ctx.site}/review/?lang=${v.original_language}#confirm=${confirmation}`,
      manage: `${ctx.site}/review/?lang=${v.original_language}#manage=${manage}`,
    };
    ctx.db
      .prepare(
        "INSERT INTO outbox(review_id,payload_cipher,state,updated_at) VALUES (?,?,'queued',?)",
      )
      .run(id, encrypt(ctx.key, JSON.stringify(mail)), now);
    return id;
  });
  await deliver(ctx, persistedId);
  return { status: "pending_email" };
}
