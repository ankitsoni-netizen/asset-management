import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatVehicleNumbers,
  isParkingType,
  isValetParking,
  PARKING_TYPE,
  parkingAllocationErrorMessage,
  parkingSpotLabel,
  parkingTypeLabel,
  parseParkingAllocationBody,
  parseParkingSlot,
  parseVehicleNumbers,
  summarizeParkingAllocations,
} from "./parking";

test("labels valet and basement parking types", () => {
  assert.equal(parkingTypeLabel(PARKING_TYPE.valet), "Valet");
  assert.equal(parkingTypeLabel(PARKING_TYPE.basement_2), "Basement 2");
  assert.equal(isValetParking(PARKING_TYPE.valet), true);
  assert.equal(isValetParking(PARKING_TYPE.basement_1), false);
  assert.equal(isParkingType("valet"), true);
  assert.equal(isParkingType("backstage"), false);
});

test("omits slot numbers for valet and includes them for basement", () => {
  assert.equal(parkingSpotLabel(PARKING_TYPE.valet, null), "Valet");
  assert.equal(parkingSpotLabel(PARKING_TYPE.valet, "12"), "Valet");
  assert.equal(parkingSpotLabel(PARKING_TYPE.basement_1, "A-12"), "Basement 1 · Slot A-12");
  assert.equal(parseParkingSlot(PARKING_TYPE.valet, "99"), null);
  assert.equal(parseParkingSlot(PARKING_TYPE.basement_3, "  18  "), "18");
  assert.equal(parseParkingSlot(PARKING_TYPE.basement_3, "   "), null);
});

test("parses one or more vehicle numbers and drops blanks and duplicates", () => {
  assert.deepEqual(parseVehicleNumbers(["hr26 ab 1234", "HR26AB1234", " ", "dl 1c 0001"]), [
    "HR26AB1234",
    "DL1C0001",
  ]);
  assert.deepEqual(parseVehicleNumbers("mh12xy9999"), ["MH12XY9999"]);
  assert.deepEqual(parseVehicleNumbers(["", "  "]), []);
  assert.equal(formatVehicleNumbers(["HR26AB1234", "DL1C0001"]), "HR26AB1234, DL1C0001");
});

test("accepts valet allocations without a slot number", () => {
  const parsed = parseParkingAllocationBody({
    parkingType: PARKING_TYPE.valet,
    slotNumber: null,
    vehicleNumbers: ["hr26 ab 1234"],
    employeeId: "3b1c2d4e-5f67-489a-ab0c-1d2e3f4a5b6c",
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.data.parkingType, PARKING_TYPE.valet);
  assert.equal(parsed.data.slotNumber, null);
  assert.deepEqual(parsed.data.vehicleNumbers, ["HR26AB1234"]);
});

test("still requires a slot for basement parking", () => {
  const parsed = parseParkingAllocationBody({
    parkingType: PARKING_TYPE.basement_1,
    slotNumber: "  ",
    vehicleNumbers: ["DL1C0001"],
    employeeId: "3b1c2d4e-5f67-489a-ab0c-1d2e3f4a5b6c",
  });
  assert.equal(parsed.ok, false);
  if (parsed.ok) return;
  assert.match(parsed.error, /slot number/i);
});

test("explains valet database errors in plain language", () => {
  assert.match(
    parkingAllocationErrorMessage(new Error('record "v_spot" is not assigned yet')),
    /valet parking/i,
  );
});

test("summarizes current parking allocations by type", () => {
  const summary = summarizeParkingAllocations([
    { parkingType: PARKING_TYPE.valet },
    { parkingType: PARKING_TYPE.valet },
    { parkingType: PARKING_TYPE.basement_1 },
  ]);
  assert.equal(summary.allocated, 3);
  assert.equal(summary.byType.find((type) => type.value === PARKING_TYPE.valet)?.count, 2);
  assert.equal(summary.byType.find((type) => type.value === PARKING_TYPE.basement_3)?.count, 0);
});
