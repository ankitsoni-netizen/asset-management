"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Camera, Search } from "lucide-react";
import { useProcessing } from "@/components/status/Processing";
import { QrScannerSheet } from "@/components/scan/QrScannerSheet";
import { scannedAssetUid } from "@/lib/scan";

export function UidLookup() {
  const router = useRouter();
  const { startNavigation } = useProcessing();
  const [uid, setUid] = useState("");
  const [scanOpen, setScanOpen] = useState(false);

  function openRecord(raw: string) {
    const value = scannedAssetUid(raw) ?? raw.trim().toUpperCase().replace(/\s+/g, "");
    if (!value) return;
    startNavigation("Opening record");
    router.push(`/a/${encodeURIComponent(value)}`);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    openRecord(uid);
  }

  return (
    <>
      <form onSubmit={onSubmit} className="flex w-full max-w-xl items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cf-muted" />
          <input
            value={uid}
            onChange={(event) => setUid(event.target.value)}
            placeholder="Look up UID"
            enterKeyHint="search"
            inputMode="search"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="h-11 w-full rounded-md border border-cf-border bg-cf-soft pr-3 pl-10"
          />
        </div>
        <button
          type="button"
          onClick={() => setScanOpen(true)}
          aria-label="Scan printed QR"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-cf-border bg-white text-cf-text"
        >
          <Camera className="h-4 w-4" />
        </button>
        <button
          type="submit"
          className="hidden h-11 shrink-0 rounded-md border border-cf-border px-3 text-sm font-medium text-cf-text hover:border-cf-ink sm:inline-flex sm:items-center"
        >
          Open
        </button>
      </form>
      <QrScannerSheet
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={openRecord}
        title="Look up asset"
        hint="Scan the QR already printed on the device."
      />
    </>
  );
}
