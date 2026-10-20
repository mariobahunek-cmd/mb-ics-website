import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/fixture.ts";
import { planImport, applyImport } from "../scripts/import-authorized-reviews.ts";
import { publishHistorical, withdrawHistorical } from "../src/admin.ts";
import { historicalList, homepageIdentities } from "../src/public.ts";
import { exportOwner, backupDatabase, restoreDatabase, localRecoveryJournal, syncRecovery, recoveryHead, reconcileRecovery } from "../src/operations.ts";
import { openDB } from "../src/db.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const actor={sub:"synthetic-owner",role:"moderator" as const};
const common={original_date:"2020-01-01",comment_plaintext:"Synthetic experience",display_name:"Synthetic",original_language:"de",permission_proof:"synthetic-rights",rights_confirmed:true,canonical_id:"11111111-1111-4111-8111-111111111111",canonical_decision_reference:"synthetic-reviewed-equivalence",homepage_id:"homepage/"+"b".repeat(64)};
const prove={...common,source:"ProvenExpert",source_id:"synthetic-prove",source_rating:4.8,source_scale:5};
const li={...common,source:"LinkedIn",source_id:"LinkedIn/synthetic-original",source_rating:null,source_scale:null,item_type:"recommendation",received_or_given:"received",platform_source_id:"synthetic-original",source_url:"https://source.invalid/synthetic"};
test("cross-source equivalence preserves originals, requires publication per member, never invents LinkedIn stars",()=>{
 const {ctx,db}=fixture();
 try {
  const input=[prove,li],plan=planImport(input);applyImport(ctx,input,plan.digest);
  publishHistorical(ctx,actor,prove.source_id,{manual_approval:true,rights_confirmed:true,approved_digest:plan.digest,reason:"synthetic"},"synthetic-release");
  assert.equal(db.prepare("SELECT status FROM historical WHERE source_id=?").get(li.source_id)!.status,"pending_moderation");
  const first=historicalList(ctx,new URLSearchParams());assert.equal(first.count,1);
  publishHistorical(ctx,actor,li.source_id,{manual_approval:true,rights_confirmed:true,approved_digest:plan.digest,reason:"synthetic"},"synthetic-release");
  const both=historicalList(ctx,new URLSearchParams());assert.equal(both.count,1);assert.equal(both.items[0].id,first.items[0].id);
  assert.equal(both.items[0].source,"LinkedIn");assert.equal(both.items[0].source_rating,null);
  assert.equal((exportOwner(ctx,actor) as any).historical_identity.length,2);
  assert.throws(()=>db.prepare("UPDATE historical_identity SET canonical_id=?").run("22222222-2222-4222-8222-222222222222"),/immutable/);
  assert.throws(()=>db.prepare("DELETE FROM historical_identity").run(),/tombstone/);
 } finally {db.close();}
});
test("canonical post-backup withdrawal reconciles existing restored members and forbids a renamed group using the old homepage alias",async()=>{
 const {ctx,db}=fixture(),dir=mkdtempSync(join(tmpdir(),"synthetic-canonical-present-")),journal=localRecoveryJournal(join(dir,"journal.sqlite"));
 try {
  const input=[prove,li];applyImport(ctx,input,planImport(input).digest);
  const archive=join(dir,"backup.sqlite"),destination=join(dir,"restore.sqlite");await backupDatabase(db,archive);
  withdrawHistorical(ctx,actor,prove.source_id);await syncRecovery(db,journal);await restoreDatabase(archive,destination);await reconcileRecovery(destination,journal,recoveryHead(db),ctx.now());
  const restored=openDB(destination);
  try {
   const recovered={...ctx,db:restored};assert.equal(restored.prepare("SELECT count(*) n FROM historical WHERE status='withdrawn' AND comment_plaintext='' AND display_name=''").get()!.n,2);
   assert.equal(restored.prepare("SELECT count(*) n FROM historical_provenance").get()!.n,0);
   assert.deepEqual(homepageIdentities(recovered),{homepage_suppressed:[common.homepage_id]});
   const renamed={...prove,source_id:"synthetic-renamed-source",canonical_id:"22222222-2222-4222-8222-222222222222"};
   assert.throws(()=>applyImport(recovered,[renamed],planImport([renamed]).digest),/tombstone|homepage canonical decision conflict/);
   assert.equal(restored.prepare("SELECT count(*) n FROM historical").get()!.n,2);
  } finally {restored.close();}
 } finally {journal.close();db.close();rmSync(dir,{recursive:true,force:true});}
});
