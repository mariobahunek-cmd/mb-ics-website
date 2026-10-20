import type { Context } from "./context.ts";
import { digest } from "./crypto.ts";
import { HttpError } from "./schema.ts";

// Called inside the same SQLite transaction as new-review/outbox persistence.
// Reserve even if delivery later fails; retries of that review reuse its reservation.
// Resend usage/headers are observations, not an atomic allocation across senders.
// Owner accepts the existing shared pool (2026-10-17). Local limits protect
// Reviews load only; no capacity guarantee or global reservation is claimed.
export function requireMailEnabled(ctx: Pick<Context, "mailEnabled">) {
  if (ctx.mailEnabled !== true) throw new HttpError(503, "mail_paused");
}
export function reserveMailBudget(ctx: Context) {
  requireMailEnabled(ctx);
  const now = new Date(ctx.now());
  const key = digest(ctx.key, "mail-budget-day:" + now.toISOString().slice(0, 10));
  const expires = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const row = ctx.db.prepare(
    "INSERT INTO rate_limits(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
  ).get(key, expires);
  if (Number(row!.count) > 90) throw new HttpError(503, "mail_capacity");
  const monthKey = digest(ctx.key, "mail-budget-month:" + now.toISOString().slice(0, 7));
  const monthExpires = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  const month = ctx.db.prepare(
    "INSERT INTO rate_limits(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
  ).get(monthKey, monthExpires);
  if (Number(month!.count) > 2700) throw new HttpError(503, "mail_capacity");
  // Anonymous absolute floors survive restores; journal and reservation roll back together.
  const journal = ctx.db.prepare("INSERT INTO recovery_events(kind,object_id,count,expires_at) VALUES ('quota',?,?,?)");
  journal.run(key, Number(row!.count), expires);
  journal.run(monthKey, Number(month!.count), monthExpires);
}
