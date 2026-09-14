"use client";

import { useRouter } from "next/navigation";
import { useProcessing } from "@/components/status/Processing";

export function EmployeeStatusButton({
  id,
  name,
  disabled,
}: {
  id: string;
  name: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const { run } = useProcessing();

  async function toggle() {
    const nextDisabled = !disabled;
    const confirmed = window.confirm(
      nextDisabled
        ? `Disable ${name}? They will stay on the roster but cannot receive new assets.`
        : `Enable ${name}? They will be available for new allocations.`,
    );
    if (!confirmed) return;

    await run(nextDisabled ? "Disabling employee" : "Enabling employee", async () => {
      const response = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: nextDisabled }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to update this employee.");
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      className={`inline-flex min-h-10 items-center justify-center rounded-md border px-3 text-xs font-medium ${
        disabled
          ? "border-cf-border bg-white text-cf-primary"
          : "border-cf-border bg-white text-cf-muted hover:text-cf-text"
      }`}
    >
      {disabled ? "Enable" : "Disable"}
    </button>
  );
}
