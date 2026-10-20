import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, valid } from "./helpers/fixture.ts";
import { createApp } from "../src/index.ts";

const address = "198.51.100.9";
function request(path: string, body: unknown, id?: string) {
  return new Request("http://127.0.0.1:4173" + path, {
    method: "POST",
    headers: { Origin: "http://127.0.0.1:4173", "Content-Type": "application/json", ...(id ? { "Idempotency-Key": id } : {}) },
    body: JSON.stringify(body),
  });
}

test("classroom HTTP: 30 shared-address participants can confirm despite one consumed-token retry each; all await manual Publish", async () => {
  const { ctx, db, mail } = fixture();
  const app = createApp(ctx, { origins: [ctx.site], authenticate: async () => null });
  try {
    for (let n = 0; n < 30; n++) {
      assert.equal((await app(request("/v1/reviews", { ...valid, email: `http-class-${n}@example.invalid`, stars: n % 5 + 1 }, `http-class-request-${n}`), address)).status, 202);
    }
    for (const message of mail) {
      const token = new URL(message.confirm).hash.slice("#confirm=".length);
      assert.equal((await app(request("/v1/reviews/confirm", { token }), address)).status, 200);
      assert.equal((await app(request("/v1/reviews/confirm", { token }), address)).status, 400);
    }
    assert.equal(db.prepare("SELECT count(*) n FROM reviews WHERE status='pending_moderation'").get()!.n, 30);
    assert.equal(db.prepare("SELECT count(*) n FROM reviews WHERE status='published'").get()!.n, 0);
    assert.equal((await app(request("/v1/reviews/confirm", { token: "x".repeat(43) }), address)).status, 429);
  } finally { db.close(); }
});

test("classroom HTTP: 30 shared-address participants can withdraw without rate-limit denial or publication", async () => {
  const { ctx, db, mail } = fixture();
  const app = createApp(ctx, { origins: [ctx.site], authenticate: async () => null });
  try {
    for (let n = 0; n < 30; n++) {
      assert.equal((await app(request("/v1/reviews", { ...valid, email: `withdraw-class-${n}@example.invalid` }, `withdraw-class-request-${n}`), address)).status, 202);
    }
    for (const message of mail) {
      const token = new URL(message.manage).hash.slice("#manage=".length);
      assert.equal((await app(request("/v1/reviews/withdraw", { token }), address)).status, 200);
    }
    assert.equal(db.prepare("SELECT count(*) n FROM reviews WHERE status='withdrawn'").get()!.n, 30);
    assert.equal(db.prepare("SELECT count(*) n FROM reviews WHERE status='published'").get()!.n, 0);
  } finally { db.close(); }
});
