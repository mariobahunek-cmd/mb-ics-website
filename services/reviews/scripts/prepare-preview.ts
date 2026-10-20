// Local review-page preview only. This is NOT a replacement or success claim for a Jekyll build.
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../../", import.meta.url)),
  dest = resolve(root, ".night-build/preview");
for (const path of [
  "reviews/index.html",
  "de/bewertungen/index.html",
  "es/opiniones/index.html",
  "review/index.html",
  "reviews/methodology/index.html",
]) {
  let html = await readFile(resolve(root, path), "utf8");
  html = html.replace(/^---\n[\s\S]*?\n---\n/, "");
  for (const match of [...html.matchAll(/{% include ([a-z-]+\.html) %}/g)])
    html = html.replace(
      match[0],
      await readFile(resolve(root, "_includes", match[1]), "utf8"),
    );
  html = html.replace("{{ site.reviews_api_url | escape }}", "");
  await mkdir(dirname(resolve(dest, path)), { recursive: true });
  await writeFile(resolve(dest, path), html);
}
for (const path of [
  "reviews.js",
  "reviews.css",
  "reviews-i18n.js",
  "reviews-handoff.js",
  "favicon.svg",
  "privacy.html",
  "style.css",
])
  await copyFile(resolve(root, path), resolve(dest, path));
console.log(
  "Prepared local review-page preview from actual templates. Full Jekyll build is a separate gate.",
);
