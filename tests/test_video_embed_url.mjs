// Functional test for the consent-gated YouTube embed URL builder in main.js.
// main.js is a browser IIFE, so this extracts only the pure helper and runs
// it in a vm sandbox with the exact behavior cases the modal depends on.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../main.js', import.meta.url), 'utf8');
const start = source.indexOf('const buildVideoEmbedUrl');
assert.ok(start !== -1, 'buildVideoEmbedUrl not found in main.js');
const end = source.indexOf('const openVideoModal', start);
assert.ok(end !== -1, 'buildVideoEmbedUrl block not terminated before openVideoModal');
const helperSource = source.slice(start, end);

const context = {};
vm.createContext(context);
vm.runInContext(helperSource + '\nthis.__fn = buildVideoEmbedUrl;', context);
const build = context.__fn;

// Provided timestamp is preserved.
assert.equal(
    build('DPaV_-g0ykk', '18'),
    'https://www.youtube-nocookie.com/embed/DPaV_-g0ykk?autoplay=1&rel=0&start=18'
);

// Cards without data-video-start keep the exact legacy URL.
assert.equal(
    build('a2VQtHrOqzI', undefined),
    'https://www.youtube-nocookie.com/embed/a2VQtHrOqzI?autoplay=1&rel=0'
);

// Non-numeric, negative, overflowing or garbage starts are dropped, never interpolated.
for (const bad of ['', 'abc', '18abc', '-5', '999999', '8"><script>', null]) {
    const url = build('crnMqP0DqZQ', bad);
    assert.equal(url, 'https://www.youtube-nocookie.com/embed/crnMqP0DqZQ?autoplay=1&rel=0',
        `start=${JSON.stringify(bad)} must be ignored`);
}

// Malformed video ids never produce a URL (no arbitrary embed target).
assert.equal(build('', '18'), '');
assert.equal(build('javascript:alert(1)', '18'), '');
assert.equal(build('../../etc', '18'), '');

console.log('PASS video embed URL builder: timestamp preserved, invalid input rejected');
