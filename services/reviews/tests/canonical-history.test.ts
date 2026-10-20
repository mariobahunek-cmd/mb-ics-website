import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/fixture.ts";
import { planImport, applyImport } from "../scripts/import-authorized-reviews.ts";
import { historicalList, summary } from "../src/public.ts";
import { publishHistorical, withdrawHistorical } from "../src/admin.ts";
import { createApp } from "../src/index.ts";
import { backupDatabase, restoreDatabase, localRecoveryJournal, syncRecovery, recoveryHead, reconcileRecovery } from "../src/operations.ts";
import { openDB } from "../src/db.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const actor={sub:"synthetic-owner",role:"moderator" as const};
const group="11111111-1111-4111-8111-111111111111";
const homepage="homepage/"+"a".repeat(64);
function row(id:string, patch:Record<string,unknown>={}) {
  return {source:"ProvenExpert",source_id:id,source_rating:4.8,source_scale:5,original_date:"2020-01-01",comment_plaintext:"Synthetic full experience",display_name:"Synthetic",original_language:"de",permission_proof:"synthetic-rights",rights_confirmed:true,...patch};
}
function linked(id:string, patch:Record<string,unknown>={}) {
  return row(id,{canonical_id:group,canonical_decision_reference:"synthetic-explicit-equivalence",homepage_id:homepage,...patch});
}
function publish(ctx:any, input:any[]) {
  const plan=planImport(input);applyImport(ctx,input,plan.digest);
  for(const r of input) publishHistorical(ctx,actor,r.source_id,{manual_approval:true,rights_confirmed:true,approved_digest:plan.digest,reason:"synthetic"},"synthetic-release");
}
test("explicit canonical decisions collapse translated/shortened source rows, never raw native aggregates",()=>{
  const {ctx,db}=fixture();
  try {
    publish(ctx,[linked("synthetic-a"),linked("synthetic-b",{comment_plaintext:"Synthetic shortened translation",original_language:"es"})]);
    const list=historicalList(ctx,new URLSearchParams());
    assert.equal(list.count,1);assert.equal(list.items.length,1);
    assert.deepEqual(list.source_counts,{ProvenExpert:1});assert.equal(summary(ctx).count,0);
    assert.equal(db.prepare("SELECT count(*) n FROM historical").get()!.n,2);
    const id=list.items[0].id;
    publish(ctx,[linked("synthetic-c",{original_language:"en"})]);
    assert.equal(historicalList(ctx,new URLSearchParams()).items[0].id,id);
    assert.ok(!JSON.stringify(list).includes(group));assert.ok(!JSON.stringify(list).includes("synthetic-explicit-equivalence"));
  } finally {db.close();}
});
test("same author/text/date do not imply equivalence; mapping evidence is mandatory and digest bound",()=>{
  const {ctx,db}=fixture();
  try {
    publish(ctx,[row("synthetic-separate-a"),row("synthetic-separate-b")]);
    assert.equal(historicalList(ctx,new URLSearchParams()).count,2);
    for(const patch of [{canonical_decision_reference:""},{canonical_id:"human-name"},{homepage_id:"homepage/14"},{canonical_id:undefined}])
      assert.throws(()=>planImport([linked("synthetic-invalid",patch)]),/row|canonical/i);
    const input=[linked("synthetic-bound")],plan=planImport(input);
    assert.throws(()=>applyImport(ctx,[linked("synthetic-bound",{canonical_decision_reference:"synthetic-changed"})],plan.digest),/digest/);
    assert.throws(()=>planImport([row("@canonical/"+group)]),/row|reserved/i);
  } finally {db.close();}
});
test("homepage suppression exposes only opaque public archive aliases and denies unrelated origins/methods",async()=>{
  const {ctx,db}=fixture();
  try {
    const input=[linked("synthetic-pending")];applyImport(ctx,input,planImport(input).digest);
    const app=createApp(ctx,{local:true,origins:[ctx.site],authenticate:async()=>null});
    const response=await app(new Request(ctx.site+"/v1/historical/identities"));
    assert.equal(response.status,200);assert.deepEqual(await response.json(),{homepage_suppressed:[homepage]});
    assert.equal((await app(new Request(ctx.site+"/v1/historical/identities",{headers:{origin:"https://unrelated.invalid"}}))).status,403);
    assert.equal((await app(new Request(ctx.site+"/v1/historical/identities",{method:"POST",headers:{origin:ctx.site,"content-type":"application/json"},body:"{}"}))).status,404);
  } finally {db.close();}
});
test("canonical withdrawal erases every linked body; new source IDs cannot resurrect after pre-import restore",async()=>{
  const {ctx,db}=fixture(),dir=mkdtempSync(join(tmpdir(),"synthetic-canonical-"));
  const journal=localRecoveryJournal(join(dir,"journal.sqlite"));
  try {
    const backup=join(dir,"backup.sqlite"),dest=join(dir,"restored.sqlite");await backupDatabase(db,backup);
    publish(ctx,[linked("synthetic-a"),linked("synthetic-b")]);
    withdrawHistorical(ctx,actor,"synthetic-b");
    assert.equal(historicalList(ctx,new URLSearchParams()).count,0);
    assert.equal(db.prepare("SELECT count(*) n FROM historical WHERE status='withdrawn' AND comment_plaintext='' AND display_name=''").get()!.n,2);
    assert.equal(db.prepare("SELECT count(*) n FROM historical_provenance").get()!.n,0);
    assert.throws(()=>applyImport(ctx,[linked("synthetic-new-id")],planImport([linked("synthetic-new-id")]).digest),/tombstone|withdrawn/i);
    await syncRecovery(db,journal);await restoreDatabase(backup,dest);await reconcileRecovery(dest,journal,recoveryHead(db),ctx.now());
    const restored=openDB(dest);
    try {
      const recovered={...ctx,db:restored};
      assert.throws(()=>applyImport(recovered,[linked("synthetic-new-id")],planImport([linked("synthetic-new-id")]).digest),/tombstone|withdrawn/i);
      const app=createApp(recovered,{local:true,origins:[ctx.site],authenticate:async()=>null});
      assert.deepEqual(await (await app(new Request(ctx.site+"/v1/historical/identities"))).json(),{homepage_suppressed:[homepage]});
      assert.equal(restored.prepare("PRAGMA integrity_check").get()!.integrity_check,"ok");
    } finally {restored.close();}
  } finally {journal.close();db.close();rmSync(dir,{recursive:true,force:true});}
});
test("canonical counts and representative pagination describe the same snapshot",()=>{
  const {ctx,db}=fixture();
  try {
    const input=Array.from({length:25},(_,i)=>row("synthetic-page-"+String(i).padStart(2,"0")));
    input.push(linked("synthetic-group-a"),linked("synthetic-group-b"));publish(ctx,input);
    const first=historicalList(ctx,new URLSearchParams()),second=historicalList(ctx,new URLSearchParams({offset:"20"}));
    assert.equal(first.count,26);assert.equal(first.items.length,20);assert.equal(first.next_offset,20);
    assert.equal(second.items.length,6);assert.equal(second.next_offset,null);
    assert.equal(new Set([...first.items,...second.items].map(r=>r.id)).size,26);
    assert.equal(Object.values(first.source_counts).reduce((a,b)=>a+b,0),26);
  } finally {db.close();}
});
