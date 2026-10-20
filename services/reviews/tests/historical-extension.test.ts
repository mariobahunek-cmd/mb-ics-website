import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/fixture.ts";
import * as importer from "../scripts/import-authorized-reviews.ts";
import { historicalList, summary } from "../src/public.ts";
import { withdrawHistorical, publishHistorical } from "../src/admin.ts";
import { createApp } from "../src/index.ts";
import { exportOwner, backupDatabase, restoreDatabase, localRecoveryJournal, syncRecovery, recoveryHead, reconcileRecovery } from "../src/operations.ts";
import { openDB } from "../src/db.ts";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const actor={sub:"synthetic-owner",role:"moderator" as const};
const syntheticLinkedIn = {
  source: "LinkedIn", source_id: "LinkedIn/synthetic-received-1", source_rating: null,
  source_scale: null, original_date: "2020-02-29", comment_plaintext: "Synthetic recommendation, not extracted",
  display_name: "Synthetic Author", original_language: "de", permission_proof: "synthetic-permission-only",
  rights_confirmed: true, item_type: "recommendation", received_or_given: "received",
  relationship: "Synthetic colleague", source_url: "https://example.invalid/synthetic-linkedin",
  source_permalink: "https://example.invalid/synthetic-linkedin#recommendation",
  platform_source_id: "synthetic-received-1", original_date_raw: "29.02.2020", content_sha256: "a".repeat(64),
};
test("synthetic RECEIVED LinkedIn stays unrated and preserves private provenance; form validation cannot authorize", () => {
  const {ctx,db}=fixture();
  try {
    const validate=(importer as any).validateHistorical;
    assert.equal(typeof validate,"function");
    const unapproved=[{...syntheticLinkedIn,rights_confirmed:false,permission_proof:""}];
    assert.equal(validate(unapproved).count,1);
    assert.throws(()=>importer.planImport(unapproved),/rights.*row|row.*rights/i);
    const plan=importer.planImport([syntheticLinkedIn]);
    importer.applyImport(ctx,[syntheticLinkedIn],plan.digest);
    assert.equal(db.prepare("SELECT source_rating FROM historical").get()!.source_rating,null);
    assert.equal(db.prepare("SELECT source_scale FROM historical").get()!.source_scale,null);
    const metadata=JSON.parse(String(db.prepare("SELECT provenance_json FROM historical_provenance").get()!.provenance_json));
    assert.equal(metadata.relationship,syntheticLinkedIn.relationship);
    assert.equal(metadata.received_or_given,"received");
    const audit=JSON.parse(String(db.prepare("SELECT reason FROM audit WHERE action='historical_import'").get()!.reason));
    assert.equal(audit.source,"LinkedIn");assert.equal(audit.source_rating,null);assert.equal(audit.source_scale,null);
    assert.equal(audit.approved_digest,plan.digest);
    assert.equal(summary(ctx).count,0);
    for(const patch of [{source_rating:5},{source_scale:5},{received_or_given:"given"},{item_type:"review"},{source_rating:0,source_scale:5},{original_date:"2020-02-30"},{original_date:"2999-01-01"},{source_url:"javascript:alert(1)"}])
      assert.throws(()=>validate([{...syntheticLinkedIn,...patch}]),/row/);
    assert.throws(()=>importer.applyImport(ctx,[{...syntheticLinkedIn,relationship:"Changed synthetic"}],importer.planImport([{...syntheticLinkedIn,relationship:"Changed synthetic"}]).digest),/conflict/);
  } finally {db.close();}
});
test("pending synthetic LinkedIn withdrawal erases private provenance and exports no removed relationship",()=>{
  const {ctx,db}=fixture();
  try {
    importer.applyImport(ctx,[syntheticLinkedIn],importer.planImport([syntheticLinkedIn]).digest);
    assert.equal((exportOwner(ctx,actor) as any).historical_provenance.length,1);
    withdrawHistorical(ctx,actor,syntheticLinkedIn.source_id);
    assert.equal(db.prepare("SELECT count(*) n FROM historical_provenance").get()!.n,0);
    assert.equal(db.prepare("SELECT status FROM historical").get()!.status,"withdrawn");
    assert.ok(!JSON.stringify(exportOwner(ctx,actor)).includes(syntheticLinkedIn.relationship));
    assert.throws(()=>importer.applyImport(ctx,[syntheticLinkedIn],importer.planImport([syntheticLinkedIn]).digest));
  } finally {db.close();}
});
test("synthetic LinkedIn after-backup withdrawal restores an absent exact-ID tombstone",async()=>{
  const {ctx,db}=fixture(),dir=mkdtempSync(join(tmpdir(),"synthetic-li-restore-"));
  const journal=localRecoveryJournal(join(dir,"journal.sqlite"));
  try {
    const archive=join(dir,"backup.sqlite"),dest=join(dir,"restore.sqlite");
    await backupDatabase(db,archive);
    importer.applyImport(ctx,[syntheticLinkedIn],importer.planImport([syntheticLinkedIn]).digest);
    withdrawHistorical(ctx,actor,syntheticLinkedIn.source_id);
    await syncRecovery(db,journal);await restoreDatabase(archive,dest);
    await reconcileRecovery(dest,journal,recoveryHead(db),ctx.now());
    const restored=openDB(dest);
    try { assert.throws(()=>importer.applyImport({...ctx,db:restored},[syntheticLinkedIn],importer.planImport([syntheticLinkedIn]).digest),/tombstone/); }
    finally {restored.close();}
  } finally {journal.close();db.close();rmSync(dir,{recursive:true,force:true});}
});
test("migration retains every legacy-valid source ID, decimal, language and publication state; reopens once",()=>{
  const dir=mkdtempSync(join(tmpdir(),"synthetic-legacy-migrate-")),path=join(dir,"old.sqlite");
  const legacy=new DatabaseSync(path);
  legacy.exec(readFileSync(new URL("../migrations/0001_reviews.sql",import.meta.url),"utf8"));
  legacy.prepare("INSERT INTO historical VALUES (?,?,?,?,?,?,?,?,?,?,?)").run("synthetic-legacy-fr","ProvenExpert",4.8,5,"2020-01-01",1,"Synthetic legacy","Synthetic","fr","synthetic-proof","published");
  legacy.prepare("INSERT INTO historical VALUES (?,?,?,?,?,?,?,?,?,?,?)").run("synthetic-legacy-withdrawn","ProvenExpert",4.6,5,"2020-01-01",1,"","","de","synthetic-proof","withdrawn");
  const before=legacy.prepare("SELECT * FROM historical ORDER BY source_id").all();legacy.close();
  try {
    for(let n=0;n<2;n++){
      const db=openDB(path);
      try {assert.deepEqual(db.prepare("SELECT * FROM historical ORDER BY source_id").all(),before);assert.equal(db.prepare("SELECT count(*) n FROM schema_migrations WHERE version=4").get()!.n,1);}
      finally {db.close();}
    }
  } finally {rmSync(dir,{recursive:true,force:true});}
});
test("historical manual publication is authenticated, audited and blocked by server release hold, rights and digest",async()=>{
  const {ctx,db}=fixture();
  try {
    const plan=importer.planImport([syntheticLinkedIn]);importer.applyImport(ctx,[syntheticLinkedIn],plan.digest);
    const request=(body:any)=>new Request(ctx.site+"/v1/admin/historical/"+encodeURIComponent(syntheticLinkedIn.source_id)+"/approve",{method:"POST",headers:{origin:ctx.site,"Content-Type":"application/json"},body:JSON.stringify(body)});
    const approval={manual_approval:true,rights_confirmed:true,approved_digest:plan.digest,reason:"synthetic-owner-neutral-review"};
    const options={local:true,origins:[ctx.site],authenticate:async()=>actor};
    assert.equal((await createApp(ctx,options)(request({...approval,country_release_reference:"synthetic-client-cannot-release"}))).status,423);
    const released={...options,historicalReleaseReference:"synthetic-country-release-record"};
    assert.equal((await createApp(ctx,{...released,closed:true})(request(approval))).status,423);
    assert.equal((await createApp(ctx,{...released,authenticate:async()=>null})(request(approval))).status,401);
    const app=createApp(ctx,released);
    for(const patch of [{manual_approval:false},{rights_confirmed:false}])assert.equal((await app(request({...approval,...patch}))).status,403);
    assert.equal((await app(request({...approval,approved_digest:"bad"}))).status,409);
    assert.equal(historicalList(ctx,new URLSearchParams()).count,0);
    assert.equal((await app(request(approval))).status,200);
    const view=historicalList(ctx,new URLSearchParams());
    assert.equal(view.count,1);assert.equal(view.items[0].source,"LinkedIn");assert.equal(view.items[0].source_rating,null);assert.equal(view.items[0].source_scale,null);
    assert.ok(!JSON.stringify(view).includes(syntheticLinkedIn.relationship));
    assert.equal(summary(ctx).count,0);
    assert.equal(db.prepare("SELECT count(*) n FROM audit WHERE action='historical_published'").get()!.n,1);
    withdrawHistorical(ctx,actor,syntheticLinkedIn.source_id);
    assert.equal((await app(request(approval))).status,409);
  } finally {db.close();}
});
test("apply cannot inherit an unmigrated legacy published default",()=>{
  const db=new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("../migrations/0001_reviews.sql",import.meta.url),"utf8"));
  const input=[{source:"ProvenExpert",source_id:"synthetic-legacy-apply",source_rating:4.8,source_scale:5,original_date:"2020-01-01",comment_plaintext:"Synthetic",display_name:"",original_language:"de",permission_proof:"synthetic-proof",rights_confirmed:true}];
  try {
    assert.throws(()=>importer.applyImport({db,now:Date.now},input,importer.planImport(input).digest));
    assert.equal(db.prepare("SELECT count(*) n FROM historical WHERE status='published'").get()!.n,0);
  } finally {db.close();}
});
test("migration checks its version under writer transaction and rolls back a real schema collision without losing legacy data",()=>{
  const dir=mkdtempSync(join(tmpdir(),"synthetic-migrate-rollback-")),path=join(dir,"old.sqlite");
  let legacy=new DatabaseSync(path);
  for(const file of ["0001_reviews.sql","0003_recovery_journal.sql"])legacy.exec(readFileSync(new URL("../migrations/"+file,import.meta.url),"utf8"));
  legacy.prepare("INSERT INTO historical VALUES (?,?,?,?,?,?,?,?,?,?,?)").run("synthetic-legacy-kept","ProvenExpert",4.8,5,"2020-01-01",1,"Synthetic old","","de","synthetic-proof","published");
  legacy.exec("CREATE TABLE historical_provenance (synthetic_collision TEXT)");legacy.close();
  const prepare=DatabaseSync.prototype.prepare;let transactionSeen=false;
  DatabaseSync.prototype.prepare=function(sql:string){if(sql==="SELECT version FROM schema_migrations WHERE version=4")transactionSeen=this.isTransaction;return prepare.call(this,sql);};
  try {
    assert.throws(()=>openDB(path),/already exists/);
    assert.equal(transactionSeen,true,"migration version read outside write transaction races another startup");
    legacy=new DatabaseSync(path);
    assert.equal(legacy.prepare("SELECT source_rating FROM historical").get()!.source_rating,4.8);
    assert.equal(legacy.prepare("SELECT count(*) n FROM sqlite_master WHERE name='historical_next'").get()!.n,0);
    assert.equal(legacy.prepare("SELECT count(*) n FROM sqlite_master WHERE name='recovery_historical_tombstone'").get()!.n,1);
    legacy.exec("DROP TABLE historical_provenance");legacy.close();
    const upgraded=openDB(path);upgraded.close();
  } finally {DatabaseSync.prototype.prepare=prepare;if(legacy.isOpen)legacy.close();rmSync(dir,{recursive:true,force:true});}
});
test("mixed batch conflict rolls back new rows and provenance, and direct SQL rejects invented LinkedIn ratings",()=>{
  const {ctx,db}=fixture();
  try {
    importer.applyImport(ctx,[syntheticLinkedIn],importer.planImport([syntheticLinkedIn]).digest);
    const changed={...syntheticLinkedIn,relationship:"synthetic-conflicting-relationship"};
    const batch=[{...syntheticLinkedIn,source_id:"LinkedIn/synthetic-new-rollback"},changed];
    assert.throws(()=>importer.applyImport(ctx,batch,importer.planImport(batch).digest),/conflict/);
    assert.equal(db.prepare("SELECT count(*) n FROM historical").get()!.n,1);
    assert.equal(db.prepare("SELECT count(*) n FROM historical_provenance").get()!.n,1);
    assert.throws(()=>importer.planImport([syntheticLinkedIn,syntheticLinkedIn]),/duplicate/i);
    assert.throws(()=>db.prepare("UPDATE historical SET source_rating=0,source_scale=5 WHERE source_id=?").run(syntheticLinkedIn.source_id),/CHECK/);
    assert.throws(()=>db.prepare("UPDATE historical SET source_rating=5,source_scale=5 WHERE source_id=?").run(syntheticLinkedIn.source_id),/CHECK/);
    // No authorization audit means private prepared rows cannot be manually published.
    db.prepare("INSERT INTO historical VALUES (?,?,?,?,?,?,?,?,?,?,?)").run("LinkedIn/synthetic-prep-only","LinkedIn",null,null,"2020-01-01",1,"Synthetic prepared only","",null,"synthetic-unconfirmed-reference","pending_moderation");
    assert.throws(()=>publishHistorical(ctx,actor,"LinkedIn/synthetic-prep-only",{manual_approval:true,rights_confirmed:true,approved_digest:"synthetic-unapproved",reason:"synthetic"},"synthetic-release"),/historical_import_rights/);
  } finally {db.close();}
});
test("restore of an existing synthetic LinkedIn row erases old provenance together with its body",async()=>{
  const {ctx,db}=fixture(),dir=mkdtempSync(join(tmpdir(),"synthetic-li-present-restore-"));
  const journal=localRecoveryJournal(join(dir,"journal.sqlite"));
  try {
    importer.applyImport(ctx,[syntheticLinkedIn],importer.planImport([syntheticLinkedIn]).digest);
    const archive=join(dir,"backup.sqlite"),dest=join(dir,"restore.sqlite");
    await backupDatabase(db,archive);withdrawHistorical(ctx,actor,syntheticLinkedIn.source_id);
    await syncRecovery(db,journal);await restoreDatabase(archive,dest);
    await reconcileRecovery(dest,journal,recoveryHead(db),ctx.now());
    const restored=openDB(dest);
    try {
      assert.equal(restored.prepare("SELECT status FROM historical").get()!.status,"withdrawn");
      assert.equal(restored.prepare("SELECT count(*) n FROM historical_provenance").get()!.n,0);
      assert.equal(restored.prepare("SELECT comment_plaintext FROM historical").get()!.comment_plaintext,"");
    } finally {restored.close();}
  } finally {journal.close();db.close();rmSync(dir,{recursive:true,force:true});}
});
const syntheticProve = {
  source: "ProvenExpert", source_id: "synthetic-prove-rating-only", source_rating: 4.8,
  source_scale: 5, original_date: "2020-02-29", comment_plaintext: "", display_name: "Synthetic",
  original_language: null, permission_proof: "synthetic-permission-only", rights_confirmed: true,
  item_type: "rating_only", source_url: "https://example.invalid/synthetic-prove",
};
test("synthetic rating-only preserves decimal and unknown language, pending by default", () => {
  const {ctx,db}=fixture();
  try {
    const plan=importer.planImport([syntheticProve]);
    importer.applyImport(ctx,[syntheticProve],plan.digest);
    const row=db.prepare("SELECT * FROM historical").get()!;
    assert.equal(row.source_rating,4.8); assert.equal(row.original_language,null);
    assert.equal(row.status,"pending_moderation");
    assert.equal(historicalList(ctx,new URLSearchParams()).count,0);
    assert.equal(summary(ctx).count,0);
    assert.deepEqual(importer.applyImport(ctx,[syntheticProve],plan.digest),{inserted:0,unchanged:1});
  } finally {db.close();}
});
