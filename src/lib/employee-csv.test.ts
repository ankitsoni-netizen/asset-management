import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EMPLOYEE_CSV_SAMPLE,
  decodeCsvBytes,
  parseCsvLine,
  parseEmployeeCsv,
} from "./employee-csv";

test("parses quoted CSV cells and doubled quotes", () => {
  assert.deepEqual(parseCsvLine('Jordan,Engineer,jordan@cloutflow.com,Tech,'), [
    "Jordan",
    "Engineer",
    "jordan@cloutflow.com",
    "Tech",
    "",
  ]);
  assert.deepEqual(parseCsvLine('"Lee, Jordan",Engineer,jordan@cloutflow.com,Tech,EMP-1'), [
    "Lee, Jordan",
    "Engineer",
    "jordan@cloutflow.com",
    "Tech",
    "EMP-1",
  ]);
});

test("sample sheet parses into valid employee rows", () => {
  const parsed = parseEmployeeCsv(EMPLOYEE_CSV_SAMPLE);
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.rows.length, 3);
  assert.equal(parsed.rows[0]?.name, "Jordan");
  assert.equal(parsed.rows[0]?.email, "jordan@cloutflow.com");
  assert.equal(parsed.rows[0]?.code, "EMP-204");
  assert.equal(parsed.rows[1]?.code, undefined);
  assert.equal(parsed.rows[2]?.department, "Ops");
});

test("parses the attached sample layout including a UTF-8 BOM", () => {
  const csv =
    "\uFEFFname,email,department,position,employee_id\r\nJordan Lee,jordan@cloutflow.com,Tech,Engineer,EMP-204\r\nAlex Chen,alex@cloutflow.com,Finance,Analyst,\r\nSam Patel,sam@cloutflow.com,Ops,Operations Lead,EMP-318\r\n";
  const parsed = parseEmployeeCsv(csv);
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.rows.length, 3);
  assert.equal(parsed.rows[0]?.name, "Jordan Lee");
  assert.equal(parsed.rows[1]?.code, undefined);
  assert.equal(parsed.rows[2]?.code, "EMP-318");
});

test("decodes UTF-16 CSV bytes and rejects Excel workbooks", () => {
  const utf16 = Buffer.from("\uFEFFFirst Name,Position,Email ID,Department\nJordan,Engineer,jordan@cloutflow.com,Tech\n", "utf16le");
  const parsed = parseEmployeeCsv(decodeCsvBytes(utf16.buffer.slice(utf16.byteOffset, utf16.byteOffset + utf16.byteLength)));
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.rows[0]?.name, "Jordan");

  assert.throws(
    () => decodeCsvBytes(Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x00]).buffer),
    /Excel workbook/,
  );
});

test("accepts first name, email ID headers, Excel sep hints, and optional employee ID", () => {
  const human = parseEmployeeCsv(
    "First Name,Position,Email ID,Department\nJordan,Engineer,jordan@cloutflow.com,Tech\n",
  );
  assert.deepEqual(human.errors, []);
  assert.equal(human.rows[0]?.name, "Jordan");
  assert.equal(human.rows[0]?.code, undefined);

  const excel = parseEmployeeCsv(
    "sep=,\nFirst Name,Position,Email ID,Department,Employee ID\nSam,Lead,sam@cloutflow.com,Ops,emp-9\n",
  );
  assert.deepEqual(excel.errors, []);
  assert.equal(excel.rows[0]?.name, "Sam");
  assert.equal(excel.rows[0]?.code, "EMP-9");

  const legacy = parseEmployeeCsv(
    "name,email,department,position,code\nAlex Chen,alex@cloutflow.com,Finance,Analyst,emp-7\n",
  );
  assert.deepEqual(legacy.errors, []);
  assert.equal(legacy.rows[0]?.code, "EMP-7");
});

test("rejects unofficial emails, missing columns, and duplicates in the sheet", () => {
  const missing = parseEmployeeCsv("name,email\nJordan,jordan@cloutflow.com\n");
  assert.equal(missing.rows.length, 0);
  assert.match(missing.errors[0]?.message ?? "", /First Name, Position, Email ID, and Department/);

  const unofficial = parseEmployeeCsv(
    "First Name,Position,Email ID,Department,Employee ID\nJordan,Engineer,jordan@gmail.com,Tech,\n",
  );
  assert.match(unofficial.errors[0]?.message ?? "", /@cloutflow.com/);

  const duplicate = parseEmployeeCsv(
    [
      "First Name,Position,Email ID,Department,Employee ID",
      "Jordan,Engineer,jordan@cloutflow.com,Tech,EMP-1",
      "Jordan Two,Lead,jordan@cloutflow.com,Ops,EMP-2",
    ].join("\n"),
  );
  assert.equal(duplicate.rows.length, 1);
  assert.match(duplicate.errors[0]?.message ?? "", /duplicated/);

  const duplicateId = parseEmployeeCsv(
    [
      "First Name,Position,Email ID,Department,Employee ID",
      "Jordan,Engineer,jordan@cloutflow.com,Tech,EMP-1",
      "Alex,Lead,alex@cloutflow.com,Ops,EMP-1",
    ].join("\n"),
  );
  assert.equal(duplicateId.rows.length, 1);
  assert.match(duplicateId.errors[0]?.message ?? "", /employee ID is duplicated/);
});
