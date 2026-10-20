import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import type { Context } from "../src/context.ts";
import { openDB, transaction } from "../src/db.ts";
interface Historical {
  source: string;
  source_id: string;
  source_rating: number | null;
  source_scale: number | null;
  original_date: string;
  comment_plaintext: string;
  display_name: string;
  original_language: string | null;
  permission_proof: string;
  rights_confirmed: boolean;
  provenance?: Record<string, string | null>;
}
// Form validation is deliberately not an authorization or a database writer.
export function validateHistorical(input: unknown) {
  if (!Array.isArray(input) || input.length > 10000)
    throw new Error("Expected at most 10000 authorized rows");
  const rows: Historical[] = [];
  const seen = new Set<string>();
  input.forEach((v, i) => {
    const fail = () => {
      throw new Error(`Invalid row ${i + 1}`);
    };
    if (
      !v ||
      typeof v !== "object" ||
      !["ProvenExpert", "LinkedIn"].includes(v.source) ||
      typeof v.rights_confirmed !== "boolean"
    )
      fail();
    for (const [k, max] of Object.entries({
      source_id: 200,
      comment_plaintext: 3000,
      display_name: 80,
      permission_proof: 500,
    }))
      if (typeof v[k] !== "string" || v[k].length > max) fail();
    if (
      !v.source_id.trim() || v.source_id.startsWith("@") ||
      (v.original_language !== null && !["en", "de", "es"].includes(v.original_language)) ||
      (v.source === "LinkedIn"
        ? (v.source_rating !== null || v.source_scale !== null ||
           v.item_type !== "recommendation" || v.received_or_given !== "received" ||
           !v.comment_plaintext.trim() || !v.source_url || !v.platform_source_id)
        : (typeof v.source_rating !== "number" || typeof v.source_scale !== "number" ||
           !Number.isFinite(v.source_rating) || !Number.isFinite(v.source_scale) ||
           v.source_scale <= 0 || v.source_rating < 0 || v.source_rating > v.source_scale ||
           (v.item_type !== undefined && !["review", "rating_only"].includes(v.item_type)) ||
           (v.item_type === "rating_only" && v.comment_plaintext !== "")))
    )
      fail();
    if (
      typeof v.original_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(v.original_date) ||
      !Number.isFinite(Date.parse(v.original_date)) ||
      new Date(v.original_date).toISOString().slice(0, 10) !==
        v.original_date ||
      v.original_date > new Date().toISOString().slice(0, 10)
    )
      fail();
    const provenance: Record<string, string | null> = {};
    // A reviewer decides equivalence; names, translated text and resemblance cannot.
    if (["canonical_id", "canonical_decision_reference", "homepage_id"].some(k => v[k] !== undefined)) {
      if (typeof v.canonical_id !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v.canonical_id) ||
          typeof v.canonical_decision_reference !== "string" || !v.canonical_decision_reference.trim() || v.canonical_decision_reference.length > 200 ||
          (v.homepage_id !== undefined && (typeof v.homepage_id !== "string" || !/^homepage\/[a-f0-9]{64}$/.test(v.homepage_id)))) fail();
      provenance.canonical_id = v.canonical_id;
      provenance.canonical_decision_reference = v.canonical_decision_reference;
      if (v.homepage_id !== undefined) provenance.homepage_id = v.homepage_id;
    }
    for (const [key, max] of Object.entries({
      item_type: 30, received_or_given: 20, relationship: 500, source_url: 2000,
      source_permalink: 2000, platform_source_id: 200, platform_uuid: 200,
      original_date_raw: 100, date_locale: 30, source_rating_raw: 50,
      rating_display_raw: 100, content_sha256: 64, source_visibility: 100,
      original_language_basis: 200, permalink_kind: 100,
    })) {
      if (v[key] === undefined) continue;
      if (v[key] !== null && (typeof v[key] !== "string" || v[key].length > max)) fail();
      if (v[key] !== null && ["source_url", "source_permalink"].includes(key)) {
        try { const url = new URL(v[key]); if (url.protocol !== "https:" || url.username || url.password) fail(); }
        catch { fail(); }
      }
      if (key === "content_sha256" && v[key] !== null && !/^[a-f0-9]{64}$/.test(v[key])) fail();
      provenance[key] = v[key];
    }
    if (seen.has(v.source_id))
      throw new Error(`Duplicate source ID at row ${i + 1}`);
    seen.add(v.source_id);
    rows.push({
      source: v.source,
      source_id: v.source_id,
      source_rating: v.source_rating,
      source_scale: v.source_scale,
      original_date: v.original_date,
      comment_plaintext: v.comment_plaintext,
      display_name: v.display_name,
      original_language: v.original_language,
      permission_proof: v.permission_proof,
      rights_confirmed: v.rights_confirmed,
      ...(Object.keys(provenance).length ? { provenance } : {}),
    });
  });
  return {
    count: rows.length,
    digest: createHash("sha256").update(JSON.stringify(rows)).digest("hex"),
    rows,
  };
}
export function planImport(input: unknown) {
  const plan = validateHistorical(input);
  plan.rows.forEach((row, i) => {
    if (row.rights_confirmed !== true || !row.permission_proof.trim())
      throw new Error(`Unconfirmed rights or permission reference at row ${i + 1}`);
  });
  return plan;
}
export function applyImport(
  ctx: Pick<Context, "db" | "now">,
  input: unknown,
  approvedDigest: string,
) {
  const plan = planImport(input);
  if (plan.digest !== approvedDigest)
    throw new Error("Explicit approval digest does not match dry-run");
  return transaction(ctx.db, () => {
    function recordImport(row: Historical) {
      ctx.db.prepare("INSERT INTO audit(review_id,actor,action,reason,created_at) VALUES (?,'authorized-import-cli','historical_import',?,?)")
        .run(row.source_id, JSON.stringify({approved_digest:plan.digest,source:row.source,
          item_type:row.provenance?.item_type ?? (row.comment_plaintext ? "review" : "rating_only"),
          source_rating:row.source_rating,source_scale:row.source_scale,
          original_date:row.original_date,original_language:row.original_language,
          status:String(ctx.db.prepare("SELECT status FROM historical WHERE source_id=?").get(row.source_id)!.status),rights_confirmed:true,
          ...(row.provenance?.canonical_id ? {canonical_decision:true} : {})}),ctx.now());
    }
    let inserted = 0;
    for (const row of plan.rows) {
      const prior = ctx.db
        .prepare("SELECT * FROM historical WHERE source_id=?")
        .get(row.source_id);
      if (prior) {
        for (const key of [
          "source",
          "source_rating",
          "source_scale",
          "original_date",
          "comment_plaintext",
          "display_name",
          "original_language",
          "permission_proof",
        ] as const)
          if (prior[key] !== row[key])
            throw new Error("Existing source conflict; no rows imported");
        if (prior.status === "withdrawn") throw new Error("Withdrawn source conflict; no rows imported");
        const stored = ctx.db.prepare("SELECT provenance_json FROM historical_provenance WHERE source_id=?").get(row.source_id);
        const previous = stored ? JSON.parse(String(stored.provenance_json)) : {};
        const proposed = row.provenance ?? {};
        if (JSON.stringify(previous) !== JSON.stringify(proposed)) {
          const withoutCanonical = (p: Record<string,string|null>) => Object.fromEntries(Object.entries(p).filter(([k]) => !["canonical_id","canonical_decision_reference","homepage_id"].includes(k)));
          // Only append a first explicit decision. Never replace an existing group,
          // original provenance, rights reference or source body.
          if (previous.canonical_id || !proposed.canonical_id || JSON.stringify(withoutCanonical(previous)) !== JSON.stringify(withoutCanonical(proposed)))
            throw new Error("Existing source provenance conflict; no rows imported");
          ctx.db.prepare("INSERT INTO historical_identity VALUES (?,?,?)").run(row.source_id,proposed.canonical_id,proposed.homepage_id ?? null);
          ctx.db.prepare("INSERT INTO historical_provenance VALUES (?,?) ON CONFLICT(source_id) DO UPDATE SET provenance_json=excluded.provenance_json").run(row.source_id,JSON.stringify(proposed));
          recordImport(row);
        }
        continue;
      }
      ctx.db
        .prepare(
          "INSERT INTO historical(source_id,source,source_rating,source_scale,original_date,imported_at,comment_plaintext,display_name,original_language,permission_proof,status) VALUES (?,?,?,?,?,?,?,?,?,?,'pending_moderation')",
        )
        .run(
          row.source_id,
          row.source,
          row.source_rating,
          row.source_scale,
          row.original_date,
          ctx.now(),
          row.comment_plaintext,
          row.display_name,
          row.original_language,
          row.permission_proof,
        );
      if (row.provenance) ctx.db.prepare("INSERT INTO historical_provenance VALUES (?,?)")
        .run(row.source_id, JSON.stringify(row.provenance));
      if (row.provenance?.canonical_id) ctx.db.prepare("INSERT INTO historical_identity VALUES (?,?,?)")
        .run(row.source_id, row.provenance.canonical_id, row.provenance.homepage_id ?? null);
      recordImport(row);
      inserted++;
    }
    return { inserted, unchanged: plan.count - inserted };
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const args = process.argv.slice(2),
      file = args[0];
    if (!file)
      throw new Error(
        "Usage: import-authorized-reviews.ts private.json [--apply --db path --approved-digest SHA256]",
      );
    const input = JSON.parse(readFileSync(file, "utf8"));
    if (args.includes("--validate-only")) {
      if (args.includes("--apply")) throw new Error("Validation cannot apply");
      const validation = validateHistorical(input);
      console.log(JSON.stringify({mode:"validate-only",count:validation.count,digest:validation.digest,
        unconfirmed_rights:validation.rows.filter(row=>!row.rights_confirmed || !row.permission_proof.trim()).length,
        note:"Shape only; no authorization, publication or database writes."}));
      process.exit(0);
    }
    const plan = planImport(input);
    if (!args.includes("--apply"))
      console.log(
        JSON.stringify({
          mode: "dry-run",
          count: plan.count,
          digest: plan.digest,
          note: "Rights and permission references require human verification before apply.",
        }),
      );
    else {
      const path = args[args.indexOf("--db") + 1],
        approved = args[args.indexOf("--approved-digest") + 1];
      if (!args.includes("--db") || !args.includes("--approved-digest"))
        throw new Error("Apply requires --db and --approved-digest");
      const db = openDB(path);
      try {
        console.log(
          JSON.stringify(applyImport({ db, now: Date.now }, input, approved)),
        );
      } finally {
        db.close();
      }
    }
  } catch (e) {
    console.error(
      e instanceof SyntaxError
        ? "Invalid JSON"
        : e instanceof Error
          ? e.message
          : "Import failed",
    );
    process.exitCode = 1;
  }
}
