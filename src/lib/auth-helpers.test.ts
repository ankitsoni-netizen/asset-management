import assert from "node:assert/strict";
import { test } from "node:test";
import { ADMIN_EMAIL, isAdminEmail, normalizeEmail } from "./constants";

test("only the normalized admin email is authorized", () => {
  assert.equal(ADMIN_EMAIL, "admin@cloutflow.com");
  assert.equal(normalizeEmail("  Admin@Cloutflow.com  "), "admin@cloutflow.com");
  assert.equal(isAdminEmail("admin@cloutflow.com"), true);
  assert.equal(isAdminEmail("  Admin@Cloutflow.com  "), true);
  assert.equal(isAdminEmail("user@cloutflow.com"), false);
  assert.equal(isAdminEmail("admin@gmail.com"), false);
  assert.equal(isAdminEmail(null), false);
});
