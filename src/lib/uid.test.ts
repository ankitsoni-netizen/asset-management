import assert from "node:assert/strict";
import { test } from "node:test";
import { isAssetUid, nextGeneratedUids, parseGeneratedUidNumber } from "./uid";
import { normalizeUid } from "./utils";

test("accepts printed UIDs already on the device", () => {
  assert.equal(isAssetUid("CF-AST-000001"), true);
  assert.equal(isAssetUid("cf-ast-123456"), true);
  assert.equal(isAssetUid(" DEVICE-42 "), true);
  assert.equal(isAssetUid("ABC-99"), true);
});

test("rejects empty UID values", () => {
  assert.equal(isAssetUid(""), false);
  assert.equal(isAssetUid("   "), false);
});

test("normalizes scanned UID lookup values", () => {
  assert.equal(normalizeUid(" cf-ast-000001 "), "CF-AST-000001");
  assert.equal(normalizeUid("device 42"), "DEVICE42");
});

test("allocates the next CF-AST UIDs after existing inventory", () => {
  assert.deepEqual(nextGeneratedUids([], 2), ["CF-AST-000001", "CF-AST-000002"]);
  assert.deepEqual(nextGeneratedUids(["CF-AST-000007", "LAPTOP-9"], 2), ["CF-AST-000008", "CF-AST-000009"]);
  assert.equal(parseGeneratedUidNumber("cf-ast-000042"), 42);
  assert.equal(parseGeneratedUidNumber("LAPTOP-9"), null);
});
