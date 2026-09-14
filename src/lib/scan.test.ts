import assert from "node:assert/strict";
import { test } from "node:test";
import { parseScannedPayload, scannedAssetUid, scannedEmployeeFields } from "./scan";

test("extracts an asset UID from a record URL", () => {
  assert.equal(scannedAssetUid("http://localhost:3100/a/CF-AST-000042"), "CF-AST-000042");
  assert.equal(parseScannedPayload("https://desk.local/a/device-9?x=1").uid, "DEVICE-9");
});

test("treats a printed sticker value as the asset UID", () => {
  assert.equal(scannedAssetUid(" CF-AST-000007 "), "CF-AST-000007");
});

test("extracts an official employee email from a badge QR", () => {
  assert.deepEqual(scannedEmployeeFields("mailto:jordan@cloutflow.com"), {
    email: "jordan@cloutflow.com",
    code: null,
  });
  assert.equal(parseScannedPayload("https://id.local/?email=sam@cloutflow.com").email, "sam@cloutflow.com");
});

test("stores a non-email badge QR as an employee code", () => {
  assert.deepEqual(scannedEmployeeFields("EMP-204"), {
    email: null,
    code: "EMP-204",
  });
});
