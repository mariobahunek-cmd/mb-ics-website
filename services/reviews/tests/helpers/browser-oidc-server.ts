import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { readFile } from "node:fs/promises";
import { provider } from "./oidc.ts";
import { fixture, valid } from "./fixture.ts";
import { submit } from "../../src/submit.ts";
import { confirm } from "../../src/confirm.ts";
import { createBrowserAuth } from "../../src/browser-auth.ts";
import { createApp } from "../../src/index.ts";
import { contentSecurityPolicy } from "../../src/csp.ts";
const origin = "https://api.example.invalid",
  idp = await provider(),
  f = fixture();
for (const [stars, comment] of [
  [1, "Legitimate criticism"],
  [5, "Synthetic nonsense spam"],
] as const) {
  await submit(
    f.ctx,
    { ...valid, stars, comment, email: `fixture${stars}@example.invalid` },
    `browser-manual-review-${stars}`,
    "synthetic",
  );
  confirm(
    f.ctx,
    new URLSearchParams(new URL(f.mail.at(-1)!.confirm).hash.slice(1)).get(
      "confirm",
    )!,
  );
}
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
let auth = createBrowserAuth(options);
let app = createApp(f.ctx, {
  origins: [origin],
  browserAuth: auth,
  authenticate: auth.authenticate,
});
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url!, origin);
    if (url.pathname.startsWith("/__fixture/")) {
      if (url.pathname === "/__fixture/expire") time += 901;
      if (url.pathname === "/__fixture/restart") {
        time = Math.floor(Date.now() / 1000);
        auth = createBrowserAuth(options);
        app = createApp(f.ctx, {
          origins: [origin],
          browserAuth: auth,
          authenticate: auth.authenticate,
        });
      }
      if (url.pathname === "/__fixture/clock")
        time = Math.floor(Date.now() / 1000);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ exchanges: idp.exchanges() }));
      return;
    }
    res.setHeader("Content-Security-Policy", contentSecurityPolicy(origin));
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    if (url.pathname === "/admin/" || url.pathname === "/admin/admin.js") {
      res.setHeader(
        "Content-Type",
        url.pathname.endsWith(".js") ? "text/javascript" : "text/html",
      );
      res.end(
        await readFile(
          new URL(
            "../../admin/" +
              (url.pathname.endsWith(".js") ? "admin.js" : "index.html"),
            import.meta.url,
          ),
        ),
      );
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const c of req) {
      size += c.length;
      if (size > 16384) {
        res.writeHead(413).end();
        return;
      }
      chunks.push(c);
    }
    const request = new Request(url, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      ...(["GET", "HEAD"].includes(req.method!)
        ? {}
        : { body: Buffer.concat(chunks) }),
    });
    const response = await app(request);
    if (response.headers.getSetCookie().length)
      res.setHeader("Set-Cookie", response.headers.getSetCookie());
    res.writeHead(
      response.status,
      Object.fromEntries(
        [...response.headers].filter(([key]) => key !== "set-cookie"),
      ),
    );
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(503).end();
  }
});
await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
console.log(
  JSON.stringify({
    api: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    idp: idp.origin,
  }),
);
process.on("SIGTERM", () => {
  server.close(() => {
    f.db.close();
    void idp.close().then(() => process.exit(0));
  });
});
