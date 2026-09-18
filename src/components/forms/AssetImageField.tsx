"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Plus, X } from "lucide-react";

const DEFAULT_ACCEPT = "image/*";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);

function extensionFor(file: File) {
  const type = file.type.toLowerCase();
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["png", "webp", "gif", "jpg", "jpeg"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  return "jpg";
}

function mimeFor(file: File) {
  const type = file.type.toLowerCase();
  if (type === "image/jpg" || type === "image/jpeg") return "image/jpeg";
  if (ALLOWED_TYPES.has(type)) return type;
  const ext = extensionFor(file);
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

function isImageFile(file: File) {
  const type = file.type.toLowerCase();
  if (ALLOWED_TYPES.has(type)) return true;
  if (!type || type === "application/octet-stream") {
    return /\.(jpe?g|png|webp|gif)$/i.test(file.name);
  }
  return false;
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
  const filesRef = useRef(files);
  const sequenceRef = useRef(0);
  filesRef.current = files;
  const [previews, setPreviews] = useState<{ name: string; url: string }[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const next = files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) }));
    setPreviews(next);
    return () => {
      next.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [files]);

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const selected = Array.from(list).filter((file) => file.size > 0);
    const incoming = selected.filter(isImageFile).map((file) => {
      sequenceRef.current += 1;
      return new File([file], `asset-photo-${Date.now()}-${sequenceRef.current}.${extensionFor(file)}`, {
        type: mimeFor(file),
        lastModified: file.lastModified || Date.now(),
      });
    });
    const skipped = selected.length - incoming.length;
    if (!incoming.length) {
      setMessage("Choose PNG, JPG, WEBP, or GIF photos.");
      return;
    }
    onChange([...filesRef.current, ...incoming]);
    setMessage(skipped ? `${incoming.length} added. Some files were skipped because they are not supported images.` : "");
    if (libraryRef.current) libraryRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  function removeFile(index: number) {
    onChange(filesRef.current.filter((_, i) => i !== index));
  }

  const hasPhotos = files.length > 0;

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
          <span className="mt-2 text-sm font-medium">{hasPhotos ? "Take another photo" : "Take photo"}</span>
        </button>
        <button
          type="button"
          onClick={() => libraryRef.current?.click()}
          className="flex min-h-[96px] flex-col items-center justify-center rounded-xl border border-dashed border-cf-border bg-cf-soft px-4 py-6 text-center"
        >
          <ImagePlus className="h-5 w-5 text-cf-muted" />
          <span className="mt-2 text-sm font-medium">{hasPhotos ? "Add more photos" : "Upload photos"}</span>
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-cf-muted sm:text-left">{hint}</p>
      {message ? <p className="mt-2 text-sm text-red-700">{message}</p> : null}
      {previews.length ? (
        <>
          <p className="mt-4 text-sm font-medium">
            {previews.length} {previews.length === 1 ? "photo" : "photos"} selected
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {previews.map((file, index) => (
              <div key={`${file.url}`} className="relative overflow-hidden rounded-lg border border-cf-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
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
            <button
              type="button"
              onClick={() => libraryRef.current?.click()}
              className="flex h-28 flex-col items-center justify-center rounded-lg border border-dashed border-cf-border bg-cf-soft text-cf-muted"
            >
              <Plus className="h-5 w-5" />
              <span className="mt-1 text-sm font-medium">Add more</span>
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
