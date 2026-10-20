import { spawn } from "node:child_process";
import { createServer, request } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtemp, mkdir, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { provider } from "./oidc.ts";

export const api = "https://api.example.invalid";
export const site = "https://public.example.invalid";
export async function releaseServer(options: { openSubmissions?: boolean } = {}) {
  const idp = await provider();
  const dir = await mkdtemp(join(tmpdir(), "release-blockers-"));
  const staticRoot = join(dir, "static");
  await mkdir(staticRoot);
  await copyFile(new URL("../../../../reviews.css", import.meta.url), join(staticRoot, "reviews.css"));
  const probe = createServer();
  await new Promise<void>(r => probe.listen(0, "127.0.0.1", r));
  const port = (probe.address() as AddressInfo).port;
  await new Promise<void>(r => probe.close(() => r()));
  // Test subprocess only: route pinned logical HTTPS IdP to real loopback HTTP.
  // No production transport flag or TLS bypass. All other outbound calls fail.
  const code = `const nativeFetch = globalThis.fetch;
    globalThis.fetch = (input, init) => {
      const u = new URL(String(input));
      if(u.origin !== ${JSON.stringify(idp.issuer)}) throw new Error('Unexpected outbound test request');
      return nativeFetch(${JSON.stringify(idp.origin)} + u.pathname + u.search, init);
    };
    await import(${JSON.stringify(new URL("../../src/server.ts", import.meta.url).href)});`;
  const child = spawn(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", code], {
    env: { ...process.env, REVIEWS_MODE: "production", REVIEWS_MAIL_MODE: "paused", HOST: "127.0.0.1", PORT: String(port),
      REVIEWS_SITE_URL: site, REVIEWS_API_URL: api, REVIEWS_ADMIN_ORIGIN: api,
      REVIEWS_KEY: Buffer.alloc(32, 7).toString("base64"), REVIEWS_DATA_DIR: join(dir, "private"),
      REVIEWS_STATIC_DIR: staticRoot, REVIEWS_CLOSED: options.openSubmissions ? "false" : "true",
      OIDC_ISSUER: idp.issuer, OIDC_DISCOVERY_URL: idp.issuer + "/.well-known/openid-configuration",
      OIDC_JWKS_URL: idp.issuer + "/jwks", OIDC_CLIENT_ID: "browser-client",
      OIDC_CLIENT_SECRET: "synthetic", OIDC_REDIRECT_URI: api + "/v1/admin/callback",
      OIDC_AUDIENCE: "tooling-api", OIDC_SUBJECTS: "stable-moderator,second-moderator",
      OIDC_MFA_METHODS: "mfa", TURNSTILE_SECRET: "synthetic", TURNSTILE_SITEKEY: "synthetic",
      TURNSTILE_HOSTNAME: "public.example.invalid", RESEND_API_KEY: "synthetic", MAIL_FROM: "fixture@example.invalid" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let diagnostics = "";
  child.stderr!.on("data", c => { diagnostics += c; });
  async function call(path: string, method = "GET", cookie = "", extra: Record<string, string> = {}, body = "{}") {
    return new Promise<{ status: number; headers: import("node:http").IncomingHttpHeaders; body: string }>((resolve, reject) => {
      const req = request({ hostname: "127.0.0.1", port, path, method, headers: {
        Host: new URL(api).host, Cookie: cookie,
        ...(method === "POST" ? { Origin: api, "Content-Type": "application/json" } : {}), ...extra }, timeout: 10000 }, res => {
        let text = ""; res.on("data", c => { text += c; });
        res.on("end", () => resolve({ status: res.statusCode!, headers: res.headers, body: text }));
      });
      req.on("error", reject); req.on("timeout", () => req.destroy(new Error("HTTP test timeout")));
      req.end(method === "POST" ? body : undefined);
    });
  }
  try {
    await Promise.race([
      new Promise<void>(r => child.stdout!.on("data", c => { if(String(c).includes("listening")) r(); })),
      once(child, "exit").then(() => { throw new Error("Fixture server exited: " + diagnostics); }),
      new Promise<never>((_, reject) => { const t = setTimeout(() => reject(new Error("Startup timeout")), 10000); t.unref(); }),
    ]);
  } catch(e) { child.kill("SIGTERM"); await idp.close(); await rm(dir, {recursive:true,force:true}); throw e; }
  async function begin(cookie = "") {
    const login = await call("/v1/admin/login", "POST", cookie);
    if(login.status !== 303) throw new Error("Fixture login failed " + login.status);
    const authorized = await idp.transport(String(login.headers.location), { redirect: "manual" } as any);
    const u = new URL(authorized.headers.get("location")!);
    return { path: u.pathname + u.search, cookie: login.headers["set-cookie"]![0].split(";")[0] };
  }
  return { idp, call, begin, dir, close: async () => {
    const exited = once(child, "exit"); child.kill("SIGTERM"); await exited;
    await idp.close(); await rm(dir, { recursive: true, force: true });
  }};
}
