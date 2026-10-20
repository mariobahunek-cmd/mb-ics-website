import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
test("participant templates expose semantic rating, separate consent, safe optional handoff and all language routes", () => {
  const root = new URL("../../../", import.meta.url);
  const form = readFileSync(
    new URL("_includes/review-form.html", root),
    "utf8",
  );
  for (let i = 1; i <= 5; i++)
    assert.match(form, new RegExp(`type="radio"[^>]*value="${i}"`));
  assert.match(form, /id="consent"[^>]*required/);
  assert.doesNotMatch(form, /id="consent"[^>]*checked/);
  assert.match(form, /id="linkedin-copy"[^>]*type="button"/);
  assert.match(form, /https:\/\/www.linkedin.com\/in\/mariobahunek\//);
  assert.match(form, /rel="noopener noreferrer"/);
  for (const p of [
    "reviews/index.html",
    "de/bewertungen/index.html",
    "es/opiniones/index.html",
    "review/index.html",
  ])
    assert.match(
      readFileSync(new URL(p, root), "utf8"),
      /<html lang="(en|de|es)"/,
    );
});
test("moderation UI declares local-only auth and holds production bearer identity in memory", () => {
  const root = new URL("../../../", import.meta.url);
  const html = readFileSync(
      new URL("services/reviews/admin/index.html", root),
      "utf8",
    ),
    js = readFileSync(new URL("services/reviews/admin/admin.js", root), "utf8");
  assert.match(html, /MFA/);
  assert.match(html, /LOCAL SYNTHETIC/);
  assert.match(js, /Authorization/);
  assert.doesNotMatch(js, /localStorage|sessionStorage|innerHTML/);
});
test("transparency and optional home integration keep recommendations and native statistics separate", () => {
  const root = new URL("../../../", import.meta.url);
  const method = readFileSync(
    new URL("reviews/methodology/index.html", root),
    "utf8",
  );
  for (const lang of ["en", "de", "es"])
    assert.match(method, new RegExp(`lang="${lang}"`));
  const home = readFileSync(new URL("_includes/home.html", root), "utf8");
  assert.match(home, /reviews_enabled/);
  assert.match(home, /testimonials.js/);
  assert.match(
    readFileSync(new URL("privacy.html", root), "utf8"),
    /id="participant-reviews"/,
  );
  assert.match(
    readFileSync(new URL("sitemap.xml", root), "utf8"),
    /\/de\/bewertungen\//,
  );
});
