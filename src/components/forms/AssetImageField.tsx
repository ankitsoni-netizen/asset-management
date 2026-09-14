"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";

const DEFAULT_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

function fileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export function AssetImageField({
  files,
  onChange,
  accept = DEFAULT_ACCEPT,
  required = false,
  hint = "PNG, JPG, WEBP. Add every relevant angle.",
  className,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  accept?: string;
  required?: boolean;
  hint?: string;
  className?: string;
}) {
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<{ name: string; url: string }[]>([]);

  useEffect(() => {
    const next = files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) }));
    setPreviews(next);
    return () => {
      next.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [files]);

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const incoming = Array.from(list);
    const existing = new Set(files.map(fileKey));
    onChange([...files, ...incoming.filter((file) => !existing.has(fileKey(file)))]);
    if (libraryRef.current) libraryRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className={className}>
      <input
        ref={libraryRef}
        type="file"
        accept={accept}
        multiple
        required={required && files.length === 0}
        className="hidden"
        onChange={(event) => addFiles(event.target.files)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => addFiles(event.target.files)}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex min-h-[96px] flex-col items-center justify-center rounded-xl border border-dashed border-cf-border bg-cf-soft px-4 py-6 text-center"
        >
          <Camera className="h-5 w-5 text-cf-muted" />
          <span className="mt-2 text-sm font-medium">Take photo</span>
        </button>
        <button
          type="button"
          onClick={() => libraryRef.current?.click()}
          className="flex min-h-[96px] flex-col items-center justify-center rounded-xl border border-dashed border-cf-border bg-cf-soft px-4 py-6 text-center"
        >
          <ImagePlus className="h-5 w-5 text-cf-muted" />
          <span className="mt-2 text-sm font-medium">Upload images</span>
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-cf-muted sm:text-left">{hint}</p>
      {previews.length ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {previews.map((file, index) => (
            <div key={`${file.name}-${index}`} className="relative overflow-hidden rounded-lg border border-cf-border">
              <img src={file.url} alt={file.name} className="h-28 w-full object-cover" />
              <button
                type="button"
                onClick={() => removeFile(index)}
                aria-label={`Remove ${file.name}`}
                className="absolute right-1.5 top-1.5 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/75 text-white hover:bg-black"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
