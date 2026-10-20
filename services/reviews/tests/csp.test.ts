import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { contentSecurityPolicy } from "../src/csp.ts";
const api = "https://api.example.invalid";
test("preview compatibility is exact-route/local-only and hashes built inline code", () => {
  const script = "window.synthetic=1;",
    style = "body {color: navy}";
  const html = `<script>${script}</script><style>${style}</style>`;
  for (const path of ["/", "/de/", "/es/", "/privacy.html"]) {
    const csp = contentSecurityPolicy(api, true, path, html);
    for (const source of [script, style])
      assert.ok(
        csp.includes(
          "'sha256-" +
            createHash("sha256").update(source).digest("base64") +
            "'",
        ),
      );
    assert.match(csp, /https:\/\/www.youtube-nocookie.com/);
    assert.doesNotMatch(csp, /script-src[^;]*(unsafe-inline|unsafe-eval|\*)/);
    assert.doesNotMatch(csp, /https:\/\/\*/);
    assert.doesNotMatch(
      contentSecurityPolicy(api, false, path, html),
      /youtube|formspree|unsafe-inline|sha256|googletagmanager/,
    );
  }
  for (const path of [
    "/admin/",
    "/v1/config",
    "/__local/login",
    "/review/",
    "/reviews/",
    "/de/bewertungen/",
    "/es/opiniones/",
    "/evil/",
    "/INDEX.html",
  ])
    assert.doesNotMatch(
      contentSecurityPolicy(api, true, path, html),
      /youtube|formspree|unsafe-inline|sha256|googletagmanager/,
    );
});
