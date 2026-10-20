import { test } from "node:test";
import assert from "node:assert/strict";
import { releaseServer, api, site } from "./helpers/release-server.ts";
import { createServer, request } from "node:http";
import type { AddressInfo } from "node:net";
// @ts-ignore Locked DOM test dependency.
import { JSDOM } from "jsdom";

test("SEC01 wired production GET and POST reject browser-client bearer audiences and retain proper tooling access", { timeout: 20000 }, async () => {
  const h = await releaseServer();
  try {
    const now = Math.floor(Date.now()/1000);
    const claims = { iss: h.idp.issuer, sub: "stable-moderator", exp: now + 600, iat: now, auth_time: now, amr: ["mfa"] };
    const tool = h.idp.issue({ ...claims, aud: "tooling-api" });
    assert.equal((await h.call("/v1/admin/reviews", "GET", "", { Authorization: "Bearer " + tool })).status, 200);
    // This is the exact signed browser-consumer profile from the independent repro.
    const browser = h.idp.issue({ ...claims, aud: ["browser-client", "tooling-api"], azp: "browser-client" });
    for (const [path, method] of [["/v1/admin/reviews", "GET"], ["/v1/admin/reviews/00000000-0000-0000-0000-000000000000", "POST"]]) {
      const denied = await h.call(path, method, "", { Authorization: "Bearer " + browser }, JSON.stringify({status:"published",reason:"reviewed_under_neutral_policy"}));
      assert.equal(denied.status, 401, method + " browser ID token must not authorize tooling");
      assert.equal(denied.headers["set-cookie"], undefined);
    }
    assert.equal((await h.call("/v1/admin/reviews/00000000-0000-0000-0000-000000000000", "POST", "", {Authorization:"Bearer " + tool}, JSON.stringify({status:"published",reason:"reviewed_under_neutral_policy"}))).status, 409, "proper tool POST reaches missing-record transition check");
  } finally { await h.close(); }
});


test("QUAL01 signed malformed aud and amr fail closed on real callback and tooling routes", {timeout:20000}, async () => {
  const h = await releaseServer();
  try {
    const invalid = [7, null, {}, "", [], ["browser-client",7], ["browser-client",null], ["browser-client",{}], ["browser-client",["other"]], ["browser-client",""]];
    for(const aud of invalid) {
      h.idp.setClaims({aud,azp:"browser-client"});
      const tx = await h.begin();
      const result = await h.call(tx.path,"GET",tx.cookie);
      assert.equal(result.status,401,"malformed audience must fail: " + JSON.stringify(aud));
      assert.equal(result.headers["set-cookie"],undefined);
    }
    for(const amr of ["mfa",[],["mfa",7],["mfa",null],["mfa",{}],["mfa",["other"]],["mfa",""]]) {
      h.idp.setClaims({amr});
      const tx = await h.begin();
      const result = await h.call(tx.path,"GET",tx.cookie);
      assert.equal(result.status,401,"malformed amr must fail: " + JSON.stringify(amr));
      assert.equal(result.headers["set-cookie"],undefined);
    }
    const now = Math.floor(Date.now()/1000);
    const claims = {iss:h.idp.issuer,aud:"tooling-api",sub:"stable-moderator",exp:now+600,iat:now,auth_time:now,amr:["mfa"]};
    for(const patch of [{aud:["tooling-api",7]},{amr:["mfa",7]},{aud:["tooling-api",""]},{amr:["mfa",""]}])
      assert.equal((await h.call("/v1/admin/reviews","GET","",{Authorization:"Bearer " + h.idp.issue({...claims,...patch})})).status,401);
    for(const patch of [{aud:"browser-client"},{aud:["browser-client"],azp:"browser-client"},{aud:["browser-client","other"],azp:"browser-client"},{aud:["browser-client","tooling-api"],azp:"browser-client"}]) {
      h.idp.setClaims(patch);
      const tx = await h.begin();
      assert.equal((await h.call(tx.path,"GET",tx.cookie)).status,303,"valid audience/azp profile retained");
    }
  } finally { await h.close(); }
});


test("H-SPEC2 actual admin DOM public navigation targets configured public fixture, assets work and private paths stay closed", {timeout:20000}, async () => {
  const h = await releaseServer();
  const publicServer = createServer((req,res) => {
    if(req.headers.host === new URL(site).host && req.url === "/reviews/")
      res.writeHead(200,{"Content-Type":"text/html"}).end("<h1>Synthetic public reviews destination</h1>");
    else res.writeHead(404).end();
  });
  await new Promise<void>(r=>publicServer.listen(0,"127.0.0.1",r));
  try {
    const admin = await h.call("/admin/");
    assert.equal(admin.status,200);
    const dom = new JSDOM(admin.body,{url:api+"/admin/"});
    try {
      const brand = dom.window.document.querySelector("a.brand");
      assert.equal(brand.getAttribute("href"),site+"/reviews/");
      const target = new URL(brand.href);
      const destination = await new Promise<string>((resolve,reject)=>{
        const req=request({hostname:"127.0.0.1",port:(publicServer.address() as AddressInfo).port,path:target.pathname,headers:{Host:target.host}},res=>{
          assert.equal(res.statusCode,200); let body="";res.on("data",c=>body+=c);res.on("end",()=>resolve(body));
        });req.on("error",reject);req.end();
      });
      assert.match(destination,/Synthetic public reviews destination/);
      for(const element of dom.window.document.querySelectorAll('link[rel="stylesheet"],script[src]')) {
        const path=element.getAttribute(element.tagName === "LINK" ? "href" : "src");
        assert.equal((await h.call(path)).status,200,"admin asset "+path);
      }
      for(const path of ["/reviews/","/reviews.sqlite","/reviews.sqlite-wal","/reviews.sqlite-shm","/local-key","/mail/","/services/reviews/src/config.ts","/deploy/render.yaml","/docs/reviews-operations.md","/_site/","/.git/config","/var/data/reviews/reviews.sqlite","/../reviews.sqlite","/%2e%2e/reviews.sqlite","/__local/login","/__local/mail"])
        assert.equal((await h.call(path)).status,404,"private/nonallowlisted API path "+path);
      assert.equal((await h.call("/admin/","GET","",{Host:"attacker.invalid"})).status,403);
      assert.equal(JSON.parse((await h.call("/v1/config")).body).closed,true);
      assert.equal((await h.call("/v1/reviews","POST")).status,503);
    } finally {dom.window.close();}
  } finally {await new Promise<void>(r=>publicServer.close(()=>r()));await h.close();}
});


for(const subject of ["stable-moderator","second-moderator"])
  test("SEC02 distinct browser families remain concurrent for allowed subject " + subject,{timeout:20000},async()=>{
    const h=await releaseServer();const hold=h.idp.holdNext();let pending:ReturnType<typeof h.call>|undefined;
    try {
      const a=await h.begin();pending=h.call(a.path,"GET",a.cookie);await hold.ready;
      h.idp.setClaims({sub:subject});
      const b=await h.begin();const complete=await h.call(b.path,"GET",b.cookie);assert.equal(complete.status,303);
      const cookie=complete.headers["set-cookie"]!.find(c=>c.startsWith("__Host-review-session="))!.split(";")[0];
      const session=JSON.parse((await h.call("/v1/admin/session","GET",cookie)).body);
      assert.equal((await h.call("/v1/admin/logout","POST",cookie,{"X-CSRF-Token":session.csrf})).status,200);
      hold.release();const first=await pending;assert.equal(first.status,303,"unrelated browser logout must not revoke in-flight login");
      const firstCookie=first.headers["set-cookie"]!.find(c=>c.startsWith("__Host-review-session="))!.split(";")[0];
      assert.equal((await h.call("/v1/admin/session","GET",firstCookie)).status,200);
    }finally{hold.release();await pending;await h.close();}
  });
test("SEC02 supersession while real JWKS response is held denies stale authority",{timeout:20000},async()=>{
  const h=await releaseServer();const hold=h.idp.holdNext("/jwks");let pending:ReturnType<typeof h.call>|undefined;
  try{
    const a=await h.begin();pending=h.call(a.path,"GET",a.cookie);await hold.ready;
    assert.equal((await h.call("/v1/admin/login","POST",a.cookie)).status,303);
    hold.release();const stale=await pending;assert.equal(stale.status,401);assert.equal(stale.headers["set-cookie"],undefined);
  }finally{hold.release();await pending;await h.close();}
});

for (const logout of [false, true])
  test("SEC02 held real HTTP callback cannot survive " + (logout ? "newer login and logout" : "newer login supersession"), {timeout:20000}, async () => {
    const h = await releaseServer();
    const hold = h.idp.holdNext();
    let pending: ReturnType<typeof h.call> | undefined;
    try {
      const a = await h.begin();
      pending = h.call(a.path, "GET", a.cookie);
      await hold.ready;
      assert.equal((await h.call(a.path,"GET",a.cookie)).status,401,"concurrent same-transaction replay fails while exchange is held");
      const b = await h.begin(a.cookie);
      const completed = await h.call(b.path,"GET",b.cookie);
      assert.equal(completed.status,303);
      const cookie = completed.headers["set-cookie"]!.find(c=>c.startsWith("__Host-review-session="))!.split(";")[0];
      const session = await h.call("/v1/admin/session","GET",cookie);
      assert.equal(session.status,200);
      if(logout) {
        assert.equal((await h.call("/v1/admin/logout","POST",cookie,{"X-CSRF-Token":JSON.parse(session.body).csrf})).status,200);
        assert.equal((await h.call("/v1/admin/session","GET",cookie)).status,401);
      }
      hold.release();
      const stale = await pending;
      assert.equal(stale.status,401,"revoked in-flight callback must not create a session");
      assert.equal(stale.headers["set-cookie"],undefined);
      assert.equal((await h.call(a.path,"GET",a.cookie)).status,401);
      if(!logout) assert.equal((await h.call("/v1/admin/session","GET",cookie)).status,200);
    } finally { hold.release(); await pending; await h.close(); }
  });
