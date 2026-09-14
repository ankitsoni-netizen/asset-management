"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Camera, ImageUp, X } from "lucide-react";
import type { Html5Qrcode } from "html5-qrcode";

export function QrScannerSheet({
  open,
  onClose,
  onScan,
  title = "Scan printed QR",
  hint = "Point the camera at the QR already printed on the device or badge.",
}: {
  open: boolean;
  onClose: () => void;
  onScan: (raw: string) => void;
  title?: string;
  hint?: string;
}) {
  const regionId = useId().replace(/:/g, "");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cameraFileRef = useRef<HTMLInputElement>(null);
  const libraryFileRef = useRef<HTMLInputElement>(null);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const [busy, setBusy] = useState(false);
  const [scanError, setScanError] = useState("");

  onScanRef.current = onScan;
  onCloseRef.current = onClose;

  function applyScan(raw: string) {
    const next = raw.trim();
    if (!next) return;
    onScanRef.current(next);
    onCloseRef.current();
  }

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function start() {
      setScanError("");
      setBusy(true);
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode(regionId);
        scannerRef.current = scanner;
        const edge = Math.max(
          180,
          Math.min(window.innerWidth - 32, Math.floor(window.innerHeight * 0.5), 340),
        );
        await scanner.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: edge, aspectRatio: 1 },
          (decoded) => applyScan(decoded),
          () => undefined,
        );
      } catch {
        if (!cancelled) {
          setScanError("Camera could not be started. Take a photo of the QR code or type the value.");
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    void start();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (!scanner) return;
      void Promise.resolve(scanner.stop())
        .catch(() => undefined)
        .then(() => Promise.resolve(scanner.clear()).catch(() => undefined));
    };
  }, [open, regionId]);

  async function onFile(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    setScanError("");
    setBusy(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(`${regionId}-file`);
      const decoded = await scanner.scanFile(file, false);
      await Promise.resolve(scanner.clear()).catch(() => undefined);
      applyScan(decoded);
    } catch {
      setScanError("Could not read a QR code from that image.");
    } finally {
      setBusy(false);
      if (cameraFileRef.current) cameraFileRef.current.value = "";
      if (libraryFileRef.current) libraryFileRef.current.value = "";
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black sm:items-center sm:justify-center sm:bg-black/60 sm:p-4">
      <div className="flex h-full w-full flex-col bg-black text-white sm:h-auto sm:max-h-[90dvh] sm:max-w-md sm:overflow-y-auto sm:rounded-2xl sm:bg-white sm:text-cf-text">
        <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-5 sm:pt-5">
          <h3 className="text-lg font-medium">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close scanner"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 sm:bg-cf-soft sm:text-cf-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 px-4 text-sm text-white/70 sm:px-5 sm:text-cf-muted">{hint}</p>
        <div
          id={regionId}
          className="qr-scan-region mt-4 min-h-[240px] flex-1 overflow-hidden bg-black sm:mx-5 sm:flex-none sm:rounded-xl"
        />
        <div id={`${regionId}-file`} className="hidden" />
        {busy ? <p className="mt-3 px-4 text-sm text-white/70 sm:px-5 sm:text-cf-muted">Starting camera...</p> : null}
        {scanError ? <p className="mt-3 px-4 text-sm text-red-300 sm:px-5 sm:text-red-700">{scanError}</p> : null}
        <div className="mt-auto flex flex-col gap-2 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:mt-4 sm:px-5 sm:pb-5">
          <button
            type="button"
            onClick={() => cameraFileRef.current?.click()}
            className="cf-action border border-white/20 bg-white text-cf-ink sm:border-cf-border"
          >
            <Camera className="h-4 w-4" />
            Take photo
          </button>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-none sm:flex sm:flex-row">
            <button
              type="button"
              onClick={() => libraryFileRef.current?.click()}
              className="cf-action border border-white/20 sm:border-cf-border sm:bg-white sm:text-cf-text"
            >
              <ImageUp className="h-4 w-4" />
              Upload photo
            </button>
            <button type="button" onClick={onClose} className="cf-action text-white/80 sm:text-cf-muted">
              Cancel
            </button>
          </div>
        </div>
        <input
          ref={cameraFileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => void onFile(event.target.files)}
        />
        <input
          ref={libraryFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void onFile(event.target.files)}
        />
      </div>
    </div>
  );
}
