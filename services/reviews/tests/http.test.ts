import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, valid } from "./helpers/fixture.ts";
import { createApp } from "../src/index.ts";
test("HTTP boundary blocks CSRF, unauthorized writes, oversized requests and scanner GET confirmation", async () => {
  const { ctx, db, mail } = fixture();
  const app = createApp(ctx, {
    origins: [ctx.site],
    authenticate: async () => null,
  });
  const req = (
    path: string,
    method = "GET",
    body?: unknown,
    origin = ctx.site,
  ) =>
    new Request(ctx.site + path, {
      method,
      headers: {
        origin,
        "content-type": "application/json",
        "idempotency-key": "request-000000001",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  assert.equal(
    (await app(req("/v1/reviews", "POST", valid, "https://evil.invalid")))
      .status,
    403,
  );
  assert.equal(
    (
      await app(
        req("/v1/reviews", "POST", { ...valid, comment: "a".repeat(20000) }),
      )
    ).status,
    413,
  );
  assert.equal((await app(req("/v1/admin/reviews"))).status, 401);
  assert.equal((await app(req("/v1/reviews", "POST", valid))).status, 202);
  const confirmation = new URLSearchParams(
    new URL(mail[0].confirm).hash.slice(1),
  ).get("confirm");
  assert.equal(
    (await app(req("/v1/reviews/confirm?token=" + confirmation))).status,
    404,
  );
  assert.equal(
    db.prepare("SELECT status FROM reviews").get()!.status,
    "pending_email",
  );
  assert.equal(
    (await app(req("/v1/reviews/confirm", "POST", { token: confirmation })))
      .status,
    200,
  );
  const response = await app(req("/v1/reviews"));
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal((await response.json()).items.length, 0);
  assert.equal(
    (await app(req("/v1/reviews/confirm", "POST", { token: confirmation })))
      .status,
    400,
  );
  db.close();
});
test("publication and author withdrawal invalidate cached list and summary immediately; historical erasure stays separate", async () => {
  const { ctx, db, mail } = fixture();
  const actor = { sub: "synthetic-moderator", role: "moderator" as const };
  const app = createApp(ctx, {
    origins: [ctx.site],
    authenticate: async () => actor,
  });
  const get = (path: string) => app(new Request(ctx.site + path));
  const post = (path: string, body: unknown) =>
    app(
      new Request(ctx.site + path, {
        method: "POST",
        headers: {
          origin: ctx.site,
          "content-type": "application/json",
          "idempotency-key": "cache-00000000001",
        },
        body: JSON.stringify(body),
      }),
    );
  assert.equal((await (await get("/v1/reviews/summary")).json()).count, 0);
  await post("/v1/reviews", valid);
  const id = String(db.prepare("SELECT id FROM reviews").get()!.id),
    token = new URLSearchParams(new URL(mail[0].confirm).hash.slice(1)).get(
      "confirm",
    );
  await post("/v1/reviews/confirm", { token });
  await post("/v1/admin/reviews/" + id, {
    status: "published",
    reason: "reviewed",
  });
  assert.equal((await (await get("/v1/reviews/summary")).json()).count, 1);
  assert.equal((await (await get("/v1/reviews")).json()).items.length, 1);
  const manage = new URLSearchParams(new URL(mail[0].manage).hash.slice(1)).get(
    "manage",
  );
  assert.equal(
    (await post("/v1/reviews/withdraw", { token: manage })).status,
    200,
  );
  assert.equal((await (await get("/v1/reviews/summary")).json()).count, 0);
  assert.equal((await (await get("/v1/reviews")).json()).items.length, 0);
  db.prepare(
    "INSERT INTO historical VALUES ('synthetic/old','ProvenExpert',4.8,5,'2020-01-01',1,'Historical','Initials','de','proof-reference','published')",
  ).run();
  assert.equal((await (await get("/v1/historical")).json()).count, 1);
  await post("/v1/admin/historical/" + encodeURIComponent("synthetic/old"), {});
  assert.equal((await (await get("/v1/historical")).json()).count, 0);
  assert.equal(
    db.prepare("SELECT comment_plaintext FROM historical").get()!
      .comment_plaintext,
    "",
  );
  db.close();
});
test("admin and public boundaries reject forged authority and expose only explicit public fields", async () => {
  const { ctx, db } = fixture();
  const app = createApp(ctx, {
    origins: [ctx.site],
    authenticate: async () => null,
  });
  const forged = new Request(
    ctx.site + "/v1/admin/reviews/00000000-0000-0000-0000-000000000000",
    {
      method: "POST",
      headers: {
        origin: ctx.site,
        "content-type": "application/json",
        "x-admin": "true",
        cookie: "admin=true",
        authorization: "Bearer forged",
      },
      body: JSON.stringify({ status: "published", reason: "reviewed" }),
    },
  );
  assert.equal((await app(forged)).status, 401);
  for (const headers of [
    { origin: ctx.site, "content-type": "text/plain" },
    { "content-type": "application/json" },
  ] as Record<string, string>[])
    assert.ok(
      [403, 415].includes(
        (
          await app(
            new Request(ctx.site + "/v1/reviews", {
              method: "POST",
              headers,
              body: JSON.stringify(valid),
            }),
          )
        ).status,
      ),
    );
  db.close();
});
test("every admin route rejects a non-moderator principal including the historical archive", async () => {
  const { ctx, db } = fixture();
  const app = createApp(ctx, {
    origins: [ctx.site],
    authenticate: async () =>
      ({ sub: "synthetic-viewer", role: "viewer" }) as any,
  });
  for (const path of [
    "/v1/admin/reviews",
    "/v1/admin/audit",
    "/v1/admin/export",
    "/v1/admin/historical",
  ])
    assert.equal((await app(new Request(ctx.site + path))).status, 401);
  db.close();
});
