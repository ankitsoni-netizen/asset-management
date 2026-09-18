"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

export function CollapsibleSection({
  label,
  title,
  subtitle,
  headerRight,
  children,
  defaultOpen = false,
}: {
  label: string;
  title: string;
  subtitle?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section className="cf-card w-full overflow-hidden">
      <div
        className={`flex w-full flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${
          open ? "border-b border-cf-border" : ""
        }`}
      >
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((current) => !current)}
          className="-mx-1 flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md px-1 text-left"
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-cf-muted transition-transform ${open ? "rotate-180" : ""}`}
          />
          <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="cf-label">{label}</span>
            <h2 className="text-sm font-medium">{title}</h2>
            {subtitle ? <span className="text-xs text-cf-muted">{subtitle}</span> : null}
          </span>
        </button>
        {open && headerRight ? <div className="w-full sm:w-auto sm:max-w-xs sm:shrink-0">{headerRight}</div> : null}
      </div>
      {open ? <div id={contentId}>{children}</div> : null}
    </section>
  );
}
