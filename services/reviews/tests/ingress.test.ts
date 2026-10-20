import { test } from "node:test";
import assert from "node:assert/strict";
import { clientAddress } from "../src/ingress.ts";
test("rate identity ignores forged forwarding unless the exact trusted ingress overwrites a valid single client IP", () => {
  assert.equal(
    clientAddress("192.0.2.4", "203.0.113.5", "127.0.0.1"),
    "192.0.2.4",
  );
  assert.equal(
    clientAddress("127.0.0.1", "203.0.113.5", "127.0.0.1"),
    "203.0.113.5",
  );
  assert.equal(
    clientAddress("127.0.0.1", "203.0.113.5, 192.0.2.9", "127.0.0.1"),
    "127.0.0.1",
  );
  assert.equal(clientAddress("127.0.0.1", "forged", undefined), "127.0.0.1");
});
