import { readdir, stat, readFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
const root = resolve(process.argv[2] ?? "_site");
const forbidden =
  /(^|\/)(\.night-build|\.hermes|\.review-data|\.wrangler|\.bundle|node_modules|services|tests|test-results|playwright-report|docs)(\/|$)|(^|\/)(\.env|\.dev\.vars)(\.|$)|\.(sqlite[^/]*|db[^/]*|log|pem|key)$/i;
async function walk(dir: string) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name),
      name = relative(root, path);
    if (forbidden.test(name) || entry.isSymbolicLink())
      throw new Error("Private or unsafe public build path: " + name);
    if (entry.isDirectory()) await walk(path);
  }
}
await walk(root);
for (const page of [
  "index.html",
  "reviews/index.html",
  "de/bewertungen/index.html",
  "es/opiniones/index.html",
  "review/index.html",
  "reviews/methodology/index.html",
  "sitemap.xml",
])
  if (!(await stat(resolve(root, page))).size)
    throw new Error("Missing public page: " + page);
for (const path of [
  "reviews/index.html",
  "de/bewertungen/index.html",
  "es/opiniones/index.html",
  "review/index.html",
]) {
  const html = await readFile(resolve(root, path), "utf8");
  if (html.includes("{%") || html.includes("{{"))
    throw new Error("Unrendered template: " + path);
}
console.log(
  "Public output paths and required review pages verified. No private service, evidence, DB, mail spool or browser output included.",
);
