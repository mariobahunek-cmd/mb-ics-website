#!/usr/bin/env -S node --experimental-strip-types
import { preflight } from './preflight.mjs';
// No fixture overrides, no secret generation, no fallback mode.
await preflight();
await import('../src/server.ts');
