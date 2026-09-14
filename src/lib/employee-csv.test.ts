import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EMPLOYEE_CSV_SAMPLE,
  parseCsvLine,
  parseEmployeeCsv,
} from "./employee-csv";

test("parses quoted CSV cells and doubled quotes", () => {
  assert.deepEqual(parseCsvLine('Jordan Lee,jordan@cloutflow.com,Tech,Engineer,'), [
    "Jordan Lee",
    "jordan@cloutflow.com",
    "Tech",
    "Engineer",
    "",
  ]);
  assert.deepEqual(parseCsvLine('"Lee, Jordan",jordan@cloutflow.com,Tech,"Engineer ""II""",EMP-1'), [
    "Lee, Jordan",
    "jordan@cloutflow.com",
    "Tech",
    'Engineer "II"',
    "EMP-1",
  ]);
});

test("sample sheet parses into valid employee rows", () => {
  const parsed = parseEmployeeCsv(EMPLOYEE_CSV_SAMPLE);
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.rows.length, 3);
  assert.equal(parsed.rows[0]?.email, "jordan@cloutflow.com");
  assert.equal(parsed.rows[0]?.code, "EMP-204");
  assert.equal(parsed.rows[1]?.code, undefined);
  assert.equal(parsed.rows[2]?.department, "Ops");
});

test("accepts employee_id column and header aliases", () => {
  const byId = parseEmployeeCsv(
    "name,email,department,position,employee_id\nJordan Lee,jordan@cloutflow.com,Tech,Engineer,emp-204\n",
  );
  assert.deepEqual(byId.errors, []);
  assert.equal(byId.rows[0]?.code, "EMP-204");

  const parsed = parseEmployeeCsv(
    "Employee Name;Official Email;Dept;Role;Employee ID\nSam Patel;sam@cloutflow.com;Ops;Lead;emp-9\n",
  );
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.rows[0]?.name, "Sam Patel");
  assert.equal(parsed.rows[0]?.code, "EMP-9");

  const legacy = parseEmployeeCsv(
    "name,email,department,position,code\nAlex Chen,alex@cloutflow.com,Finance,Analyst,emp-7\n",
  );
  assert.deepEqual(legacy.errors, []);
  assert.equal(legacy.rows[0]?.code, "EMP-7");
});

test("rejects unofficial emails, missing columns, and duplicates in the sheet", () => {
  const missing = parseEmployeeCsv("name,email\nJordan Lee,jordan@cloutflow.com\n");
  assert.equal(missing.rows.length, 0);
  assert.match(missing.errors[0]?.message ?? "", /department, position/);

  const unofficial = parseEmployeeCsv(
    "name,email,department,position,employee_id\nJordan Lee,jordan@gmail.com,Tech,Engineer,\n",
  );
  assert.match(unofficial.errors[0]?.message ?? "", /@cloutflow.com/);

  const duplicate = parseEmployeeCsv(
    [
      "name,email,department,position,employee_id",
      "Jordan Lee,jordan@cloutflow.com,Tech,Engineer,EMP-1",
      "Jordan Two,jordan@cloutflow.com,Ops,Lead,EMP-2",
    ].join("\n"),
  );
  assert.equal(duplicate.rows.length, 1);
  assert.match(duplicate.errors[0]?.message ?? "", /duplicated/);

  const duplicateId = parseEmployeeCsv(
    [
      "name,email,department,position,employee_id",
      "Jordan Lee,jordan@cloutflow.com,Tech,Engineer,EMP-1",
      "Jordan Two,jordan.two@cloutflow.com,Ops,Lead,EMP-1",
    ].join("\n"),
  );
  assert.equal(duplicateId.rows.length, 1);
  assert.match(duplicateId.errors[0]?.message ?? "", /employee ID is duplicated/);
});
