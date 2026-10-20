import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/index.ts";
import { fixture } from "./helpers/fixture.ts";
import { provider } from "./helpers/oidc.ts";
import { createBrowserAuth } from "../src/browser-auth.ts";

test("moderator browser login starts a server-mediated OIDC redirect instead of requiring a pasted bearer", async () => {
  const { ctx, db } = fixture();
  const idp = await provider();
  try {
    const app = createApp(ctx, {
      origins: ["https://api.example.invalid"],
      authenticate: async () => null,
      browserAuth: createBrowserAuth({
        config: idp.config,
        issuer: idp.issuer,
        jwksUrl: idp.issuer + "/jwks",
        origin: "https://api.example.invalid",
        redirect: "https://api.example.invalid/v1/admin/callback",
        subjects: ["stable-moderator"],
        mfaMethods: ["mfa"],
      }),
    });
    const response = await app(
      new Request("https://api.example.invalid/v1/admin/login", {
        method: "POST",
        headers: {
          Origin: "https://api.example.invalid",
          "Content-Type": "application/json",
        },
        body: "{}",
      }),
    );
    assert.equal(
      response.status,
      303,
      "missing normal moderator OIDC acquisition flow",
    );
    assert.match(
      response.headers.get("location")!,
      /^https:\/\/id\.example\.invalid\//,
    );
    const location = new URL(response.headers.get("location")!);
    assert.equal(location.searchParams.get("code_challenge_method"), "S256");
    assert.equal(location.searchParams.get("max_age"), "0");
    assert.equal(location.searchParams.get("prompt"), "login");
    assert.match(
      response.headers.get("set-cookie")!,
      /HttpOnly; Secure; SameSite=Lax; Max-Age=300/,
    );
  } finally {
    db.close();
    await idp.close();
  }
});
const origin = "https://api.example.invalid";
async function harness() {
  const idp = await provider(),
    f = fixture();
  let time = Math.floor(Date.now() / 1000);
  const options = {
    config: idp.config,
    issuer: idp.issuer,
    jwksUrl: idp.issuer + "/jwks",
    origin,
    redirect: origin + "/v1/admin/callback",
    subjects: ["stable-moderator"],
    mfaMethods: ["mfa"],
    now: () => time,
  };
  const auth = createBrowserAuth(options);
  const app = createApp(f.ctx, {
    origins: [origin, "https://site.example.invalid"],
    authenticate: auth.authenticate,
    browserAuth: auth,
  });
  const call = (
    path: string,
    method = "GET",
    cookie = "",
    csrf = "",
    requestOrigin: string | null = origin,
  ) =>
    app(
      new Request(origin + path, {
        method,
        headers: {
          ...(requestOrigin ? { Origin: requestOrigin } : {}),
          Cookie: cookie,
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
        },
        ...(method === "POST" ? { body: "{}" } : {}),
      }),
    );
  async function begin() {
    const login = await call("/v1/admin/login", "POST");
    const cookie = login.headers.get("set-cookie")!.split(";")[0];
    const authorization = await idp.transport(login.headers.get("location")!, {
      method: "GET",
      redirect: "manual",
    } as any);
    const callback = new URL(authorization.headers.get("location")!);
    return { callback: callback.pathname + callback.search, cookie };
  }
  return {
    ...f,
    idp,
    auth,
    options,
    app,
    call,
    begin,
    advance: (seconds: number) => {
      time += seconds;
    },
    close: async () => {
      f.db.close();
      await idp.close();
    },
  };
}
test("code exchange validates PKCE and nonce and yields an opaque bounded moderator session", async () => {
  const h = await harness();
  try {
    const tx = await h.begin();
    const callback = await h.call(tx.callback, "GET", tx.cookie, "", null);
    assert.equal(callback.status, 303, "missing code-exchange browser session");
    assert.equal(callback.headers.get("location"), origin + "/admin/");
    const cookies = callback.headers.getSetCookie();
    const session = cookies.find((c) =>
      c.startsWith("__Host-review-session="),
    )!;
    assert.match(session, /HttpOnly; Secure; SameSite=Strict/);
    assert.doesNotMatch(session, /SYNTHETIC|eyJ/);
    const status = await h.call(
      "/v1/admin/session",
      "GET",
      session.split(";")[0],
    );
    assert.equal(status.status, 200);
    const body = await status.json();
    assert.deepEqual(Object.keys(body).sort(), [
      "authenticated",
      "csrf",
      "expires",
    ]);
    assert.equal(body.authenticated, true);
    assert.ok(body.expires <= Math.floor(Date.now() / 1000) + 600);
    assert.equal(
      (await h.call("/v1/admin/reviews", "GET", session.split(";")[0])).status,
      200,
    );
    assert.equal(
      (await h.call(tx.callback, "GET", tx.cookie, "", null)).status,
      401,
    );
    assert.equal(h.idp.exchanges(), 1);
  } finally {
    await h.close();
  }
});
for (const [name, claims] of Object.entries({
  missing_amr: { amr: undefined },
  weak_amr: { amr: ["pwd", "sms"] },
  wrong_subject: { sub: "intruder" },
  missing_auth_time: { auth_time: undefined },
  stale_auth_time: { auth_time: Math.floor(Date.now() / 1000) - 3601 },
  not_reauthenticated: { auth_time: Math.floor(Date.now() / 1000) - 120 },
  future_auth_time: { auth_time: Math.floor(Date.now() / 1000) + 120 },
  stale_iat: { iat: Math.floor(Date.now() / 1000) - 3601 },
  future_iat: { iat: Math.floor(Date.now() / 1000) + 120 },
  missing_iat: { iat: undefined },
  expired: { exp: Math.floor(Date.now() / 1000) - 1 },
  wrong_issuer: { iss: "https://evil.example.invalid" },
  wrong_audience: { aud: "another-client" },
  wrong_azp: { aud: ["browser-client", "other"], azp: "other" },
  missing_azp: { aud: ["browser-client", "other"] },
  wrong_nonce: { nonce: "wrong" },
  missing_nonce: { nonce: undefined },
  missing_sub: { sub: undefined },
}))
  test("OIDC callback rejects " + name, async () => {
    const h = await harness();
    try {
      h.idp.setClaims(claims);
      const tx = await h.begin(),
        result = await h.call(tx.callback, "GET", tx.cookie, "", null);
      assert.equal(result.status, 401, name + " must fail closed");
      assert.ok(
        !result.headers
          .getSetCookie()
          .some(
            (c) =>
              c.startsWith("__Host-review-session=") &&
              !c.includes("Max-Age=0"),
          ),
      );
      assert.equal(
        (await h.call(tx.callback, "GET", tx.cookie, "", null)).status,
        401,
      );
    } finally {
      await h.close();
    }
  });
test("OIDC callback rejects invalid RS256 signatures", async () => {
  const h = await harness();
  try {
    h.idp.badSignature();
    const tx = await h.begin();
    assert.equal(
      (await h.call(tx.callback, "GET", tx.cookie, "", null)).status,
      401,
    );
  } finally {
    await h.close();
  }
});
test("browser session mutations require own-origin CSRF and logout revokes on the server", async () => {
  const h = await harness();
  try {
    const tx = await h.begin(),
      callback = await h.call(tx.callback, "GET", tx.cookie, "", null);
    const cookie = callback.headers
      .getSetCookie()
      .find((c) => c.startsWith("__Host-review-session="))!
      .split(";")[0];
    const status = await h.call("/v1/admin/session", "GET", cookie),
      { csrf } = await status.json();
    assert.equal(
      (
        await h.call(
          "/v1/admin/reviews/00000000-0000-0000-0000-000000000000",
          "POST",
          cookie,
        )
      ).status,
      403,
      "mutation without CSRF must fail",
    );
    assert.equal(
      (await h.call("/v1/admin/logout", "POST", cookie, "wrong")).status,
      403,
    );
    assert.equal(
      (
        await h.call(
          "/v1/admin/logout",
          "POST",
          cookie,
          csrf,
          "https://site.example.invalid",
        )
      ).status,
      403,
    );
    assert.equal(
      (await h.call("/v1/admin/logout", "GET", cookie, csrf)).status,
      405,
    );
    assert.equal(
      (await h.call("/v1/admin/logout", "POST", cookie, csrf)).status,
      200,
    );
    assert.equal(
      (await h.call("/v1/admin/session", "GET", cookie)).status,
      401,
    );
    assert.equal(
      (await h.call("/v1/admin/reviews", "GET", cookie)).status,
      401,
    );
  } finally {
    await h.close();
  }
});
test("OIDC discovered issuer and JWKS must match the exact configured pins", async () => {
  const h = await harness();
  try {
    assert.throws(() =>
      createBrowserAuth({
        ...h.options,
        issuer: "https://wrong.example.invalid",
        jwksUrl: h.idp.issuer + "/jwks",
      } as any),
    );
    assert.throws(() =>
      createBrowserAuth({
        ...h.options,
        issuer: h.idp.issuer,
        jwksUrl: "https://wrong.example.invalid/jwks",
      } as any),
    );
  } finally {
    await h.close();
  }
});
test("state cookie binding, tampering, expiration and restart fail closed before exchange", async () => {
  const h = await harness();
  try {
    const tx = await h.begin();
    assert.equal((await h.call(tx.callback, "GET", "", "", null)).status, 401);
    const altered = tx.callback.replace(/state=[^&]+/, "state=wrong");
    assert.equal(
      (await h.call(altered, "GET", tx.cookie, "", null)).status,
      401,
    );
    assert.equal(
      (await h.call(tx.callback, "GET", tx.cookie, "", null)).status,
      401,
    );
    const stale = await h.begin();
    h.advance(301);
    assert.equal(
      (await h.call(stale.callback, "GET", stale.cookie, "", null)).status,
      401,
    );
    const fresh = await h.begin(),
      restarted = createBrowserAuth(h.options);
    assert.equal(
      (await restarted.handle(
        new Request(origin + fresh.callback, {
          headers: { Cookie: fresh.cookie },
        }),
      ))!.status,
      401,
    );
    assert.equal(h.idp.exchanges(), 0);
  } finally {
    await h.close();
  }
});
test("opaque sessions expire and a new service instance rejects old sessions", async () => {
  const h = await harness();
  try {
    const tx = await h.begin(),
      callback = await h.call(tx.callback, "GET", tx.cookie, "", null);
    const cookie = callback.headers
      .getSetCookie()
      .find((c) => c.startsWith("__Host-review-session="))!
      .split(";")[0];
    assert.equal(
      await createBrowserAuth(h.options).authenticate(
        new Request(origin + "/v1/admin/reviews", {
          headers: { Cookie: cookie },
        }),
      ),
      null,
    );
    h.advance(601);
    assert.equal(
      (await h.call("/v1/admin/session", "GET", cookie)).status,
      401,
    );
    assert.equal(
      (await h.call("/v1/admin/reviews", "GET", cookie)).status,
      401,
    );
  } finally {
    await h.close();
  }
});
test("login CSRF and participant origins are not accepted as admin origins", async () => {
  const h = await harness();
  try {
    for (const o of [
      null,
      "https://site.example.invalid",
      "https://evil.example.invalid",
    ])
      assert.equal(
        (await h.call("/v1/admin/login", "POST", "", "", o)).status,
        403,
      );
    assert.equal((await h.call("/v1/admin/login", "GET")).status, 405);
    const wrong = await h.app(
      new Request(origin + "/v1/admin/login", {
        method: "POST",
        headers: {
          Origin: origin,
          "Sec-Fetch-Site": "cross-site",
          "Content-Type": "application/json",
        },
        body: "{}",
      }),
    );
    assert.equal(wrong.status, 403);
  } finally {
    await h.close();
  }
});
test("same-origin login fetch returns a navigation URL without relying on no-referrer form Origin", async () => {
  const h = await harness();
  try {
    const result = await h.app(
      new Request(origin + "/v1/admin/login", {
        method: "POST",
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: "{}",
      }),
    );
    assert.equal(result.status, 200);
    assert.match(
      (await result.json()).authorizationUrl,
      /^https:\/\/id\.example\.invalid\/authorize/,
    );
  } finally {
    await h.close();
  }
});
test("production startup discovers the pinned issuer with server-client credentials", async () => {
  const module = await import("../src/browser-auth.ts");
  assert.equal(
    typeof (module as any).discoverBrowserAuth,
    "function",
    "production browser acquisition is not wired",
  );
  const idp = await provider();
  idp.requireBasic("synthetic-secret");
  try {
    const env = {
      OIDC_ISSUER: idp.issuer,
      OIDC_DISCOVERY_URL: idp.issuer + "/.well-known/openid-configuration",
      OIDC_CLIENT_ID: "browser-client",
      OIDC_CLIENT_SECRET: "synthetic-secret",
      OIDC_JWKS_URL: idp.issuer + "/jwks",
      OIDC_REDIRECT_URI: origin + "/v1/admin/callback",
      REVIEWS_ADMIN_ORIGIN: origin,
      OIDC_SUBJECTS: "stable-moderator",
      OIDC_MFA_METHODS: "mfa",
    };
    const auth = await (module as any).discoverBrowserAuth(env, idp.transport);
    const login = await auth.handle(
      new Request(origin + "/v1/admin/login", {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: "{}",
      }),
    );
    assert.equal(login.status, 303);
    const authorize = await idp.transport(login.headers.get("location"), {
      method: "GET",
      redirect: "manual",
    } as any);
    const result = await auth.handle(
      new Request(authorize.headers.get("location")!, {
        headers: { Cookie: login.headers.get("set-cookie").split(";")[0] },
      }),
    );
    assert.equal(result.status, 303);
  } finally {
    await idp.close();
  }
});
test("new login invalidates the prior session and rejects noncanonical Host", async () => {
  const h = await harness();
  try {
    const tx = await h.begin(),
      callback = await h.call(tx.callback, "GET", tx.cookie, "", null),
      cookie = callback.headers
        .getSetCookie()
        .find((c) => c.startsWith("__Host-review-session="))!
        .split(";")[0];
    const forged = await h.app(
      new Request(origin + "/v1/admin/login", {
        method: "POST",
        headers: {
          Host: "evil.example.invalid",
          Origin: origin,
          "Content-Type": "application/json",
        },
        body: "{}",
      }),
    );
    assert.equal(
      forged.status,
      403,
      "must not issue host-bound cookies under an unapproved Host",
    );
    assert.equal((await h.call("/v1/admin/login", "POST", cookie)).status, 303);
    assert.equal(
      (await h.call("/v1/admin/reviews", "GET", cookie)).status,
      401,
      "reauthentication must revoke old sessions",
    );
  } finally {
    await h.close();
  }
});
test("all ratings stay nonpublic through email confirmation, login and session refresh until an explicit moderator decision", async () => {
  const { submit } = await import("../src/submit.ts"),
    { confirm } = await import("../src/confirm.ts"),
    { valid } = await import("./helpers/fixture.ts");
  const h = await harness();
  try {
    for (let stars = 1; stars <= 5; stars++) {
      await submit(
        h.ctx,
        {
          ...valid,
          stars,
          email: `rating${stars}@example.invalid`,
          comment: "Legitimate critical feedback",
        },
        `manual-review-0000${stars}`,
        "synthetic",
      );
      const token = new URLSearchParams(
        new URL(h.mail.at(-1)!.confirm).hash.slice(1),
      ).get("confirm")!;
      assert.equal(confirm(h.ctx, token).status, "pending_moderation");
    }
    const publicList = () => h.call("/v1/reviews");
    assert.equal((await (await publicList()).json()).items.length, 0);
    const tx = await h.begin(),
      callback = await h.call(tx.callback, "GET", tx.cookie, "", null),
      cookie = callback.headers
        .getSetCookie()
        .find((c) => c.startsWith("__Host-review-session="))!
        .split(";")[0];
    const { csrf } = await (
      await h.call("/v1/admin/session", "GET", cookie)
    ).json();
    const rows = await (
      await h.call("/v1/admin/reviews", "GET", cookie)
    ).json();
    assert.equal(rows.length, 5);
    assert.ok(rows.every((r: any) => r.status === "pending_moderation"));
    assert.equal((await (await publicList()).json()).items.length, 0);
    const mutation = (id: string, status: string, reason: string) =>
      h.app(
        new Request(origin + "/v1/admin/reviews/" + id, {
          method: "POST",
          headers: {
            Origin: origin,
            Cookie: cookie,
            "Content-Type": "application/json",
            "X-CSRF-Token": csrf,
          },
          body: JSON.stringify({ status, reason }),
        }),
      );
    const criticism = rows.find((r: any) => r.stars === 1),
      spam = rows.find((r: any) => r.stars === 5);
    assert.equal(
      (await mutation(criticism.id, "rejected", "negative")).status,
      400,
    );
    assert.equal((await mutation(spam.id, "rejected", "spam")).status, 200);
    assert.equal((await (await publicList()).json()).items.length, 0);
    assert.equal(
      (
        await mutation(
          criticism.id,
          "published",
          "reviewed_under_neutral_policy",
        )
      ).status,
      200,
    );
    const result = await (await publicList()).json();
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].stars, 1);
    const summary = await (await h.call("/v1/reviews/summary")).json();
    assert.equal(summary.count, 1);
    assert.equal(summary.mean, 1);
    assert.ok(
      h.db
        .prepare("SELECT actor FROM audit WHERE action='published'")
        .all()
        .every((r) => r.actor === "stable-moderator"),
    );
  } finally {
    await h.close();
  }
});
test("tampered PKCE challenge is rejected by the real provider code exchange", async () => {
  const h = await harness();
  try {
    const login = await h.call("/v1/admin/login", "POST"),
      cookie = login.headers.get("set-cookie")!.split(";")[0],
      url = new URL(login.headers.get("location")!);
    url.searchParams.set("code_challenge", "wrong");
    const authorized = await h.idp.transport(url.href, {
      method: "GET",
      redirect: "manual",
    } as any);
    assert.equal(
      (
        await h.app(
          new Request(authorized.headers.get("location")!, {
            headers: { Cookie: cookie },
          }),
        )
      ).status,
      401,
    );
    assert.equal(h.idp.exchanges(), 1);
  } finally {
    await h.close();
  }
});
test("callback rejects genuine RS384 tokens rather than accepting any RSA signature", async () => {
  const h = await harness();
  try {
    h.idp.setAlgorithm("RS384");
    const tx = await h.begin();
    assert.equal(
      (await h.call(tx.callback, "GET", tx.cookie, "", null)).status,
      401,
    );
  } finally {
    await h.close();
  }
});
test("concurrent callbacks consume the transaction once", async () => {
  const h = await harness();
  try {
    const tx = await h.begin();
    const responses = await Promise.all([
      h.call(tx.callback, "GET", tx.cookie, "", null),
      h.call(tx.callback, "GET", tx.cookie, "", null),
    ]);
    assert.deepEqual(responses.map((r) => r.status).sort(), [303, 401]);
    assert.equal(h.idp.exchanges(), 1);
  } finally {
    await h.close();
  }
});

test("in-flight attempts still count toward bounded capacity and expire before session creation", async () => {
  const h = await harness();
  const hold = h.idp.holdNext();
  let pending: ReturnType<typeof h.call> | undefined;
  try {
    const tx = await h.begin();
    pending = h.call(tx.callback,"GET",tx.cookie,"",null);
    await hold.ready;
    for(let i=0;i<999;i++) assert.equal((await h.call("/v1/admin/login","POST")).status,303);
    assert.equal((await h.call("/v1/admin/login","POST")).status,503,"held consumed attempt must still occupy a bounded slot");
    h.advance(301);
    assert.equal((await h.call("/v1/admin/login","POST")).status,303,"TTL releases capacity");
    hold.release();
    const result=await pending;
    assert.equal(result.status,401,"expired held attempt cannot create a session");
    assert.equal(result.headers.getSetCookie().length,0);
  }finally{hold.release();await pending;await h.close();}
});

test("login body limit and transaction capacity fail closed without unbounded memory", async () => {
  const h = await harness();
  try {
    const oversized = await h.app(
      new Request(origin + "/v1/admin/login", {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: "x".repeat(16385),
      }),
    );
    assert.equal(oversized.status, 413);
    for (let i = 0; i < 1000; i++)
      assert.equal((await h.call("/v1/admin/login", "POST")).status, 303);
    assert.equal((await h.call("/v1/admin/login", "POST")).status, 503);
    h.advance(301);
    assert.equal((await h.call("/v1/admin/login", "POST")).status, 303);
  } finally {
    await h.close();
  }
});
