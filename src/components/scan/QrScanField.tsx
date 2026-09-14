"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { QrScannerSheet } from "./QrScannerSheet";

export function QrScanField({
  value,
  onChange,
  onRawScan,
  label,
  placeholder,
  required = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onRawScan?: (raw: string) => void;
  label: string;
  placeholder?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <span className="cf-label">{label}</span>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          className="h-12 w-full rounded-md border border-cf-border px-3 font-mono sm:h-11 sm:flex-1"
        />
        <button type="button" onClick={() => setOpen(true)} className="cf-action border border-cf-border bg-white">
          <Camera className="h-4 w-4" />
          Scan QR
        </button>
      </div>
      <QrScannerSheet
        open={open}
        onClose={() => setOpen(false)}
        onScan={(raw) => {
          onRawScan?.(raw);
          onChange(raw);
        }}
      />
    </div>
  );
}
