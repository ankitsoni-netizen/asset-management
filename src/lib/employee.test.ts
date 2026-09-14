import assert from "node:assert/strict";
import { test } from "node:test";
import { isOfficialEmployeeEmail, OFFICIAL_EMAIL_HINT } from "./employee";

test("accepts official Cloutflow and backstage emails", () => {
  assert.equal(isOfficialEmployeeEmail("name@cloutflow.com"), true);
  assert.equal(isOfficialEmployeeEmail("Name@Cloutflow.COM"), true);
  assert.equal(isOfficialEmployeeEmail("lead@backstage.example"), true);
});

test("rejects personal or empty emails", () => {
  assert.equal(isOfficialEmployeeEmail("name@gmail.com"), false);
  assert.equal(isOfficialEmployeeEmail(""), false);
  assert.ok(OFFICIAL_EMAIL_HINT.includes("@cloutflow.com"));
});
