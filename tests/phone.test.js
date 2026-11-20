import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { hashPhone, normalizePhone } from "../src/lib/phone.js";

// Must agree with the backend's lib/phone.js: these are the same vectors as its tests.
test("normalizes like the backend", () => {
  assert.equal(normalizePhone("+91 98765 43210"), "+919876543210");
  assert.equal(normalizePhone("098765 43210"), "+919876543210");
  assert.equal(normalizePhone("0091 9876543210"), "+919876543210");
  assert.equal(normalizePhone("(415) 555-0123", "1"), "+14155550123");
  assert.equal(normalizePhone("12345"), null);
  assert.equal(normalizePhone("9876543210", null), null);
});

test("hashes like the backend (SHA-256 hex)", async () => {
  const expected = createHash("sha256").update("+919876543210").digest("hex");
  assert.equal(await hashPhone("+919876543210"), expected);
});
