import assert from "node:assert/strict";
import { test } from "node:test";
import { asDate, asDateOrNull, many, mapAllocation, mapAllocationImage, mapAssetType, mapEmployee, one } from "./mappers";

test("one() unwraps arrays and nulls", () => {
  assert.equal(one(null), null);
  assert.equal(one("a"), "a");
  assert.equal(one(["b"]), "b");
  assert.equal(one([]), null);
});

test("many() normalizes related rows", () => {
  assert.deepEqual(many(null), []);
  assert.deepEqual(many({ id: 1 }), [{ id: 1 }]);
  assert.deepEqual(many([{ id: 1 }, { id: 2 }]), [{ id: 1 }, { id: 2 }]);
});

test("maps asset types and images to application field names", () => {
  const type = mapAssetType({
    id: "type-1",
    name: "Laptop",
    is_custom: false,
    created_at: "2026-09-11T10:00:00.000Z",
    updated_at: "2026-09-11T10:00:00.000Z",
  });
  assert.equal(type.isCustom, false);
  assert.ok(type.createdAt instanceof Date);

  const image = mapAllocationImage({
    id: "img-1",
    allocation_id: "alloc-1",
    filename: "photo.jpg",
    mime_type: "image/jpeg",
    storage_path: "alloc-1/photo.jpg",
    created_at: "2026-09-11T10:00:00.000Z",
  });
  assert.equal(image.allocationId, "alloc-1");
  assert.equal(image.mimeType, "image/jpeg");
});

test("maps employee roster rows without assets", () => {
  const employee = mapEmployee({
    id: "emp-1",
    name: "Jordan Lee",
    email: "jordan@cloutflow.com",
    department: "Tech",
    position: "Engineer",
    code: "EMP-204",
    created_at: "2026-09-11T10:00:00.000Z",
    updated_at: "2026-09-11T10:00:00.000Z",
  });
  assert.equal(employee.code, "EMP-204");
  assert.equal(employee.email, "jordan@cloutflow.com");
});

test("date helpers preserve null ended timestamps", () => {
  assert.ok(asDate("2026-09-11T10:00:00.000Z") instanceof Date);
  assert.equal(asDateOrNull(null), null);
});

test("maps acknowledgement delivery fields from allocation rows", () => {
  const allocation = mapAllocation({
    id: "alloc-1",
    asset_id: "asset-1",
    employee_id: "emp-1",
    employee_name: "Jordan Lee",
    department: "Tech",
    position: "Engineer",
    employee_email: "jordan@cloutflow.com",
    action: "allocated",
    allocated_at: "2026-09-11T10:00:00.000Z",
    ended_at: null,
    is_current: true,
    confirmation_note: null,
    email_error: "Could not reach the SMTP server.",
    email_sent: false,
    email_delivery_status: "failed",
    email_sent_at: null,
    email_attempt_count: 2,
    email_message_id: null,
    email_last_attempted_at: "2026-09-11T10:01:00.000Z",
    created_at: "2026-09-11T10:00:00.000Z",
    updated_at: "2026-09-11T10:01:00.000Z",
  });
  assert.equal(allocation.emailSent, false);
  assert.equal(allocation.emailDeliveryStatus, "failed");
  assert.equal(allocation.emailAttemptCount, 2);
  assert.equal(allocation.emailError, "Could not reach the SMTP server.");
  assert.ok(allocation.emailLastAttemptedAt instanceof Date);
});
