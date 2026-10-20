import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const changed = execFileSync("git", ["diff", "--name-only", "-z"], {
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);
const untracked = execFileSync(
  "git",
  ["ls-files", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const privatePath =
  /(^|\/)(\.night-build|\.hermes|\.review-data|node_modules|test-results|playwright-report)(\/|$)|\.(sqlite[^/]*|db[^/]*|log|pem|key)$/i;
for (const file of files)
  if (privatePath.test(file))
    throw new Error("Private path eligible for commit: " + file);
const suspect = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bAKIA[A-Z0-9]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bsk-[A-Za-z0-9_-]{32,}\b/,
];
let scanned = 0;
for (const file of new Set([...changed, ...untracked])) {
  if (!/\.(ts|js|json|html|css|yml|toml|md|sql)$/.test(file)) continue;
  const body = readFileSync(file, "utf8");
  if (suspect.some((pattern) => pattern.test(body)))
    throw new Error("Potential secret requires private review: " + file);
  scanned++;
}
const original = JSON.parse(
  execFileSync("git", ["show", "HEAD:_data/i18n_home.json"], {
    encoding: "utf8",
  }),
);
const now = JSON.parse(readFileSync("_data/i18n_home.json", "utf8"));
for (const [language, entries] of Object.entries(original))
  for (const [key, value] of Object.entries(entries as object))
    if (JSON.stringify(now[language][key]) !== JSON.stringify(value))
      throw new Error("Preexisting owner translation changed");
// Renderer integration may change; preserve the complete original archive literal.
const archiveLiteral = (body: string) => {
  const begin = body.indexOf("const testimonialData = ["), end = body.indexOf("const BATCH_SIZE");
  if (begin < 0 || end <= begin) throw new Error("Archive boundary missing");
  return body.slice(begin, end);
};
if (archiveLiteral(readFileSync("testimonials.js", "utf8")) !== archiveLiteral(execFileSync("git", ["show", "HEAD:testimonials.js"], {encoding:"utf8"})))
  throw new Error("Preexisting testimonial archive values changed");
for (const path of [
  "provenexpert-siegel-2026.svg",
  "provenexpert-siegel-2026-en.svg",
])
  if (!readFileSync(path).equals(execFileSync("git", ["show", "HEAD:" + path])))
    throw new Error("Preexisting evidence changed: " + path);
const config = readFileSync("_config.yml", "utf8");
for (const path of [
  ".night-build/",
  ".hermes/",
  "services/",
  "tests/",
  ".review-data/",
  "test-results/",
  "playwright-report/",
  "docs/",
])
  if (!config.includes("  - " + path))
    throw new Error("Missing Jekyll exclusion: " + path);
execFileSync("git", ["diff", "--check"]);
console.log(
  JSON.stringify(
    {
      eligible_files: files.length,
      changed_text_files_scanned: scanned,
      secret_patterns: "no matches (heuristic, not a guarantee)",
      private_paths: "excluded from eligible git files",
      original_testimonials_and_translation_values: "unchanged",
      jekyll_source_exclusions: "present",
      diff_whitespace: "clean",
      note: "This is source preflight, not a Jekyll output build check.",
    },
    null,
    2,
  ),
);
