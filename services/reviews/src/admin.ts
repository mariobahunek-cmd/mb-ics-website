import type { Context } from "./context.ts";
import { transaction } from "./db.ts";
import { HttpError } from "./schema.ts";
export interface Actor {
  sub: string;
  role: "moderator";
}
export function authorize(actor: Actor | null): asserts actor is Actor {
  if (!actor || actor.role !== "moderator" || !actor.sub)
    throw new HttpError(401, "unauthorized");
}
export function adminList(ctx: Context, actor: Actor | null, offset = 0) {
  authorize(actor);
  if (!Number.isSafeInteger(offset) || offset < 0)
    throw new HttpError(400, "offset");
  return ctx.db
    .prepare(
      "SELECT id,stars,comment_plaintext,display_name,course_category,original_language,status,created_at FROM reviews ORDER BY created_at DESC,id DESC LIMIT 50 OFFSET ?",
    )
    .all(offset);
}
const rejection = [
  "spam",
  "duplicate",
  "third_party_personal_data",
  "sensitive_personal_data",
  "unlawful",
  "unrelated_training",
];
export function moderate(
  ctx: Context,
  actor: Actor | null,
  id: string,
  status: string,
  reason: string,
) {
  authorize(actor);
  if (!["published", "rejected", "withdrawn"].includes(status))
    throw new HttpError(400, "status");
  if (
    typeof reason !== "string" ||
    reason.length > 200 ||
    !reason.trim() ||
    (status === "rejected" && !rejection.includes(reason))
  )
    throw new HttpError(400, "reason");
  return transaction(ctx.db, () => {
    const row = ctx.db.prepare("SELECT status FROM reviews WHERE id=?").get(id);
    const allowed =
      status === "published"
        ? ["pending_moderation"]
        : status === "rejected"
          ? ["pending_moderation"]
          : ["published", "pending_moderation", "rejected", "pending_email"];
    if (!row || !allowed.includes(String(row.status)))
      throw new HttpError(409, "transition");
    ctx.db
      .prepare(
        "UPDATE reviews SET status=?,published_at=CASE WHEN ?='published' THEN ? ELSE published_at END WHERE id=?",
      )
      .run(status, status, ctx.now(), id);
    if (status === "withdrawn") {
      ctx.db
        .prepare(
          "UPDATE reviews SET comment_plaintext='',display_name='',course_month=NULL WHERE id=?",
        )
        .run(id);
      ctx.db.prepare("DELETE FROM review_private WHERE review_id=?").run(id);
      ctx.db.prepare("DELETE FROM outbox WHERE review_id=?").run(id);
      ctx.db.prepare("DELETE FROM idempotency WHERE review_id=?").run(id);
    }
    ctx.db
      .prepare(
        "INSERT INTO audit(review_id,actor,action,reason,created_at) VALUES (?,?,?,?,?)",
      )
      .run(id, actor.sub, status, reason, ctx.now());
    return { status };
  });
}
export function auditList(ctx: Context, actor: Actor | null, offset = 0) {
  authorize(actor);
  if (!Number.isSafeInteger(offset) || offset < 0)
    throw new HttpError(400, "offset");
  return ctx.db
    .prepare("SELECT * FROM audit ORDER BY id DESC LIMIT 100 OFFSET ?")
    .all(offset);
}
export function redact(
  ctx: Context,
  actor: Actor | null,
  id: string,
  remove: unknown,
) {
  authorize(actor);
  if (typeof remove !== "string" || !remove.trim() || remove.length > 3000)
    throw new HttpError(400, "redaction");
  return transaction(ctx.db, () => {
    const row = ctx.db
      .prepare(
        "SELECT comment_plaintext,status,original_language FROM reviews WHERE id=?",
      )
      .get(id);
    if (
      !row ||
      !["pending_moderation", "published"].includes(String(row.status)) ||
      !String(row.comment_plaintext).includes(remove)
    )
      throw new HttpError(409, "redaction");
    const labels: Record<string, string> = {
      en: "[personal data removed]",
      de: "[personenbezogene Daten entfernt]",
      es: "[datos personales eliminados]",
    };
    const redacted = String(row.comment_plaintext)
      .split(remove)
      .join(labels[String(row.original_language)]);
    if (redacted.length > 3000) throw new HttpError(400, "redaction_length");
    ctx.db
      .prepare("UPDATE reviews SET comment_plaintext=? WHERE id=?")
      .run(redacted, id);
    ctx.db
      .prepare(
        "INSERT INTO audit(review_id,actor,action,reason,created_at) VALUES (?,?,'redacted','third_party_personal_data',?)",
      )
      .run(id, actor.sub, ctx.now());
    return { status: String(row.status) };
  });
}
export function publishHistorical(
  ctx: Context, actor: Actor | null, sourceId: string,
  approval: Record<string, unknown>, releaseReference: string | null,
) {
  authorize(actor);
  // Server-side privacy/source-rights release; no request/date flag can lift it.
  if (!releaseReference?.trim()) throw new HttpError(423, "historical_release_hold");
  if (approval.manual_approval !== true || approval.rights_confirmed !== true)
    throw new HttpError(403, "historical_manual_rights");
  if (typeof approval.reason !== "string" || !approval.reason.trim() || approval.reason.length > 200)
    throw new HttpError(400, "reason");
  return transaction(ctx.db, () => {
    const row = ctx.db.prepare("SELECT * FROM historical WHERE source_id=?").get(sourceId);
    if (!row || row.status !== "pending_moderation") throw new HttpError(409, "transition");
    const imported = ctx.db.prepare("SELECT reason FROM audit WHERE review_id=? AND action='historical_import' ORDER BY id DESC LIMIT 1").get(sourceId);
    let evidence: Record<string, unknown> = {};
    try { evidence = JSON.parse(String(imported?.reason)); } catch { /* No authorization from private preparation/legacy audit. */ }
    if (evidence.rights_confirmed !== true || evidence.source !== row.source || !String(row.permission_proof).trim())
      throw new HttpError(403, "historical_import_rights");
    if (approval.approved_digest !== evidence.approved_digest)
      throw new HttpError(409, "historical_approval_digest");
    ctx.db.prepare("UPDATE historical SET status='published' WHERE source_id=?").run(sourceId);
    ctx.db.prepare("INSERT INTO audit(review_id,actor,action,reason,created_at) VALUES (?,?,'historical_published',?,?)")
      .run("historical:" + sourceId, actor.sub, JSON.stringify({ reason: approval.reason,
        release_reference: releaseReference, approved_digest: evidence.approved_digest,
        source: row.source, manual_approval: true, rights_confirmed: true }), ctx.now());
    return { status: "published" };
  });
}
export function withdrawHistorical(
  ctx: Context,
  actor: Actor | null,
  sourceId: string,
) {
  authorize(actor);
  return eraseHistorical(ctx,actor,sourceId);
}
export function rejectHistorical(ctx: Context, actor: Actor | null, sourceId: string, approval: Record<string,unknown>) {
  authorize(actor);
  if (approval.manual_rejection !== true) throw new HttpError(403,"historical_manual_rejection");
  if (typeof approval.reason !== "string" || !rejection.includes(approval.reason)) throw new HttpError(400,"reason");
  return eraseHistorical(ctx,actor,sourceId,approval.reason);
}
function eraseHistorical(ctx: Context,actor: Actor,sourceId: string,rejectReason?: string) {
  return transaction(ctx.db, () => {
    const original = ctx.db.prepare("SELECT status FROM historical WHERE source_id=?").get(sourceId);
    if (!original || original.status === "withdrawn" || (rejectReason && original.status !== "pending_moderation")) throw new HttpError(409, "transition");
    const identity = ctx.db.prepare("SELECT canonical_id FROM historical_identity WHERE source_id=?").get(sourceId);
    const members = identity
      ? ctx.db.prepare("SELECT h.source_id,i.homepage_id FROM historical h JOIN historical_identity i USING(source_id) WHERE i.canonical_id=? AND h.status<>'withdrawn'").all(identity.canonical_id)
      : [{source_id:sourceId,homepage_id:null}];
    const markers = new Set<string>();
    if (identity) markers.add("@canonical/" + identity.canonical_id);
    for (const member of members) {
      if (rejectReason) {
        ctx.db.prepare("INSERT INTO historical_moderation VALUES (?,'rejected',?,?)").run(member.source_id,rejectReason,ctx.now());
        ctx.db.prepare("INSERT INTO audit(review_id,actor,action,reason,created_at) VALUES (?,?,'historical_rejected',?,?)").run("historical:"+member.source_id,actor.sub,rejectReason,ctx.now());
      }
      ctx.db.prepare("UPDATE historical SET status='withdrawn',comment_plaintext='',display_name='' WHERE source_id=?").run(member.source_id);
      markers.add(String(member.source_id));
      if (member.homepage_id) markers.add("@" + member.homepage_id);
    }
    // Existing immutable erasure journal covers rejected source/group/archive
    // aliases too. A stale restore closes them as withdrawn, never republishing.
    for (const marker of markers) ctx.db.prepare("INSERT INTO audit(review_id,actor,action,reason,created_at) VALUES (?,?,'historical_withdrawn',?,?)")
      .run("historical:" + marker, actor.sub, rejectReason ?? "author_request",ctx.now());
    return { status: rejectReason ? "rejected" : "withdrawn" };
  });
}
export function historicalAdminList(ctx: Context,actor: Actor | null,offset=0) {
  authorize(actor);
  if (!Number.isSafeInteger(offset) || offset<0) throw new HttpError(400,"offset");
  return ctx.db.prepare("SELECT h.*,m.decision FROM historical h LEFT JOIN historical_moderation m USING(source_id) ORDER BY h.original_date DESC,h.source_id LIMIT 50 OFFSET ?").all(offset).map(row=>{
    let evidence: Record<string,unknown>={};
    const audit=ctx.db.prepare("SELECT reason FROM audit WHERE review_id=? AND action='historical_import' ORDER BY id DESC LIMIT 1").get(row.source_id);
    try {evidence=JSON.parse(String(audit?.reason));} catch { /* private prep is not rights */ }
    const provenance=ctx.db.prepare("SELECT provenance_json FROM historical_provenance WHERE source_id=?").get(row.source_id);
    return {...row,status:row.decision ?? row.status,
      import_rights_confirmed:evidence.rights_confirmed===true && evidence.source===row.source && !!String(row.permission_proof).trim(),
      approved_digest:typeof evidence.approved_digest==='string'?evidence.approved_digest:null,
      provenance:provenance?JSON.parse(String(provenance.provenance_json)):null};
  });
}
