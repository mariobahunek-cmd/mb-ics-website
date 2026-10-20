// Independent real process boundary; the file ledger is a SYNTHETIC provider,
// separate from Reviews SQLite. Exit23 models death after provider acceptance.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { openDB } from "../../src/db.ts";
import { submit } from "../../src/submit.ts";
import { retryMail } from "../../src/mail.ts";
import { sendSharedMail } from "../../src/mail-provider.ts";
import { valid } from "./fixture.ts";
import type { Context } from "../../src/context.ts";
const [directory, phase, outcome] = process.argv.slice(2);
const db = openDB(join(directory, "reviews.sqlite"));
const providerFile = join(directory, "synthetic-provider.json");
let now = Date.UTC(2026,9,17,12);
const transport: typeof fetch = async (_input, init) => {
  const entry = {key: new Headers(init?.headers).get("Idempotency-Key"), body: String(init?.body)};
  const prior = existsSync(providerFile) ? JSON.parse(readFileSync(providerFile,"utf8")) : null;
  if (prior) assert.deepEqual(entry, prior.entry, "restart must reuse exact original provider identity/payload");
  const ledger = {entry, calls: (prior?.calls ?? 0) + 1, accepted: prior?.accepted ?? 0};
  if (outcome === "queued429" && phase === "initial") {
    writeFileSync(providerFile, JSON.stringify(ledger), {mode:0o600});
    return new Response(JSON.stringify({name:"daily_quota_exceeded"}), {status:429});
  }
  ledger.accepted = 1; // Synthetic provider deduplicates the original same key.
  writeFileSync(providerFile, JSON.stringify(ledger), {mode:0o600});
  if (phase === "initial") process.exit(23);
  return new Response(JSON.stringify({id:"00000000-0000-4000-8000-000000000001"}));
};
const ctx: Context = {db, key:Buffer.alloc(32,7), site:"https://public.invalid", now:()=>now,
  mailEnabled:true, challenge:async()=>true,
  send:(mail,id,dispatch)=>sendSharedMail({apiKey:"synthetic",from:"reviews@example.invalid"},mail,id,transport,dispatch)};
try {
  if (phase === "initial") await submit(ctx, valid, "restart-shared-00001", "ip");
  else if (phase === "late") {
    const before = readFileSync(providerFile,"utf8");
    const row = db.prepare("SELECT * FROM outbox").get()!;
    now += 86400000 - 1000;
    await retryMail(ctx);
    await submit(ctx, valid, "restart-shared-00001", "ip");
    assert.equal(readFileSync(providerFile,"utf8"),before);
    assert.deepEqual(db.prepare("SELECT * FROM outbox").get(),row);
    console.log(JSON.stringify({proof:"real-process-late-retry-refused",outcome}));
  }
  else {
    const before = JSON.parse(readFileSync(providerFile,"utf8"));
    await retryMail(ctx); assert.equal(JSON.parse(readFileSync(providerFile,"utf8")).calls,before.calls);
    now += 300001;
    await Promise.all([retryMail(ctx), retryMail(ctx)]);
    await submit(ctx, valid, "restart-shared-00001", "ip");
    const row = db.prepare("SELECT * FROM outbox").get()!;
    assert.equal(row.state,"sent"); assert.equal(row.attempts,2); assert.equal(row.payload_cipher,"");
    const after = JSON.parse(readFileSync(providerFile,"utf8")); assert.equal(after.calls,2); assert.equal(after.accepted,1);
    assert.equal(db.prepare("SELECT count(*) n FROM reviews").get()!.n,1);
    assert.equal(db.prepare("SELECT status FROM reviews").get()!.status,"pending_email");
    assert.equal(db.prepare("SELECT count(*) n FROM recovery_events WHERE kind='quota'").get()!.n,2);
    console.log(JSON.stringify({proof:"real-process-shared-mail-restart",outcome,attempts:row.attempts,providerCalls:after.calls,syntheticAccepted:after.accepted}));
  }
} finally {db.close();}
