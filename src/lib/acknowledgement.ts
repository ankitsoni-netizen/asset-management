import type { Database, Json } from "@/types/database";
import {
  ACKNOWLEDGEMENT_EMAIL_FAILURE_AFTER_ALLOCATE,
  ACKNOWLEDGEMENT_RETRY_COOLDOWN_SECONDS,
} from "./constants";
import {
  sendAllocationEmail,
  type AllocationMail,
  type SendAllocationEmailResult,
} from "./email";
import { asRow } from "./mappers";
import type { EmailDeliveryStatus } from "./models";
import type { createServerSupabaseClient } from "./supabase/server";

type Client = Awaited<ReturnType<typeof createServerSupabaseClient>>;
type AllocationRow = Database["public"]["Tables"]["allocations"]["Row"];
type AssetRow = Database["public"]["Tables"]["assets"]["Row"];
type AssetTypeRow = Database["public"]["Tables"]["asset_types"]["Row"];
type AuditEvent = Database["public"]["Enums"]["audit_event"];

export type ClaimStatus = "claimed" | "already_sent" | "cooldown";

export type AcknowledgementContext = {
  status: ClaimStatus;
  allocation: AllocationRow;
  asset: AssetRow;
  assetType: AssetTypeRow;
};

export type AcknowledgementResult = {
  sent: boolean;
  alreadySent: boolean;
  skipped: boolean;
  configured: boolean;
  retry: boolean;
  messageId: string | null;
  error: string | null;
  attemptCount: number;
  adminMessage: string | null;
};

export type AcknowledgementStore = {
  claim: (allocationId: string, minIntervalSeconds: number) => Promise<AcknowledgementContext>;
  recordResult: (
    allocationId: string,
    update: {
      emailSent: boolean;
      deliveryStatus: EmailDeliveryStatus;
      emailError: string | null;
      messageId: string | null;
      sentAt: string | null;
    },
  ) => Promise<void>;
  writeAudit: (input: {
    action: AuditEvent;
    allocation: AllocationRow;
    assetId: string;
    payload: Json;
    actorEmail: string;
  }) => Promise<void>;
};

const inFlight = new Set<string>();

export function resetAcknowledgementLocks() {
  inFlight.clear();
}

export function resolveAcknowledgementClaim(input: {
  emailSent: boolean;
  deliveryStatus: EmailDeliveryStatus;
  lastAttemptedAt: Date | string | null;
  now?: Date;
  minIntervalSeconds?: number;
}): ClaimStatus {
  if (input.emailSent || input.deliveryStatus === "sent") {
    return "already_sent";
  }

  if (input.lastAttemptedAt) {
    const last = new Date(input.lastAttemptedAt).getTime();
    const elapsedMs = (input.now ?? new Date()).getTime() - last;
    const minMs = (input.minIntervalSeconds ?? ACKNOWLEDGEMENT_RETRY_COOLDOWN_SECONDS) * 1000;
    if (Number.isFinite(last) && elapsedMs < minMs) {
      return "cooldown";
    }
  }

  return "claimed";
}

export function acknowledgementAdminMessage(sent: boolean) {
  if (sent) return null;
  return ACKNOWLEDGEMENT_EMAIL_FAILURE_AFTER_ALLOCATE;
}

function mailFromContext(context: AcknowledgementContext): AllocationMail {
  return {
    employeeName: context.allocation.employee_name,
    employeeEmail: context.allocation.employee_email,
    assetName: context.assetType.name,
    uid: context.asset.uid,
    brand: context.asset.brand,
    model: context.asset.model,
    serialNumber: context.asset.serial_number,
    allocatedAt: new Date(context.allocation.allocated_at),
  };
}

function auditPayload(input: {
  recipient: string;
  attemptCount: number;
  retry: boolean;
  messageId?: string | null;
  error?: string | null;
}): Json {
  return {
    recipient: input.recipient,
    attemptCount: input.attemptCount,
    retry: input.retry,
    messageId: input.messageId ?? null,
    error: input.error ?? null,
  };
}

async function ignoreAuditFailure(task: Promise<void>) {
  try {
    await task;
  } catch {
    // Audit persistence must not undo a completed allocation or accepted SMTP send.
  }
}

export async function deliverAllocationAcknowledgement(input: {
  allocationId: string;
  actorEmail: string;
  isRetry?: boolean;
  minIntervalSeconds?: number;
  store: AcknowledgementStore;
  sendMail?: (mail: AllocationMail) => Promise<SendAllocationEmailResult>;
}): Promise<AcknowledgementResult> {
  const retry = Boolean(input.isRetry);
  const minIntervalSeconds = input.minIntervalSeconds ?? ACKNOWLEDGEMENT_RETRY_COOLDOWN_SECONDS;

  if (inFlight.has(input.allocationId)) {
    return {
      sent: false,
      alreadySent: false,
      skipped: true,
      configured: true,
      retry,
      messageId: null,
      error: "Acknowledgement email is already being sent.",
      attemptCount: 0,
      adminMessage: acknowledgementAdminMessage(false),
    };
  }

  inFlight.add(input.allocationId);
  try {
    const context = await input.store.claim(input.allocationId, minIntervalSeconds);
    const attemptCount = context.allocation.email_attempt_count;

    if (context.status === "already_sent") {
      return {
        sent: true,
        alreadySent: true,
        skipped: true,
        configured: true,
        retry,
        messageId: context.allocation.email_message_id,
        error: null,
        attemptCount,
        adminMessage: null,
      };
    }

    if (context.status === "cooldown") {
      return {
        sent: false,
        alreadySent: false,
        skipped: true,
        configured: true,
        retry,
        messageId: null,
        error: "Acknowledgement email was recently attempted. Try again shortly.",
        attemptCount,
        adminMessage: acknowledgementAdminMessage(false),
      };
    }

    if (retry) {
      await ignoreAuditFailure(
        input.store.writeAudit({
          action: "acknowledgement_email_retried",
          allocation: context.allocation,
          assetId: context.asset.id,
          actorEmail: input.actorEmail,
          payload: auditPayload({
            recipient: context.allocation.employee_email,
            attemptCount,
            retry: true,
          }),
        }),
      );
    }

    const result = await (input.sendMail ?? sendAllocationEmail)(mailFromContext(context));
    const deliveryStatus: EmailDeliveryStatus = result.sent
      ? "sent"
      : result.configured
        ? "failed"
        : "not_configured";
    const sentAt = result.sent ? new Date().toISOString() : null;

    try {
      await input.store.recordResult(input.allocationId, {
        emailSent: result.sent,
        deliveryStatus,
        emailError: result.sent ? null : result.error,
        messageId: result.sent ? result.messageId : null,
        sentAt,
      });
    } catch (error) {
      if (!result.sent) {
        throw error;
      }
    }

    await ignoreAuditFailure(
      input.store.writeAudit({
        action: result.sent ? "acknowledgement_email_sent" : "acknowledgement_email_failed",
        allocation: context.allocation,
        assetId: context.asset.id,
        actorEmail: input.actorEmail,
        payload: auditPayload({
          recipient: context.allocation.employee_email,
          attemptCount,
          retry,
          messageId: result.sent ? result.messageId : null,
          error: result.sent ? null : result.error,
        }),
      }),
    );

    return {
      sent: result.sent,
      alreadySent: false,
      skipped: false,
      configured: result.sent ? true : result.configured,
      retry,
      messageId: result.sent ? result.messageId : null,
      error: result.sent ? null : result.error,
      attemptCount,
      adminMessage: acknowledgementAdminMessage(result.sent),
    };
  } finally {
    inFlight.delete(input.allocationId);
  }
}

export function createAcknowledgementStore(supabase: Client, actorEmail: string): AcknowledgementStore {
  return {
    async claim(allocationId, minIntervalSeconds) {
      const { data, error } = await supabase.rpc("claim_acknowledgement_send", {
        p_allocation_id: allocationId,
        p_min_interval_seconds: minIntervalSeconds,
      });
      if (error) {
        throw new Error(error.message);
      }
      return asRow<AcknowledgementContext>(data);
    },
    async recordResult(allocationId, update) {
      const { error } = await supabase
        .from("allocations")
        .update({
          email_sent: update.emailSent,
          email_delivery_status: update.deliveryStatus,
          email_error: update.emailError,
          email_message_id: update.messageId,
          email_sent_at: update.sentAt,
        })
        .eq("id", allocationId);
      if (error) {
        throw new Error(error.message);
      }
    },
    async writeAudit(input) {
      const { error } = await supabase.from("audit_logs").insert({
        action: input.action,
        entity_type: "allocation",
        entity_id: input.allocation.id,
        asset_id: input.assetId,
        allocation_id: input.allocation.id,
        employee_id: input.allocation.employee_id,
        actor_email: actorEmail,
        payload: input.payload,
      });
      if (error) {
        throw new Error(error.message);
      }
    },
  };
}

export async function sendAcknowledgementForAllocation(
  supabase: Client,
  allocationId: string,
  actorEmail: string,
  options: { isRetry?: boolean } = {},
): Promise<AcknowledgementResult> {
  try {
    return await deliverAllocationAcknowledgement({
      allocationId,
      actorEmail,
      isRetry: options.isRetry,
      store: createAcknowledgementStore(supabase, actorEmail),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 240) : "Acknowledgement email could not be sent.";
    return {
      sent: false,
      alreadySent: false,
      skipped: false,
      configured: true,
      retry: Boolean(options.isRetry),
      messageId: null,
      error: message,
      attemptCount: 0,
      adminMessage: acknowledgementAdminMessage(false),
    };
  }
}
