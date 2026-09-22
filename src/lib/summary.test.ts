import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDashboardSummary, filterHolders, mergeParkingIntoHolders } from "./summary";

const laptop = {
  id: "asset-1",
  uid: "CF-AST-000001",
  status: "allocated",
  active: true,
  brand: "Apple",
  model: "MacBook",
  serialNumber: "SN-1",
  assetTypeId: "type-laptop",
  assetTypeName: "Laptop",
};

const charger = {
  id: "asset-2",
  uid: "CF-AST-000002",
  status: "available",
  active: true,
  brand: "Anker",
  model: "65W",
  serialNumber: null,
  assetTypeId: "type-charger",
  assetTypeName: "Charger",
};

const retired = {
  id: "asset-3",
  uid: "CF-AST-000003",
  status: "available",
  active: false,
  brand: "Dell",
  model: "Old",
  serialNumber: "SN-3",
  assetTypeId: "type-laptop",
  assetTypeName: "Laptop",
};

const jordan = {
  id: "emp-1",
  name: "Jordan Lee",
  email: "jordan@cloutflow.com",
  department: "Tech",
  position: "Engineer",
  disabled: false,
};

const rina = {
  id: "emp-2",
  name: "Rina Shah",
  email: "rina@cloutflow.com",
  department: "Ops",
  position: "Lead",
  disabled: false,
};

const alumni = {
  id: "emp-3",
  name: "Alex Alumni",
  email: "alex@cloutflow.com",
  department: "Tech",
  position: "Advisor",
  disabled: true,
};

test("returns empty totals when the desk has no records", () => {
  const summary = buildDashboardSummary([], [], []);
  assert.equal(summary.assets.total, 0);
  assert.equal(summary.employees.total, 0);
  assert.deepEqual(summary.assignments, []);
  assert.deepEqual(summary.holders, []);
  assert.deepEqual(summary.assets.byType, []);
  assert.deepEqual(summary.employees.byDepartment, []);
});

test("counts inventory by assignment, active flag, type, and who currently holds each asset", () => {
  const allocatedAt = new Date("2026-09-18T08:00:00.000Z");
  const summary = buildDashboardSummary(
    [laptop, charger, retired],
    [jordan, rina, alumni],
    [
      {
        id: "alloc-1",
        assetId: laptop.id,
        employeeId: jordan.id,
        employeeName: jordan.name,
        employeeEmail: jordan.email,
        department: jordan.department,
        position: jordan.position,
        allocatedAt,
      },
    ],
  );

  assert.equal(summary.assets.total, 3);
  assert.equal(summary.assets.available, 2);
  assert.equal(summary.assets.allocated, 1);
  assert.equal(summary.assets.active, 2);
  assert.equal(summary.assets.inactive, 1);
  assert.equal(summary.assets.allocatable, 1);

  assert.deepEqual(
    summary.assets.byType.map((type) => ({ name: type.name, total: type.total, available: type.available })),
    [
      { name: "Charger", total: 1, available: 1 },
      { name: "Laptop", total: 2, available: 1 },
    ],
  );

  assert.equal(summary.employees.total, 3);
  assert.equal(summary.employees.active, 2);
  assert.equal(summary.employees.disabled, 1);
  assert.equal(summary.employees.withAssets, 1);
  assert.equal(summary.employees.withoutAssets, 2);

  assert.deepEqual(
    summary.employees.byDepartment.map((row) => ({
      department: row.department,
      total: row.total,
      active: row.active,
      disabled: row.disabled,
      withAssets: row.withAssets,
    })),
    [
      { department: "Ops", total: 1, active: 1, disabled: 0, withAssets: 0 },
      { department: "Tech", total: 2, active: 1, disabled: 1, withAssets: 1 },
    ],
  );

  assert.equal(summary.assignments.length, 1);
  assert.equal(summary.assignments[0]?.uid, laptop.uid);
  assert.equal(summary.assignments[0]?.employeeName, jordan.name);
  assert.equal(summary.assignments[0]?.department, "Tech");
});

test("counts an employee once even if they currently hold more than one asset", () => {
  const summary = buildDashboardSummary(
    [laptop, { ...charger, status: "allocated" }],
    [jordan],
    [
      {
        id: "alloc-1",
        assetId: laptop.id,
        employeeId: jordan.id,
        employeeName: jordan.name,
        employeeEmail: jordan.email,
        department: jordan.department,
        position: jordan.position,
        allocatedAt: new Date("2026-09-18T08:00:00.000Z"),
      },
      {
        id: "alloc-2",
        assetId: charger.id,
        employeeId: jordan.id,
        employeeName: jordan.name,
        employeeEmail: jordan.email,
        department: jordan.department,
        position: jordan.position,
        allocatedAt: new Date("2026-09-18T09:00:00.000Z"),
      },
    ],
  );

  assert.equal(summary.employees.withAssets, 1);
  assert.equal(summary.assignments.length, 2);
  assert.equal(summary.assignments[0]?.uid, charger.uid);
  assert.equal(summary.holders.length, 1);
  assert.equal(summary.holders[0]?.employeeName, jordan.name);
  assert.deepEqual(
    summary.holders[0]?.assets.map((asset) => asset.uid),
    [charger.uid, laptop.uid],
  );
});

test("keeps each person's assets together when more than one employee holds hardware", () => {
  const summary = buildDashboardSummary(
    [laptop, { ...charger, status: "allocated" }],
    [jordan, rina],
    [
      {
        id: "alloc-1",
        assetId: laptop.id,
        employeeId: jordan.id,
        employeeName: jordan.name,
        employeeEmail: jordan.email,
        department: jordan.department,
        position: jordan.position,
        allocatedAt: new Date("2026-09-18T08:00:00.000Z"),
      },
      {
        id: "alloc-2",
        assetId: charger.id,
        employeeId: rina.id,
        employeeName: rina.name,
        employeeEmail: rina.email,
        department: rina.department,
        position: rina.position,
        allocatedAt: new Date("2026-09-18T09:00:00.000Z"),
      },
    ],
  );

  assert.deepEqual(
    summary.holders.map((holder) => ({
      name: holder.employeeName,
      uids: holder.assets.map((asset) => asset.uid),
    })),
    [
      { name: jordan.name, uids: [laptop.uid] },
      { name: rina.name, uids: [charger.uid] },
    ],
  );
});

test("filters currently allocated holders by person or asset fields", () => {
  const summary = buildDashboardSummary(
    [laptop, { ...charger, status: "allocated" }],
    [jordan, rina],
    [
      {
        id: "alloc-1",
        assetId: laptop.id,
        employeeId: jordan.id,
        employeeName: jordan.name,
        employeeEmail: jordan.email,
        department: jordan.department,
        position: jordan.position,
        allocatedAt: new Date("2026-09-18T08:00:00.000Z"),
      },
      {
        id: "alloc-2",
        assetId: charger.id,
        employeeId: rina.id,
        employeeName: rina.name,
        employeeEmail: rina.email,
        department: rina.department,
        position: rina.position,
        allocatedAt: new Date("2026-09-18T09:00:00.000Z"),
      },
    ],
  );

  assert.equal(filterHolders(summary.holders, "  ").length, 2);
  assert.deepEqual(
    filterHolders(summary.holders, "jordan").map((holder) => holder.employeeName),
    [jordan.name],
  );
  assert.deepEqual(
    filterHolders(summary.holders, "Ops").map((holder) => holder.employeeName),
    [rina.name],
  );
  assert.deepEqual(
    filterHolders(summary.holders, laptop.uid).map((holder) => ({
      name: holder.employeeName,
      uids: holder.assets.map((asset) => asset.uid),
    })),
    [{ name: jordan.name, uids: [laptop.uid] }],
  );
  assert.equal(filterHolders(summary.holders, "missing").length, 0);
});

test("keeps every asset on a person match, but only matching assets for UID search", () => {
  const summary = buildDashboardSummary(
    [laptop, { ...charger, status: "allocated" }],
    [jordan],
    [
      {
        id: "alloc-1",
        assetId: laptop.id,
        employeeId: jordan.id,
        employeeName: jordan.name,
        employeeEmail: jordan.email,
        department: jordan.department,
        position: jordan.position,
        allocatedAt: new Date("2026-09-18T08:00:00.000Z"),
      },
      {
        id: "alloc-2",
        assetId: charger.id,
        employeeId: jordan.id,
        employeeName: jordan.name,
        employeeEmail: jordan.email,
        department: jordan.department,
        position: jordan.position,
        allocatedAt: new Date("2026-09-18T09:00:00.000Z"),
      },
    ],
  );

  assert.deepEqual(
    filterHolders(summary.holders, "Jordan")[0]?.assets.map((asset) => asset.uid),
    [charger.uid, laptop.uid],
  );
  assert.deepEqual(
    filterHolders(summary.holders, "MacBook")[0]?.assets.map((asset) => asset.uid),
    [laptop.uid],
  );
});

test("adds parking tags to holders and includes people who only have parking", () => {
  const allocatedAt = new Date("2026-09-18T08:00:00.000Z");
  const summary = buildDashboardSummary(
    [laptop],
    [jordan, rina],
    [
      {
        id: "alloc-1",
        assetId: laptop.id,
        employeeId: jordan.id,
        employeeName: jordan.name,
        employeeEmail: jordan.email,
        department: jordan.department,
        position: jordan.position,
        allocatedAt,
      },
    ],
  );

  const holders = mergeParkingIntoHolders(summary.holders, [
    {
      allocationId: "park-1",
      parkingType: "valet",
      slotNumber: null,
      vehicleNumbers: ["HR26AB1234"],
      employeeId: jordan.id,
      employeeName: jordan.name,
      employeeEmail: jordan.email,
      department: jordan.department,
      position: jordan.position,
      allocatedAt: new Date("2026-09-18T10:00:00.000Z"),
    },
    {
      allocationId: "park-2",
      parkingType: "basement_1",
      slotNumber: "A-12",
      vehicleNumbers: ["DL1C0001"],
      employeeId: rina.id,
      employeeName: rina.name,
      employeeEmail: rina.email,
      department: rina.department,
      position: rina.position,
      allocatedAt: new Date("2026-09-18T11:00:00.000Z"),
    },
  ]);

  assert.deepEqual(
    holders.map((holder) => ({
      name: holder.employeeName,
      uids: holder.assets.map((asset) => asset.uid),
      parking: holder.parking.map((row) => row.parkingType),
    })),
    [
      { name: jordan.name, uids: [laptop.uid], parking: ["valet"] },
      { name: rina.name, uids: [], parking: ["basement_1"] },
    ],
  );

  assert.deepEqual(
    filterHolders(holders, "valet").map((holder) => holder.employeeName),
    [jordan.name],
  );
  assert.deepEqual(
    filterHolders(holders, "A-12").map((holder) => holder.employeeName),
    [rina.name],
  );
  assert.deepEqual(
    filterHolders(holders, "HR26AB1234")[0]?.parking.map((row) => row.parkingType),
    ["valet"],
  );
});
