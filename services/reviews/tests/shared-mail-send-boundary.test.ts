import {test} from "node:test";
import assert from "node:assert/strict";
import {fixture,valid} from "./helpers/fixture.ts";
import {submit} from "../src/submit.ts";
import {deliver} from "../src/mail.ts";
import {sendSharedMail} from "../src/mail-provider.ts";
import type {Context} from "../src/context.ts";
const binding={apiKey:"synthetic",from:"reviews@example.invalid"};
const receipt=()=>new Response(JSON.stringify({id:"11111111-1111-4111-8111-111111111111"}));
const mail={to:valid.email,confirm:"synthetic",manage:"synthetic",language:"en"};
const send=sendSharedMail as (...args:any[])=>Promise<void>;
for(const remaining of [30000,20001,20000,1000,0,-1,NaN])test(`adapter direct boundary ${remaining}`,async()=>{
 let calls=0;const now=100000;
 const action=()=>send(binding,mail,"same-id",async()=>{calls++;return receipt();},{deadline:now+remaining-10000,now:()=>now});
 if(remaining>20000)await action();else await assert.rejects(action,/mail_retry_deadline/);
 assert.equal(calls,remaining>20000?1:0);
});
test("adapter missing original dispatch window fails closed",async()=>{
 let calls=0;await assert.rejects(()=>send(binding,mail,"same-id",async()=>{calls++;return receipt();}),/mail_retry_deadline/);assert.equal(calls,0);
});
test("adapter rechecks after payload construction immediately before transport",async()=>{
 let now=100000,calls=0;
 const delayed={...mail,get to(){now+=15000;return valid.email;}};
 await assert.rejects(()=>send(binding,delayed,"same-id",async()=>{calls++;return receipt();},{deadline:120000,now:()=>now}),/mail_retry_deadline/);
 assert.equal(calls,0);
});
for(const pauseAt of ["afterClaim","beforeAdapter"])test(`paused ${pauseAt} cannot dispatch`,async()=>{
 const f=fixture();let now=f.ctx.now();const t0=now;let calls=0,sendCalls=0;
 const ctx:Context={...f.ctx,now:()=>now,send:async()=>{throw new Error("unknown");}};
 try{
  await submit(ctx,valid,"pause-boundary-0001","ip");
  const id=String(f.db.prepare("SELECT review_id FROM outbox").get()!.review_id);
  now=t0+86400000-30000;
  ctx.send=async(m,id,...rest:any[])=>{
   sendCalls++;
   if(pauseAt==="beforeAdapter")now+=15000;
   await send(binding,m,id,async()=>{calls++;return receipt();},...rest);
  };
  if(pauseAt==="afterClaim"){
   let reads=0;ctx.now=()=>{if(++reads===2)now+=15000;return now;};
  }
  await deliver(ctx,id);
  assert.equal(calls,0,"a pause must not use the stale claim-time decision");
  assert.equal(sendCalls,pauseAt==="afterClaim"?0:1,"deliver must recheck before invoking its binding");
  assert.equal(f.db.prepare("SELECT state FROM outbox").get()!.state,"queued");
 }finally{f.db.close();}
});
test("in-process monotonic pause cannot be hidden by wall-clock rollback",async(t)=>{
 const f=fixture();let elapsed=0,now=f.ctx.now(),calls=0;
 t.mock.method(performance,"now",()=>elapsed);
 const ctx:Context={...f.ctx,now:()=>now,send:async()=>{throw new Error("unknown");}};
 try{
  await submit(ctx,valid,"monotonic-pause-0001","ip");
  const id=String(f.db.prepare("SELECT review_id FROM outbox").get()!.review_id);
  now+=86400000-30000;
  ctx.send=async(m,id,dispatch)=>{
   elapsed+=15000;now-=60000;
   await sendSharedMail(binding,m,id,async()=>{calls++;return receipt();},dispatch);
  };
  await deliver(ctx,id);
  assert.equal(calls,0);
  assert.equal(f.db.prepare("SELECT state FROM outbox").get()!.state,"queued");
 }finally{f.db.close();}
});
