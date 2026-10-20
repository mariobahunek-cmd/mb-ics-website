import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, statSync, symlinkSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

function fixture(fn) {
  const base = mkdtempSync(join(tmpdir(), 'reviews-hosting-'));
  try {
    const mount = join(base, 'mount'), site = join(base, 'public'), repo = join(base, 'repo');
    for (const path of [mount, site, repo]) mkdirSync(path);
    const mounts = join(base, 'mountinfo');
    writeFileSync(mounts, `10 1 8:1 / ${mount} rw,relatime - ext4 /dev/synthetic rw\n`);
    const env = {
      PATH: process.env.PATH, NODE_ENV: 'production', REVIEWS_MODE: 'production', HOST: '0.0.0.0', PORT: '10000',
      REVIEWS_KEY: randomBytes(32).toString('base64'), REVIEWS_SITE_URL: 'https://site.invalid', REVIEWS_API_URL: 'https://reviews.invalid',
      REVIEWS_ADMIN_ORIGIN: 'https://reviews.invalid', REVIEWS_DATA_DIR: join(mount, 'reviews'), REVIEWS_STATIC_DIR: site,
      OIDC_ISSUER: 'https://identity.invalid', OIDC_CLIENT_ID: 'synthetic-client', OIDC_CLIENT_SECRET: 'synthetic-not-a-credential',
      OIDC_DISCOVERY_URL: 'https://identity.invalid/.well-known/openid-configuration', OIDC_REDIRECT_URI: 'https://reviews.invalid/v1/admin/callback',
      OIDC_AUDIENCE: 'synthetic-admin-api', OIDC_JWKS_URL: 'https://identity.invalid/jwks', OIDC_SUBJECTS: 'synthetic-owner', OIDC_MFA_METHODS: 'hwk',
      TURNSTILE_SECRET: 'synthetic-not-a-credential', TURNSTILE_SITEKEY: 'synthetic', TURNSTILE_HOSTNAME: 'site.invalid',
      RESEND_API_KEY: 'synthetic-not-a-credential', MAIL_FROM: 'test@site.invalid'
    };
    const options = { mountPath: mount, mountInfoPath: mounts, repoRoot: repo };
    const run = () => spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e',
      `import { preflight } from ${JSON.stringify(new URL('./preflight.mjs', import.meta.url).href)}; await preflight(JSON.parse(process.argv[1])); console.log('PREFLIGHT_OK', process.umask().toString(8));`, JSON.stringify(options)],
      { env, encoding: 'utf8', timeout: 10000 });
    fn({ env, options, mount, mounts, site, repo, run });
  } finally { rmSync(base, { recursive: true, force: true }); }
}

test('private persistent fixture gets 0700 directory and 0077 umask', () => fixture(({ env, run }) => {
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PREFLIGHT_OK 77/);
  assert.equal(statSync(env.REVIEWS_DATA_DIR).mode & 0o777, 0o700);
}));

test('public directory cannot contain the private directory', () => fixture(({ env, mount, run }) => {
  env.REVIEWS_STATIC_DIR = mount;
  const result = run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Private data overlaps public or source tree/);
}));

test('ephemeral filesystem fails closed before creating private data', () => fixture(({ mounts, run, env }) => {
  writeFileSync(mounts, '');
  const result = run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Required writable persistent mount missing/);
  assert.throws(() => statSync(env.REVIEWS_DATA_DIR));
}));

test('private data must be the dedicated mount child', () => fixture(({ env, site, run }) => {
  env.REVIEWS_DATA_DIR = join(site, '..', 'elsewhere');
  const result = run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Private data must be persistent mount child/);
}));

test('local fallback is rejected by production entrypoint', () => fixture(({ env, run }) => {
  env.REVIEWS_MODE = 'local'; env.HOST = '127.0.0.1';
  const result = run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Production entrypoint requires production mode/);
}));

test('missing provider config delegates to current loadConfig and fails closed', () => fixture(({ env, run }) => {
  delete env.OIDC_CLIENT_SECRET;
  const result = run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing or unsafe production configuration/);
}));
test('missing stable capability key fails closed via loadConfig', () => fixture(({ env, run }) => {
  delete env.REVIEWS_KEY;
  assert.notEqual(run().status, 0);
}));

test('runtime older than pinned engine is rejected', () => fixture(({ options, run }) => {
  options.nodeVersion = '22.22.0';
  const result = run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Pinned Node 22.23.1 required/);
}));

test('private directory cannot be a symlink into public assets', () => fixture(({ env, site, run }) => {
  symlinkSync(site, env.REVIEWS_DATA_DIR);
  const result = run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Private directory must not be a symlink/);
}));

test('production executable rejects local mode before any listener or provider call', () => {
  const result = spawnSync(process.execPath, ['--experimental-strip-types', new URL('./start.mjs', import.meta.url).pathname], {
    env: { NODE_ENV: 'production', REVIEWS_MODE: 'local', HOST: '127.0.0.1' }, encoding: 'utf8', timeout: 10000
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Production entrypoint requires production mode/);
});

test('writability probe uses private permissions and is removed', () => fixture(({ run, env }) => {
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /WRITABLE_PRIVATE_DIR/);
  assert.deepEqual(readdirSync(env.REVIEWS_DATA_DIR), []);
}));
