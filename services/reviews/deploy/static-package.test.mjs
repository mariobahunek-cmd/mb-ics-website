import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, cpSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { request } from 'node:http';
import { createServer } from 'node:net';

const root = resolve(new URL('../../../', import.meta.url).pathname);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function packageFixture(fn) {
  const base = mkdtempSync(join(tmpdir(), 'reviews-css-symlink-'));
  try {
    const deploy = join(base, 'services/reviews/deploy');
    mkdirSync(deploy, { recursive: true });
    cpSync(join(root, 'services/reviews/deploy/package-static.mjs'), join(deploy, 'package-static.mjs'));
    fn({ base, deploy, run: () => spawnSync(process.execPath, [join(deploy, 'package-static.mjs')], { encoding: 'utf8' }) });
  } finally { rmSync(base, { recursive: true, force: true }); }
}

test('allowlist refuses CSS source symlink to a private key', () => packageFixture(({ base, deploy, run }) => {
  const key = join(base, 'private-key'); writeFileSync(key, 'synthetic-secret');
  symlinkSync(key, join(base, 'reviews.css'));
  const result = run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ELOOP/);
  assert.throws(() => statSync(join(deploy, 'empty-public/reviews.css')));
  assert.equal(readFileSync(key, 'utf8'), 'synthetic-secret');
}));

test('allowlist replaces static-root symlink without copying or deleting private target', () => packageFixture(({ base, deploy, run }) => {
  const privateDir = join(base, 'private'); mkdirSync(privateDir);
  writeFileSync(join(privateDir, 'reviews.sqlite'), 'synthetic-private-data');
  cpSync(join(root, 'reviews.css'), join(base, 'reviews.css'));
  symlinkSync(privateDir, join(deploy, 'empty-public'));
  const result = run(); assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readdirSync(join(deploy, 'empty-public')), ['reviews.css']);
  assert.equal(readFileSync(join(privateDir, 'reviews.sqlite'), 'utf8'), 'synthetic-private-data');
  assert.deepEqual(readFileSync(join(deploy, 'empty-public/reviews.css')), readFileSync(join(root, 'reviews.css')));
}));
test('actual native production build serves only byte-identical reviewed CSS without private exposure', { timeout: 120000 }, async () => {
  const base = mkdtempSync(join(tmpdir(), 'reviews-css-production-'));
  let child;
  try {
    const repo = join(base, 'repo'), service = join(repo, 'services/reviews');
    mkdirSync(service, { recursive: true });
    for (const path of ['src', 'admin', 'migrations', 'deploy', 'package.json', 'package-lock.json'])
      cpSync(join(root, 'services/reviews', path), join(service, path), { recursive: true });
    cpSync(join(root, 'reviews.css'), join(repo, 'reviews.css'));
    const staticRoot = join(service, 'deploy/empty-public');
    mkdirSync(staticRoot, { recursive: true });
    writeFileSync(join(staticRoot, 'unknown-private-artifact'), 'must never survive packaging');
    const yaml = readFileSync(join(service, 'deploy/render.yaml'), 'utf8');
    const command = yaml.match(/^\s+buildCommand: (.+)$/m)[1];
    const build = spawnSync('/bin/sh', ['-c', command], { cwd: repo, encoding: 'utf8', timeout: 90000 });
    console.log('ACTUAL_BUILD', command, build.status, build.stdout, build.stderr);
    assert.equal(build.status, 0, build.stderr);
    const mount = join(base, 'mount'); mkdirSync(mount);
    const mountInfoPath = join(base, 'mountinfo');
    writeFileSync(mountInfoPath, `10 1 8:1 / ${mount} rw,relatime - ext4 /dev/synthetic rw\n`);
    const socket = createServer(); await new Promise(r => socket.listen(0, '127.0.0.1', r));
    const port = socket.address().port; await new Promise(r => socket.close(r));
    const env = {
      PATH: process.env.PATH, NODE_ENV: 'production', REVIEWS_MODE: 'production', REVIEWS_CLOSED: 'true', HOST: '127.0.0.1', PORT: String(port),
      REVIEWS_STATIC_DIR: staticRoot, REVIEWS_DATA_DIR: join(mount, 'reviews'), REVIEWS_KEY: randomBytes(32).toString('base64'),
      REVIEWS_SITE_URL: 'https://site.invalid', REVIEWS_API_URL: 'https://reviews.invalid', REVIEWS_ADMIN_ORIGIN: 'https://reviews.invalid',
      OIDC_ISSUER: 'https://identity.invalid', OIDC_DISCOVERY_URL: 'https://identity.invalid/.well-known/openid-configuration',
      OIDC_CLIENT_ID: 'synthetic-client', OIDC_CLIENT_SECRET: 'synthetic-not-a-credential', OIDC_REDIRECT_URI: 'https://reviews.invalid/v1/admin/callback',
      OIDC_AUDIENCE: 'synthetic-api', OIDC_JWKS_URL: 'https://identity.invalid/jwks', OIDC_SUBJECTS: 'synthetic-owner', OIDC_MFA_METHODS: 'hwk',
      TURNSTILE_SECRET: 'synthetic-not-a-credential', TURNSTILE_SITEKEY: 'synthetic', TURNSTILE_HOSTNAME: 'site.invalid',
      RESEND_API_KEY: 'synthetic-not-a-credential', MAIL_FROM: 'test@site.invalid'
    };
    const loader = join(base, 'fixture.mjs');
    writeFileSync(loader, `// Synthetic test only: no real outbound identity/mail/challenge.\nimport { preflight } from ${JSON.stringify(join(service, 'deploy/preflight.mjs'))};\nglobalThis.fetch = async input => {\n const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;\n if (url !== process.env.OIDC_DISCOVERY_URL) throw new Error('Forbidden outbound request');\n return Response.json({ issuer: process.env.OIDC_ISSUER, authorization_endpoint: process.env.OIDC_ISSUER+'/authorize', token_endpoint: process.env.OIDC_ISSUER+'/token', jwks_uri: process.env.OIDC_JWKS_URL, response_types_supported:['code'], subject_types_supported:['public'], id_token_signing_alg_values_supported:['RS256'], token_endpoint_auth_methods_supported:['client_secret_basic'], code_challenge_methods_supported:['S256'] });\n};\nawait preflight(${JSON.stringify({ mountPath: mount, mountInfoPath, repoRoot: repo })});\nawait import(${JSON.stringify(join(service, 'src/server.ts'))});\n`);
    child = spawn(process.execPath, ['--experimental-strip-types', loader], { cwd: service, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let logs = ''; child.stdout.on('data', x => logs += x); child.stderr.on('data', x => logs += x);
    const http = (path, host = 'reviews.invalid', method = 'GET') => new Promise((resolve, reject) => {
      const req = request({ hostname: '127.0.0.1', port, path, method, headers: { Host: host, ...(method === 'POST' ? { Origin: env.REVIEWS_SITE_URL, 'Content-Type': 'application/json' } : {}) } }, res => {
        const chunks = []; res.on('data', x => chunks.push(x)); res.on('end', () => { const body = Buffer.concat(chunks); console.log('ACTUAL_HTTP', JSON.stringify({ path, host, method, status: res.statusCode, bytes: body.length, sha256: hash(body) })); resolve({ status: res.statusCode, body, headers: res.headers }); });
      }); req.on('error', reject); req.end(method === 'POST' ? '{}' : undefined);
    });
    for (let i = 0; i < 100; i++) {
      try { if ((await http('/v1/reviews/summary')).status === 200) break; } catch {}
      assert.equal(child.exitCode, null, logs);
      if (i === 99) assert.fail('startup timeout: ' + logs);
      await new Promise(r => setTimeout(r, 50));
    }
    assert.equal((await http('/admin/')).status, 200);
    const css = await http('/reviews.css');
    assert.equal(css.status, 200, 'required admin /reviews.css must return 200 after actual production build');
    assert.match(css.headers['content-type'], /^text\/css/);
    const source = readFileSync(join(root, 'reviews.css'));
    assert.deepEqual(css.body, source);
    assert.equal(hash(readFileSync(join(staticRoot, 'reviews.css'))), hash(source));
    assert.deepEqual(readdirSync(staticRoot), ['reviews.css']);
    for (const path of ['/unknown-private-artifact', '/__local/login', '/__local/mail', '/reviews.sqlite', '/reviews.sqlite-wal', '/reviews.sqlite-shm', '/local-key', '/mail/', '/services/reviews/src/config.ts', '/deploy/render.yaml', '/docs/reviews-operations.md', '/_site/', '/.git/config', '/var/data/reviews/reviews.sqlite', '/../reviews.sqlite', '/%2e%2e/reviews.sqlite'])
      assert.equal((await http(path)).status, 404, path);
    assert.equal((await http('/reviews.css', 'attacker.invalid')).status, 403);
    assert.equal((await http('/v1/reviews/summary', 'attacker.invalid')).status, 403);
    assert.deepEqual(JSON.parse((await http('/v1/config')).body), { local: false, sitekey: 'synthetic', closed: true });
    assert.equal((await http('/v1/reviews', 'reviews.invalid', 'POST')).status, 503);
    assert.equal((await http('/reviews/')).status, 404, 'H-SPEC-2 remains explicitly unfixed');
    assert.equal(statSync(join(mount, 'reviews')).mode & 0o777, 0o700);
    assert.equal(statSync(join(mount, 'reviews/reviews.sqlite')).mode & 0o777, 0o600);
    console.log('CSS_SOURCE_SHA256', hash(source));
  } finally {
    if (child && child.exitCode === null) { const exited = new Promise(r => child.once('exit', r)); child.kill('SIGTERM'); await exited; assert.equal(child.exitCode, 0); }
    rmSync(base, { recursive: true, force: true });
  }
});
