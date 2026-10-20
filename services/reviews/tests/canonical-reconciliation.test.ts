import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/fixture.ts";
import { planImport, applyImport } from "../scripts/import-authorized-reviews.ts";
import { publishHistorical, withdrawHistorical } from "../src/admin.ts";
import { historicalList } from "../src/public.ts";
const actor={sub:"synthetic-owner",role:"moderator" as const};
const base={source:"ProvenExpert",source_id:"synthetic-stable-original",source_rating:4.8,source_scale:5,original_date:"2020-01-01",comment_plaintext:"Synthetic",display_name:"Synthetic",original_language:"de",permission_proof:"synthetic-rights",rights_confirmed:true};
const mapped={...base,canonical_id:"11111111-1111-4111-8111-111111111111",canonical_decision_reference:"synthetic-reviewed-equivalence",homepage_id:"homepage/"+"a".repeat(64)};
test("digest-approved canonical reconciliation preserves an already imported source/body and supports reapply",()=>{
 const {ctx,db}=fixture();
 try {
  applyImport(ctx,[base],planImport([base]).digest);
  const before=db.prepare("SELECT * FROM historical").get();
  const plan=planImport([mapped]);assert.deepEqual(applyImport(ctx,[mapped],plan.digest),{inserted:0,unchanged:1});
  assert.deepEqual(db.prepare("SELECT * FROM historical").get(),before);
  assert.equal(db.prepare("SELECT count(*) n FROM historical_identity").get()!.n,1);
  assert.deepEqual(applyImport(ctx,[mapped],plan.digest),{inserted:0,unchanged:1});
  publishHistorical(ctx,actor,base.source_id,{manual_approval:true,rights_confirmed:true,approved_digest:plan.digest,reason:"synthetic"},"synthetic-release");
  assert.equal(historicalList(ctx,new URLSearchParams()).count,1);
  assert.throws(()=>applyImport(ctx,[{...mapped,canonical_id:"22222222-2222-4222-8222-222222222222"}],planImport([{...mapped,canonical_id:"22222222-2222-4222-8222-222222222222"}]).digest),/conflict/);
 } finally {db.close();}
});
test("canonical reconciliation cannot reattach withdrawn rows or overwrite original provenance/body",()=>{
 const {ctx,db}=fixture();
 try {
  applyImport(ctx,[base],planImport([base]).digest);
  const changed={...mapped,comment_plaintext:"Synthetic changed"};
  assert.throws(()=>applyImport(ctx,[changed],planImport([changed]).digest),/conflict/);
  assert.equal(db.prepare("SELECT count(*) n FROM historical_identity").get()!.n,0);
  withdrawHistorical(ctx,actor,base.source_id);
  const empty={...mapped,comment_plaintext:"",display_name:""};
  assert.throws(()=>applyImport(ctx,[empty],planImport([empty]).digest),/withdrawn|tombstone|conflict/);
 } finally {db.close();}
});
