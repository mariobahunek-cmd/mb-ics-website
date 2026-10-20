import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, valid } from "./helpers/fixture.ts";
import { submit } from "../src/submit.ts";
import { deliver, retryMail } from "../src/mail.ts";
import { sendSharedMail } from "../src/mail-provider.ts";
import type { Context } from "../src/context.ts";
const day = 86400000;
const binding = {apiKey:"synthetic",from:"reviews@example.invalid"};
const receipt = () => new Response(JSON.stringify({id:"11111111-1111-4111-8111-111111111111"}));
for (const route of ["scheduler", "client", "direct", "restart"])
  for (const remaining of [30000, 20000, 1000])
    test(`${route}: ACK loss with ${remaining}ms remaining never crosses retention`, async () => {
      const f=fixture(); const t0=f.ctx.now(); let now=t0, providerNow=t0+100;
      const ctx:Context={...f.ctx,now:()=>now};
      let calls=0, accepted=0, firstAcceptance:number|undefined, body="", key="";
      ctx.send=(mail,id,dispatch)=>sendSharedMail(binding,mail,id,async (_url,init)=>{
        calls++; const k=new Headers(init?.headers).get("Idempotency-Key")!;
        if(calls===1){body=String(init?.body);key=k;}else{assert.equal(String(init?.body),body);assert.equal(k,key);providerNow+=2000;}
        if(firstAcceptance===undefined||providerNow-firstAcceptance>=day){accepted++;firstAcceptance=providerNow;}
        if(calls===1)throw new TypeError("accepted but ACK lost");
        return receipt();
      },dispatch);
      try {
        await submit(ctx,valid,"deadline-identity-0001","ip");
        const before=f.db.prepare("SELECT * FROM outbox").get()!;
        if(route==="restart")f.db.prepare("UPDATE outbox SET state='sending'").run();
        now=t0+day-remaining;providerNow=now;
        if(route==="client")await submit(ctx,valid,"deadline-identity-0001","ip2");
        else if(route==="direct")await deliver(ctx,String(before.review_id));
        else await retryMail(ctx);
        assert.equal(accepted,1,"no second acceptance beyond provider retention");
        assert.equal(calls,remaining>20000?2:1,"unsafe late retries must not dispatch");
        const after=f.db.prepare("SELECT * FROM outbox").get()!;
        assert.equal(after.attempts,remaining>20000?2:1);
        assert.equal(after.state,remaining>20000?"sent":route==="restart"?"sending":"queued");
        if(remaining<=20000)assert.equal(after.payload_cipher,before.payload_cipher);
        assert.equal(f.db.prepare("SELECT status FROM reviews").get()!.status,"pending_email");
      } finally {f.db.close();}
    });
