import { test } from "node:test";
import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDB } from "../src/db.ts";
import { digest } from "../src/crypto.ts";
import { fixture, valid } from "./helpers/fixture.ts";
import { submit } from "../src/submit.ts";
const key = Buffer.alloc(32,7);
const day = digest(key, "mail-budget-day:2026-10-09"), month = digest(key, "mail-budget-month:2026-10");
for (const sameKey of [false, true]) test(`separate SQLite processes wait on held writer and reserve last slot exactly once (same key=${sameKey})`, async () => {
  const dir = mkdtempSync(join(tmpdir(), "quota-contention-")), path = join(dir, "reviews.sqlite");
  const db = openDB(path);
  const workers: ReturnType<typeof fork>[] = [];
  try {
    db.prepare("INSERT INTO rate_limits VALUES (?,?,?)").run(day,89,Date.UTC(2026,9,10));
    db.prepare("INSERT INTO rate_limits VALUES (?,?,?)").run(month,2699,Date.UTC(2026,10,1));
    const ready = [];
    for (let n=0; n<2; n++) {
      const child = fork(new URL("./helpers/quota-contender.ts", import.meta.url), [path, `synthetic-contention-${sameKey ? 0 : n}`, `contention-${sameKey ? 0 : n}@example.invalid`], { execArgv: ["--experimental-strip-types"], stdio: ["ignore","ignore","ignore","ipc"] });
      workers.push(child); ready.push(once(child,"message"));
    }
    await Promise.all(ready);
    db.exec("BEGIN IMMEDIATE");
    const results = workers.map(child => once(child,"message"));
    const exited = workers.map(child => once(child,"exit"));
    for (const child of workers) child.send("go");
    // Hold the writer while independent connections attempt BEGIN IMMEDIATE.
    await new Promise(resolve => setTimeout(resolve,150));
    db.exec("COMMIT");
    const replies = (await Promise.all(results)).map(([r]) => r);
    await Promise.all(exited);
    assert.equal(replies.filter(r => r.ok).length, sameKey ? 2 : 1);
    if (!sameKey) assert.equal(replies.find(r => !r.ok).error, "mail_capacity");
    assert.equal(db.prepare("SELECT count FROM rate_limits WHERE key=?").get(day)!.count,90);
    assert.equal(db.prepare("SELECT count FROM rate_limits WHERE key=?").get(month)!.count,2700);
    for (const table of ["reviews","review_private","outbox","idempotency"]) assert.equal(db.prepare(`SELECT count(*) n FROM ${table}`).get()!.n,1);
    assert.equal(db.prepare("SELECT count(*) n FROM recovery_events WHERE kind='quota'").get()!.n,2);
  } finally { for (const child of workers) if (child.exitCode === null) child.kill(); db.close(); rmSync(dir,{recursive:true,force:true}); }
});
test("monthly and daily denial roll back both counters and journal with no review/outbox", async () => {
  for (const [d,m] of [[5,2700],[90,100]]) {
    const f = fixture();
    try {
      f.db.prepare("INSERT INTO rate_limits VALUES (?,?,?)").run(day,d,Date.UTC(2026,9,10));
      f.db.prepare("INSERT INTO rate_limits VALUES (?,?,?)").run(month,m,Date.UTC(2026,10,1));
      await assert.rejects(() => submit(f.ctx,valid,"synthetic-denied-slot","192.0.2.99"), /mail_capacity/);
      assert.equal(f.db.prepare("SELECT count FROM rate_limits WHERE key=?").get(day)!.count,d);
      assert.equal(f.db.prepare("SELECT count FROM rate_limits WHERE key=?").get(month)!.count,m);
      assert.equal(f.db.prepare("SELECT count(*) n FROM recovery_events").get()!.n,0);
      assert.equal(f.db.prepare("SELECT count(*) n FROM reviews").get()!.n,0);
      assert.equal(f.db.prepare("SELECT count(*) n FROM outbox").get()!.n,0);
    } finally { f.db.close(); }
  }
});
