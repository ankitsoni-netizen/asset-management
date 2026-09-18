import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { Database, Json } from "@/types/database";
import {
  ACKNOWLEDGEMENT_EMAIL_FAILURE_AFTER_ALLOCATE,
} from "./constants";
import {
  deliverAllocationAcknowledgement,
  acknowledgementAdminMessage,
  resetAcknowledgementLocks,
  resolveAcknowledgementClaim,
  type AcknowledgementContext,
  type AcknowledgementStore,
} from "./acknowledgement";
import type { AllocationMail, SendAllocationEmailResult } from "./email";

type AllocationRow = Database["public"]["Tables"]["allocations"]["Row"];
type AssetRow = Database["public"]["Tables"]["assets"]["Row"];
type AssetTypeRow = Database["public"]["Tables"]["asset_types"]["Row"];

afterEach(() => {
  resetAcknowledgementLocks();
});

function allocationRow(overrides: Partial<AllocationRow> = {}): AllocationRow {
  return {
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
    email_error: null,
    email_sent: false,
    email_delivery_status: "pending",
    email_sent_at: null,
    email_attempt_count: 1,
    email_message_id: null,
    email_last_attempted_at: "2026-09-11T10:00:01.000Z",
    created_at: "2026-09-11T10:00:00.000Z",
    updated_at: "2026-09-11T10:00:00.000Z",
    ...overrides,
  };
}

function assetRow(overrides: Partial<AssetRow> = {}): AssetRow {
  return {
    id: "asset-1",
    uid: "CF-AST-000042",
    asset_type_id: "type-1",
    brand: "Apple",
    model: "MacBook Pro",
    serial_number: "C02X123",
    notes: null,
    status: "allocated",
    active: true,
    created_at: "2026-09-11T10:00:00.000Z",
    updated_at: "2026-09-11T10:00:00.000Z",
    ...overrides,
  };
}

function assetTypeRow(overrides: Partial<AssetTypeRow> = {}): AssetTypeRow {
  return {
    id: "type-1",
    name: "Laptop",
    is_custom: false,
    created_at: "2026-09-11T10:00:00.000Z",
    updated_at: "2026-09-11T10:00:00.000Z",
    ...overrides,
  };
}

function context(overrides: Partial<AcknowledgementContext> = {}): AcknowledgementContext {
  return {
    status: "claimed",
    allocation: allocationRow(),
    asset: assetRow(),
    assetType: assetTypeRow(),
    ...overrides,
  };
}

function memoryStore(initial: AcknowledgementContext) {
  const audits: Array<{ action: string; payload: Json; recipient?: string }> = [];
  const results: Array<Parameters<AcknowledgementStore["recordResult"]>[1]> = [];
  let current = initial;
  const store: AcknowledgementStore = {
    async claim() {
      return current;
    },
    async recordResult(_id, update) {
      results.push(update);
      current = {
        ...current,
        allocation: {
          ...current.allocation,
          email_sent: update.emailSent,
          email_delivery_status: update.deliveryStatus,
          email_error: update.emailError,
          email_message_id: update.messageId,
          email_sent_at: update.sentAt,
        },
      };
    },
    async writeAudit(input) {
      audits.push({
        action: input.action,
        payload: input.payload,
        recipient:
          input.payload && typeof input.payload === "object" && !Array.isArray(input.payload)
            ? String(input.payload.recipient ?? "")
            : "",
      });
    },
  };
  return { store, audits, results, get current() { return current; }, setCurrent(next: AcknowledgementContext) { current = next; } };
}

test("claim logic prevents duplicate and rapid retry sends", () => {
  assert.equal(
    resolveAcknowledgementClaim({
      emailSent: true,
      deliveryStatus: "sent",
      lastAttemptedAt: new Date(),
    }),
    "already_sent",
  );
  assert.equal(
    resolveAcknowledgementClaim({
      emailSent: false,
      deliveryStatus: "failed",
      lastAttemptedAt: new Date("2026-09-11T10:00:00.000Z"),
      now: new Date("2026-09-11T10:00:10.000Z"),
      minIntervalSeconds: 30,
    }),
    "cooldown",
  );
  assert.equal(
    resolveAcknowledgementClaim({
      emailSent: false,
      deliveryStatus: "failed",
      lastAttemptedAt: new Date("2026-09-11T10:00:00.000Z"),
      now: new Date("2026-09-11T10:01:00.000Z"),
      minIntervalSeconds: 30,
    }),
    "claimed",
  );
});

test("allocation delivery is considered sent only after SMTP acceptance", async () => {
  const { store, audits, results } = memoryStore(context());
  const sentMail: AllocationMail[] = [];
  const result = await deliverAllocationAcknowledgement({
    allocationId: "alloc-1",
    actorEmail: "admin@cloutflow.com",
    store,
    sendMail: async (mail) => {
      sentMail.push(mail);
      return { sent: true, messageId: "<id-1@smtp-relay.brevo.com>" };
    },
  });

  assert.equal(result.sent, true);
  assert.equal(result.adminMessage, null);
  assert.equal(sentMail[0]?.employeeEmail, "jordan@cloutflow.com");
  assert.equal(results[0]?.emailSent, true);
  assert.equal(results[0]?.deliveryStatus, "sent");
  assert.equal(results[0]?.messageId, "<id-1@smtp-relay.brevo.com>");
  assert.equal(audits.at(-1)?.action, "acknowledgement_email_sent");
  assert.doesNotMatch(JSON.stringify(audits), /SMTP_PASS|smtp-secret/);
});

test("SMTP failure keeps the allocation and surfaces the admin warning", async () => {
  const { store, audits, results } = memoryStore(context());
  const result = await deliverAllocationAcknowledgement({
    allocationId: "alloc-1",
    actorEmail: "admin@cloutflow.com",
    store,
    sendMail: async () => ({ sent: false, configured: true, error: "Could not reach the SMTP server." }),
  });

  assert.equal(result.sent, false);
  assert.equal(result.adminMessage, ACKNOWLEDGEMENT_EMAIL_FAILURE_AFTER_ALLOCATE);
  assert.equal(results[0]?.emailSent, false);
  assert.equal(results[0]?.deliveryStatus, "failed");
  assert.equal(audits.at(-1)?.action, "acknowledgement_email_failed");
});

test("missing SMTP configuration returns an honest error without sending", async () => {
  const { store, results } = memoryStore(context());
  let called = false;
  const result = await deliverAllocationAcknowledgement({
    allocationId: "alloc-1",
    actorEmail: "admin@cloutflow.com",
    store,
    sendMail: async () => {
      called = true;
      return { sent: false, configured: false, error: "SMTP is not configured. Missing SMTP_PASS." };
    },
  });

  assert.equal(called, true);
  assert.equal(result.sent, false);
  assert.equal(result.configured, false);
  assert.match(result.error ?? "", /SMTP is not configured/);
  assert.equal(results[0]?.deliveryStatus, "not_configured");
  assert.equal(result.adminMessage, ACKNOWLEDGEMENT_EMAIL_FAILURE_AFTER_ALLOCATE);
});

test("cooldown skips a rapid duplicate send", async () => {
  const { store } = memoryStore(context({ status: "cooldown" }));
  let sends = 0;
  const result = await deliverAllocationAcknowledgement({
    allocationId: "alloc-1",
    actorEmail: "admin@cloutflow.com",
    isRetry: true,
    store,
    sendMail: async () => {
      sends += 1;
      return { sent: true, messageId: "<too-soon@smtp>" };
    },
  });
  assert.equal(sends, 0);
  assert.equal(result.skipped, true);
  assert.equal(result.sent, false);
  assert.match(result.error ?? "", /recently attempted/);
});

test("retry is idempotent when the acknowledgement was already sent", async () => {
  const { store } = memoryStore(
    context({
      status: "already_sent",
      allocation: allocationRow({
        email_sent: true,
        email_delivery_status: "sent",
        email_message_id: "<already@smtp>",
        email_sent_at: "2026-09-11T10:00:05.000Z",
      }),
    }),
  );
  let sends = 0;
  const result = await deliverAllocationAcknowledgement({
    allocationId: "alloc-1",
    actorEmail: "admin@cloutflow.com",
    isRetry: true,
    store,
    sendMail: async () => {
      sends += 1;
      return { sent: true, messageId: "<dup@smtp>" };
    },
  });

  assert.equal(sends, 0);
  assert.equal(result.sent, true);
  assert.equal(result.alreadySent, true);
  assert.equal(result.skipped, true);
  assert.equal(result.messageId, "<already@smtp>");
});

test("retry records a retried audit event and can send after a failure", async () => {
  const { store, audits } = memoryStore(
    context({
      allocation: allocationRow({ email_attempt_count: 2, email_delivery_status: "failed" }),
    }),
  );
  const result = await deliverAllocationAcknowledgement({
    allocationId: "alloc-1",
    actorEmail: "admin@cloutflow.com",
    isRetry: true,
    store,
    sendMail: async () => ({ sent: true, messageId: "<retry@smtp>" }),
  });

  assert.equal(result.sent, true);
  assert.deepEqual(
    audits.map((item) => item.action),
    ["acknowledgement_email_retried", "acknowledgement_email_sent"],
  );
});

test("rapid in-flight duplicate requests do not send twice", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let sends = 0;
  const { store } = memoryStore(context());
  const sendMail = async (): Promise<SendAllocationEmailResult> => {
    sends += 1;
    await gate;
    return { sent: true, messageId: `<${sends}@smtp>` };
  };

  const first = deliverAllocationAcknowledgement({
    allocationId: "alloc-1",
    actorEmail: "admin@cloutflow.com",
    store,
    sendMail,
  });
  await new Promise((resolve) => setImmediate(resolve));
  const second = await deliverAllocationAcknowledgement({
    allocationId: "alloc-1",
    actorEmail: "admin@cloutflow.com",
    store,
    sendMail,
  });
  release();
  const firstResult = await first;

  assert.equal(firstResult.sent, true);
  assert.equal(second.skipped, true);
  assert.equal(sends, 1);
});

test("allocation acknowledgement is sent only to the mapped employee", async () => {
  const next = "sam@cloutflow.com";
  const { store, audits } = memoryStore(
    context({
      allocation: allocationRow({
        employee_name: "Sam Patel",
        employee_email: next,
      }),
    }),
  );
  const recipients: string[] = [];
  const result = await deliverAllocationAcknowledgement({
    allocationId: "alloc-1",
    actorEmail: "admin@cloutflow.com",
    store,
    sendMail: async (mail) => {
      recipients.push(mail.employeeEmail);
      return { sent: true, messageId: "<map@smtp>" };
    },
  });

  assert.equal(result.sent, true);
  assert.deepEqual(recipients, [next]);
  assert.equal(result.adminMessage, null);
  assert.equal(audits.at(-1)?.recipient, next);
  assert.equal(acknowledgementAdminMessage(false), ACKNOWLEDGEMENT_EMAIL_FAILURE_AFTER_ALLOCATE);
  assert.equal(acknowledgementAdminMessage(true), null);
});
