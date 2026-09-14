import assert from "node:assert/strict";
import { test } from "node:test";
import { loginRedirectPath, safeInternalPath } from "./auth-path";

test("keeps internal QR and UID destinations", () => {
  assert.equal(safeInternalPath("/a/CF-AST-000001"), "/a/CF-AST-000001");
  assert.equal(safeInternalPath("/assets"), "/assets");
  assert.equal(safeInternalPath("/employees/new"), "/employees/new");
  assert.equal(loginRedirectPath("/a/CF-AST-000001"), "/login?callbackUrl=%2Fa%2FCF-AST-000001");
});

test("rejects open redirects and login loops", () => {
  assert.equal(safeInternalPath("https://evil.example"), "/");
  assert.equal(safeInternalPath("//evil.example"), "/");
  assert.equal(safeInternalPath("/login"), "/");
  assert.equal(loginRedirectPath("/"), "/login");
});
