import { mkdir, chmod, readFile, realpath, lstat, open, unlink } from 'node:fs/promises';
import { resolve, sep, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.ts';

// Fixture arguments are an exported testing seam, never environment switches.
// The executable entrypoint always uses these production defaults.
export async function preflight({ mountPath = '/var/data', mountInfoPath = '/proc/self/mountinfo', repoRoot = fileURLToPath(new URL('../../../', import.meta.url)), nodeVersion = process.versions.node } = {}) {
  if (nodeVersion !== '22.23.1') throw new Error('Pinned Node 22.23.1 required');
  if (process.env.NODE_ENV !== 'production' || process.env.REVIEWS_MODE !== 'production')
    throw new Error('Production entrypoint requires production mode');
  process.umask(0o077);
  const config = loadConfig(process.env);
  const mount = await realpath(mountPath);
  const records = (await readFile(mountInfoPath, 'utf8')).trim().split('\n');
  const mounted = records.some(line => {
    const [before, after] = line.split(' - ');
    const fields = before.split(' '), fs = (after ?? '').split(' ')[0];
    const path = fields[4]?.replace(/\\([0-7]{3})/g, (_, code) => String.fromCharCode(parseInt(code, 8)));
    return (path === mountPath || path === mount) && fields[5]?.split(',').includes('rw') && ['ext4', 'xfs', 'btrfs'].includes(fs);
  });
  if (!mounted) throw new Error('Required writable persistent mount missing');
  const data = resolve(await realpath(dirname(resolve(config.data))), basename(config.data));
  if (data !== resolve(mount, 'reviews')) throw new Error('Private data must be persistent mount child');
  const publicDir = await realpath(process.env.REVIEWS_STATIC_DIR);
  const repo = await realpath(repoRoot);
  if ([publicDir, repo].some(root => data === root || data.startsWith(root + sep) || root.startsWith(data + sep)))
    throw new Error('Private data overlaps public or source tree');
  await mkdir(data, { recursive: true, mode: 0o700 });
  if ((await lstat(data)).isSymbolicLink()) throw new Error('Private directory must not be a symlink');
  await chmod(data, 0o700);
  const probe = resolve(data, `.preflight-${process.pid}`);
  const fd = await open(probe, 'wx', 0o600);
  try { await fd.writeFile('private write probe'); await fd.sync(); }
  finally { await fd.close(); await unlink(probe); }
  console.log('WRITABLE_PRIVATE_DIR');
  return config;
}
