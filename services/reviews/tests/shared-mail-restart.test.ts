import {test} from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtemp, rm, readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {openDB} from "../src/db.ts";
for (const outcome of ["accepted-crash", "queued429"]) test(`shared mail real process restart after ${outcome} retains exact idempotency and one reservation`, async () => {
  const dir = await mkdtemp(join(tmpdir(), "shared-mail-restart-"));
  const worker = new URL("./helpers/shared-mail-restart.ts", import.meta.url).pathname;
  try {
    const first = spawnSync(process.execPath, ["--experimental-strip-types", worker, dir, "initial", outcome], {encoding:"utf8",timeout:10000});
    assert.equal(first.status, outcome === "accepted-crash" ? 23 : 0, first.stdout+first.stderr);
    const db = openDB(join(dir,"reviews.sqlite"));
    try {
      const row = db.prepare("SELECT * FROM outbox").get()!;
      assert.equal(row.attempts,1); assert.equal(row.state, outcome === "accepted-crash" ? "sending" : "queued");
      assert.ok(String(row.payload_cipher).length > 0);
      assert.equal(db.prepare("SELECT status FROM reviews").get()!.status,"pending_email");
    } finally {db.close();}
    const second = spawnSync(process.execPath, ["--experimental-strip-types", worker, dir, "retry", outcome], {encoding:"utf8",timeout:10000});
    assert.equal(second.status,0,second.stdout+second.stderr);
    assert.ok(second.stdout.includes('"proof":"real-process-shared-mail-restart"'));
    const provider = JSON.parse(await readFile(join(dir,"synthetic-provider.json"),"utf8"));
    assert.equal(provider.calls,2); assert.equal(provider.accepted,1);
  } finally {await rm(dir,{recursive:true,force:true});}
});
for (const outcome of ["accepted-crash", "queued429"]) test(`late real restart after ${outcome} refuses unsafe dispatch`, async () => {
  const dir = await mkdtemp(join(tmpdir(), "shared-mail-late-restart-"));
  const worker = new URL("./helpers/shared-mail-restart.ts", import.meta.url).pathname;
  try {
    const first = spawnSync(process.execPath, ["--experimental-strip-types", worker, dir, "initial", outcome], {encoding:"utf8",timeout:10000});
    assert.equal(first.status, outcome === "accepted-crash" ? 23 : 0, first.stdout+first.stderr);
    const second = spawnSync(process.execPath, ["--experimental-strip-types", worker, dir, "late", outcome], {encoding:"utf8",timeout:10000});
    assert.equal(second.status,0,second.stdout+second.stderr);
    assert.ok(second.stdout.includes('"proof":"real-process-late-retry-refused"'));
  } finally {await rm(dir,{recursive:true,force:true});}
});
