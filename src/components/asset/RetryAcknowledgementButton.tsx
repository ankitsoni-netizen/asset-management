"use client";

import { useState } from "react";

export function RetryAcknowledgementButton({
  allocationId,
  onSent,
}: {
  allocationId: string;
  onSent?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function retry() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/allocations/${allocationId}/retry-email`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Retry failed.");
      }
      if (data.emailSent) {
        setMessage(data.alreadySent ? "The acknowledgement email was already sent." : "Acknowledgement email sent.");
        onSent?.();
      } else {
        setMessage(data.emailError || "Acknowledgement email could not be sent.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Retry failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={retry}
        disabled={busy}
        className="cf-action border border-cf-border disabled:opacity-60"
      >
        {busy ? "Sending..." : "Retry acknowledgement email"}
      </button>
      {message ? <p className="text-sm text-cf-muted">{message}</p> : null}
    </div>
  );
}
