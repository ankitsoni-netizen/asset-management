"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="h-10 rounded-md bg-cf-primary px-4 text-sm font-medium text-white"
    >
      Print
    </button>
  );
}
