"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Search } from "lucide-react";

export function UidLookup() {
  const router = useRouter();
  const [uid, setUid] = useState("");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const value = uid.trim().toUpperCase().replace(/\s+/g, "");
    if (!value) return;
    router.push(`/a/${encodeURIComponent(value)}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-xl items-center gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cf-muted" />
        <input
          value={uid}
          onChange={(event) => setUid(event.target.value)}
          placeholder="Look up allocation by UID"
          className="h-10 w-full rounded-md border border-cf-border bg-cf-soft pr-3 pl-10 text-sm"
        />
      </div>
      <button
        type="submit"
        className="h-10 rounded-md border border-cf-border px-3 text-sm font-medium text-cf-text hover:border-cf-ink"
      >
        Open
      </button>
    </form>
  );
}
