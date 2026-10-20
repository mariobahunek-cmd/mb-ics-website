import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
// @ts-ignore The DOM test library is only a locked development dependency.
import { JSDOM } from "jsdom";
import { fixture } from "./helpers/fixture.ts";
import { openDB } from "../src/db.ts";
import { createApp } from "../src/index.ts";
const root = new URL("../../../", import.meta.url);
let serial = 0;
test("synthetic mixed-source local viewer shows LinkedIn without stars and unknown language without inference",async()=>{
  const {ctx,db}=fixture();let dom:any;
  try {
    db.prepare("INSERT INTO historical VALUES (?,?,?,?,?,?,?,?,?,?,?)").run("synthetic-prove-view","ProvenExpert",4.8,5,"2020-01-01",ctx.now(),"","Synthetic Prove",null,"synthetic-proof","published");
    db.prepare("INSERT INTO historical VALUES (?,?,?,?,?,?,?,?,?,?,?)").run("synthetic-li-view","LinkedIn",null,null,"2020-01-02",ctx.now(),"Synthetic <img src=x onerror=alert(1)>","Synthetic LinkedIn",null,"synthetic-proof","published");
    const app=createApp(ctx,{local:true,origins:[ctx.site],authenticate:async()=>null});
    dom=await view("reviews/index.html",ctx.site+"/reviews/",app);
    await waitUntil(()=>dom.window.document.querySelectorAll("#historical-list article").length===2);
    const cards=Array.from(dom.window.document.querySelectorAll("#historical-list article")) as any[];
    const li=cards.find(c=>c.textContent.includes("Synthetic LinkedIn"));
    assert.match(li.textContent,/LinkedIn/);assert.doesNotMatch(li.textContent,/ProvenExpert|null|0 \/ 5|5 \/ 5/);
    assert.equal(li.querySelector(".stars"),null);
    assert.match(li.textContent,/unknown/i);assert.equal(li.querySelector(".review-comment").hasAttribute("lang"),false);
    assert.equal(li.querySelector("img"),null);
    const prove=cards.find(c=>c.textContent.includes("Synthetic Prove"));assert.match(prove.textContent,/4.8 \/ 5/);
    assert.match(dom.window.document.querySelector("#historical-status").textContent,/ProvenExpert.*1.*LinkedIn.*1/);
    assert.match(dom.window.document.querySelector("#review-summary").textContent,/No website reviews/);
  } finally {dom?.window.close();db.close();}
});
async function waitUntil(fn: () => boolean) {
  for (let i = 0; i < 100; i++) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  assert.ok(fn(), "DOM behavior did not settle");
}
async function view(path: string, url: string, app: any) {
  const source = readFileSync(new URL(path, root), "utf8")
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/{% include ([a-z-]+\.html) %}/g, (_, name) =>
      readFileSync(new URL("_includes/" + name, root), "utf8"),
    )
    .replace("{{ site.reviews_api_url | escape }}", "");
  const dom = new JSDOM(source, { url, runScripts: "outside-only" });
  for (const name of [
    "document",
    "location",
    "history",
    "navigator",
    "FormData",
    "window",
  ])
    Object.defineProperty(globalThis, name, {
      value: (dom.window as any)[name],
      configurable: true,
      writable: true,
    });
  globalThis.fetch = async (input: any, init: any = {}) =>
    app(
      new Request(new URL(input, url), {
        ...init,
        headers: { ...init.headers, origin: new URL(url).origin },
      }),
      "dom-test",
    );
  await import(
    new URL(`../../../reviews.js?dom=${++serial}`, import.meta.url).href
  );
  return dom;
}
test("actual participant JS traverses persisted submission, optional handoff, confirmation, moderation, XSS-safe public display and withdrawal", async () => {
  const dir = mkdtempSync(join(tmpdir(), "reviews-dom-")),
    fixtureValue = fixture();
  fixtureValue.db.close();
  const ctx = { ...fixtureValue.ctx, db: openDB(join(dir, "db.sqlite")) };
  const mail = fixtureValue.mail;
  const app = createApp(ctx, {
    local: true,
    origins: [ctx.site],
    authenticate: async (req) =>
      req.headers.get("authorization") === "Bearer synthetic-moderator"
        ? { sub: "local-test", role: "moderator" }
        : null,
  });
  let dom: any;
  try {
    dom = await view("review/index.html", ctx.site + "/review/?lang=es", app);
    const d = dom.window.document;
    await waitUntil(() => !d.querySelector("#review-fields").disabled);
    assert.equal(d.documentElement.lang, "es");
    d.querySelector('[value="1"]').checked = true;
    d.querySelector("#email").value = "dom-synthetic@example.invalid";
    d.querySelector("#comment").value =
      'Crítica\n日本語 🌎 <img src=x onerror="window.xss=1">';
    assert.equal(d.querySelector("#consent").checked, false);
    d.querySelector("#review-form").dispatchEvent(
      new dom.window.Event("submit", { bubbles: true, cancelable: true }),
    );
    assert.equal(mail.length, 0);
    d.querySelector("#consent").checked = true;
    d.querySelector("#review-form").dispatchEvent(
      new dom.window.Event("submit", { bubbles: true, cancelable: true }),
    );
    await waitUntil(() => !d.querySelector("#submission-success").hidden);
    assert.equal(mail.length, 1);
    assert.equal(
      ctx.db.prepare("SELECT status FROM reviews").get()!.status,
      "pending_email",
    );
    assert.equal(dom.window.localStorage.length, 0);
    d.querySelector("#linkedin-copy").click();
    await waitUntil(() => !d.querySelector("#linkedin-manual").hidden);
    assert.equal(
      d.querySelector("#linkedin-text").value,
      'Crítica\n日本語 🌎 <img src=x onerror="window.xss=1">',
    );
    assert.equal(ctx.db.prepare("SELECT count(*) n FROM reviews").get()!.n, 1);
    dom.window.close();
    ctx.db.close();
    ctx.db = openDB(join(dir, "db.sqlite"));
    assert.equal(ctx.db.prepare("SELECT count(*) n FROM reviews").get()!.n, 1);
    dom = await view("review/index.html", mail[0].confirm, app);
    assert.equal(dom.window.location.hash, "");
    assert.equal(
      ctx.db.prepare("SELECT status FROM reviews").get()!.status,
      "pending_email",
    );
    dom.window.document.querySelector("#token-submit").click();
    await waitUntil(
      () => dom.window.document.querySelector("#token-submit").hidden,
    );
    dom.window.close();
    const id = ctx.db.prepare("SELECT id FROM reviews").get()!.id;
    const response = await app(
      new Request(ctx.site + "/v1/admin/reviews/" + id, {
        method: "POST",
        headers: {
          origin: ctx.site,
          Authorization: "Bearer synthetic-moderator",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "published", reason: "reviewed" }),
      }),
    );
    assert.equal(response.status, 200);
    dom = await view(
      "es/opiniones/index.html",
      ctx.site + "/es/opiniones/",
      app,
    );
    await waitUntil(() => !!dom.window.document.querySelector(".review-card"));
    assert.match(
      dom.window.document.querySelector(".review-comment").textContent,
      /<img src=x/,
    );
    assert.equal(
      dom.window.document.querySelector(".review-comment img"),
      null,
    );
    assert.equal(dom.window.xss, undefined);
    assert.match(
      dom.window.document.querySelector("#review-summary").textContent,
      /1 \/ 5/,
    );
    await waitUntil(
      () =>
        !!dom.window.document.querySelector("#historical-status").textContent,
    );
    dom.window.close();
    dom = await view("review/index.html", mail[0].manage, app);
    dom.window.document.querySelector("#token-submit").click();
    await waitUntil(
      () => dom.window.document.querySelector("#token-submit").hidden,
    );
    assert.equal(
      ctx.db.prepare("SELECT status FROM reviews").get()!.status,
      "withdrawn",
    );
    const summary = await (
      await app(new Request(ctx.site + "/v1/reviews/summary"))
    ).json();
    assert.equal(summary.count, 0);
    assert.equal(
      ctx.db.prepare("SELECT count(*) n FROM review_private").get()!.n,
      0,
    );
  } finally {
    dom?.window.close();
    ctx.db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("EN/DE/ES rating-only submissions all show an optional profile link with no invented clipboard text", async () => {
  for (const [lang, stars] of [
    ["en", 1],
    ["de", 2],
    ["es", 3],
    ["en", 4],
    ["de", 5],
  ] as const) {
    const { ctx, db } = fixture();
    const app = createApp(ctx, {
      local: true,
      origins: [ctx.site],
      authenticate: async () => null,
    });
    const dom = await view(
      "review/index.html",
      ctx.site + "/review/?lang=" + lang,
      app,
    );
    try {
      const d = dom.window.document;
      await waitUntil(() => !d.querySelector("#review-fields").disabled);
      d.querySelector(`input[name=stars][value="${stars}"]`).checked = true;
      d.querySelector("#email").value = "rating-only@example.invalid";
      d.querySelector("#consent").checked = true;
      d.querySelector("#review-form").dispatchEvent(
        new dom.window.Event("submit", { bubbles: true, cancelable: true }),
      );
      await waitUntil(() => !d.querySelector("#submission-success").hidden);
      assert.equal(d.querySelector("#linkedin-copy").hidden, true);
      assert.equal(d.querySelector("#rating-only").hidden, false);
      assert.equal(
        d.querySelector("#linkedin-open").href,
        "https://www.linkedin.com/in/mariobahunek/",
      );
      assert.equal(d.documentElement.lang, lang);
      assert.equal(db.prepare("SELECT stars FROM reviews").get()!.stars, stars);
    } finally {
      dom.window.close();
      db.close();
    }
  }
});
test("UI service outage preserves entered review and never displays success", async () => {
  const { ctx, db } = fixture();
  const app = createApp(ctx, {
    local: true,
    origins: [ctx.site],
    authenticate: async () => null,
  });
  let fail = false;
  const dom = await view(
    "review/index.html",
    ctx.site + "/review/",
    (req: Request) =>
      fail
        ? Promise.resolve(
            new Response('{"error":"service_unavailable"}', { status: 503 }),
          )
        : app(req),
  );
  try {
    const d = dom.window.document;
    await waitUntil(() => !d.querySelector("#review-fields").disabled);
    d.querySelector('[value="3"]').checked = true;
    d.querySelector("#email").value = "outage@example.invalid";
    d.querySelector("#comment").value = "Preserve my original text";
    d.querySelector("#consent").checked = true;
    fail = true;
    d.querySelector("#review-form").dispatchEvent(
      new dom.window.Event("submit", { bubbles: true, cancelable: true }),
    );
    await waitUntil(() =>
      d.querySelector("#form-status").classList.contains("error"),
    );
    assert.equal(d.querySelector("#submission-success").hidden, true);
    assert.equal(
      d.querySelector("#comment").value,
      "Preserve my original text",
    );
    assert.equal(d.querySelector("#review-fields").disabled, false);
  } finally {
    dom.window.close();
    db.close();
  }
});
test("language changes keep confirmation and withdrawal capabilities only in memory until explicit action", async () => {
  for (const action of ["confirm", "manage"]) {
    const calls: { url: string; body: any }[] = [];
    const token = "synthetic-capability-language-test";
    const dom = await view(
      "review/index.html",
      `https://reviews.example.invalid/review/#${action}=${token}`,
      async (req: Request) => {
        calls.push({ url: req.url, body: await req.json() });
        return new Response("{}", { status: 200 });
      },
    );
    try {
      const d = dom.window.document;
      for (const lang of ["de", "es", "en"]) {
        const event = new dom.window.MouseEvent("click", {
          bubbles: true,
          cancelable: true,
        });
        d.querySelector(`[data-language="${lang}"]`).dispatchEvent(event);
        assert.equal(
          event.defaultPrevented,
          true,
          "Pending action language switch must stay in the current document",
        );
        assert.equal(d.documentElement.lang, lang);
        assert.equal(d.querySelector("#review-form").hidden, true);
        assert.equal(d.querySelector("#token-action").hidden, false);
        assert.equal(dom.window.location.hash, "");
        assert.equal(d.documentElement.outerHTML.includes(token), false);
        assert.equal(
          JSON.stringify(dom.window.history.state).includes(token),
          false,
        );
        assert.equal(
          dom.window.localStorage.length + dom.window.sessionStorage.length,
          0,
        );
        assert.equal(calls.length, 0);
      }
      d.querySelector("#token-submit").click();
      await waitUntil(() => d.querySelector("#token-submit").hidden);
      assert.equal(calls.length, 1);
      assert.equal(
        calls[0].url,
        `https://reviews.example.invalid/v1/reviews/${action === "confirm" ? "confirm" : "withdraw"}`,
      );
      assert.deepEqual(calls[0].body, { token });
      d.querySelector('[data-language="de"]').click();
      assert.equal(d.querySelector("#token-submit").hidden, true);
      assert.equal(calls.length, 1);
    } finally {
      dom.window.close();
    }
  }
});
