"use client";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="cf-action bg-cf-primary text-white hover:bg-cf-primary-dark"
    >
      {label}
    </button>
  );
}
