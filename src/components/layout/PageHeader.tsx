import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="cf-label">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight break-words sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-cf-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">{actions}</div> : null}
    </div>
  );
}
