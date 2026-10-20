import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { Server } from "node:http";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("full-site preview serves the English homepage at root without a redirect", async () => {
  const dir = await mkdtemp(join(tmpdir(), "reviews-static-test-"));
  const site = join(dir, "site");
  await mkdir(site);
  const homepage =
    "<!doctype html><html lang=en><h1>Synthetic English homepage</h1></html>";
  await writeFile(join(site, "index.html"), homepage);
  const previous = { ...process.env };
  Object.assign(process.env, {
    REVIEWS_MODE: "local",
    REVIEWS_DATA_DIR: join(dir, "private"),
    REVIEWS_STATIC_DIR: site,
    HOST: "127.0.0.1",
    PORT: "4173",
  });
  let server: Server | undefined;
  // Exercise the real request listener with an in-memory response. This is
  // a handler test, not a network/browser test or a sandbox workaround.
  const listen = mock.method(
    Server.prototype,
    "listen",
    function (this: Server) {
      server = this;
      return this;
    },
  );
  try {
    await import("../src/server.ts");
    const request = (url: string, method = "GET", host = "127.0.0.1:4173") =>
      new Promise<{
        status: number;
        body: string;
        headers: Record<string, string>;
      }>((resolve) => {
        const headers: Record<string, string> = {};
        const res = {
          status: 200,
          headersSent: false,
          setHeader(name: string, value: string) {
            headers[name.toLowerCase()] = value;
          },
          writeHead(status: number, values: Record<string, string> = {}) {
            this.status = status;
            for (const [name, value] of Object.entries(values))
              this.setHeader(name, value);
            return this;
          },
          end(body?: Buffer | string) {
            resolve({
              status: this.status,
              body: body?.toString() ?? "",
              headers,
            });
          },
        };
        server!.emit("request", { url, method, headers: { host } }, res);
      });
    const response = await request("/");
    assert.equal(response.status, 200);
    assert.equal(response.headers.location, undefined);
    assert.equal(response.body, homepage);
    assert.equal(response.headers["content-type"], "text/html; charset=utf-8");
    assert.equal(response.headers["x-content-type-options"], "nosniff");
    assert.match(
      response.headers["content-security-policy"],
      /frame-ancestors 'none'/,
    );
    const policy = response.headers["content-security-policy"];
    assert.match(policy, /frame-src[^;]*https:\/\/www.youtube-nocookie.com/);
    assert.match(policy, /connect-src[^;]*https:\/\/formspree.io/);
    assert.match(policy, /form-action[^;]*https:\/\/formspree.io/);
    assert.match(policy, /img-src[^;]*https:\/\/img.youtube.com/);
    assert.match(policy, /style-src-attr 'unsafe-inline'/);
    assert.doesNotMatch(policy, /script-src[^;]*'unsafe-inline'/);
    for (const path of ["/admin/", "/v1/missing", "/__local/missing"]) {
      const strict = (await request(path)).headers["content-security-policy"];
      assert.doesNotMatch(
        strict,
        /youtube|formspree|unsafe-inline|googletagmanager/,
      );
    }
    const head = await request("/", "HEAD");
    assert.equal(head.status, 200);
    assert.equal(head.body, "");
    assert.equal((await request("/", "POST")).status, 405);
    assert.equal((await request("/", "GET", "attacker.invalid")).status, 403);
    await mkdir(join(site, "reviews"));
    await writeFile(
      join(site, "reviews", "index.html"),
      "Synthetic review page",
    );
    assert.equal((await request("/reviews/")).body, "Synthetic review page");
    await writeFile(join(dir, "private", "synthetic.txt"), "SYNTHETIC PRIVATE");
    await symlink(
      join(dir, "private", "synthetic.txt"),
      join(site, "escape.txt"),
    );
    assert.equal((await request("/escape.txt")).status, 404);
    assert.equal((await request("/..%2fprivate/synthetic.txt")).status, 404);
    await rm(join(site, "index.html"));
    assert.equal((await request("/")).status, 404);
  } finally {
    listen.mock.restore();
    process.env = previous;
    await rm(dir, { recursive: true, force: true });
  }
});
