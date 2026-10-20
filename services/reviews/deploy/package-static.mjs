// Build-time allowlist only. Never copy a repository or generated site tree.
import { constants, openSync, fstatSync, readFileSync, closeSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';

const source = new URL('../../../reviews.css', import.meta.url);
// No trailing slash: directory-symlink targets must never be traversed by rm.
const target = new URL('./empty-public', import.meta.url);
// Refuse symlinks (including a substituted CSS source) rather than copying secrets.
const fd = openSync(source, constants.O_RDONLY | constants.O_NOFOLLOW);
let css;
try {
  if (!fstatSync(fd).isFile()) throw new Error('Reviewed CSS must be a regular file');
  css = readFileSync(fd);
} finally { closeSync(fd); }
// Discard stale/unknown artifacts; rmSync removes a root symlink, not its target.
rmSync(target, { recursive: true, force: true });
mkdirSync(target);
writeFileSync(new URL('./empty-public/reviews.css', import.meta.url), css, { flag: 'wx', mode: 0o644 });
