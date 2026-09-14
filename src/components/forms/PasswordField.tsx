"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordField() {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block">
      <span className="cf-label">Password</span>
      <div className="relative mt-2">
        <input
          name="password"
          type={visible ? "text" : "password"}
          required
          autoComplete="current-password"
          className="h-12 w-full rounded-md border border-cf-border bg-white px-3 pr-11 text-cf-text"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute top-1/2 right-0.5 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-cf-muted hover:bg-cf-soft hover:text-cf-text"
        >
          {visible ? <EyeOff className="h-4 w-4" strokeWidth={2} /> : <Eye className="h-4 w-4" strokeWidth={2} />}
        </button>
      </div>
    </label>
  );
}
