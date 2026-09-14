"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload } from "lucide-react";
import { useProcessing } from "@/components/status/Processing";
import { EMPLOYEE_CSV_FILENAME } from "@/lib/employee-csv";

type FailedRow = {
  row: number;
  email?: string;
  message: string;
};

type Result = {
  created: number;
  failed: FailedRow[];
};

export function EmployeeBulkUpload() {
  const router = useRouter();
  const { run } = useProcessing();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Choose a CSV file to upload.");
      return;
    }
    setSubmitting(true);
    setError("");
    setResult(null);
    try {
      await run("Uploading employees", async () => {
        const formData = new FormData();
        formData.set("file", file);
        const response = await fetch("/api/employees/bulk", { method: "POST", body: formData });
        const data = await response.json();
        const failed = Array.isArray(data.failed) ? data.failed : [];
        setResult({
          created: data.created ?? 0,
          failed,
        });
        if (!response.ok && !(data.created > 0) && !failed.length) {
          throw new Error(data.error || "Unable to upload this sheet.");
        }
        if (data.created > 0) router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload this sheet.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="cf-card p-4 sm:p-6">
        <h2 className="text-lg font-medium">1. Download the sample sheet</h2>
        <p className="mt-1 text-sm text-cf-muted">
          Use this CSV as the template. Keep the header row, then add one employee per line. Employee ID is
          optional. Open it in Excel or Google Sheets and save it again as CSV before uploading.
        </p>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/api/employees/sample";
          }}
          className="cf-action mt-5 border border-cf-border"
        >
          <Download className="h-4 w-4" />
          Download sample CSV
        </button>
        <div className="mt-5 overflow-x-auto rounded-lg bg-cf-soft px-4 py-3 font-mono text-xs text-cf-muted">
          name,email,department,position,employee_id
        </div>
      </section>

      <form onSubmit={onSubmit} className="space-y-6">
        <section className="cf-card p-4 sm:p-6">
          <h2 className="text-lg font-medium">2. Upload the filled sheet</h2>
          <p className="mt-1 text-sm text-cf-muted">
            Official emails must end with @cloutflow.com or @backstage. Existing emails and employee IDs are skipped
            instead of overwriting the roster.
          </p>
          <label className="mt-5 flex min-h-[148px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-cf-border bg-cf-soft px-4 py-10 text-center">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv,application/csv,text/plain,application/vnd.ms-excel"
              className="hidden"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError("");
                setResult(null);
              }}
            />
            <Upload className="h-5 w-5 text-cf-muted" />
            <span className="mt-3 text-sm font-medium">{file ? file.name : "Choose CSV file"}</span>
            <span className="mt-1 text-xs text-cf-muted">{EMPLOYEE_CSV_FILENAME} format</span>
          </label>
        </section>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}

        {result ? (
          <section className="cf-card p-4 sm:p-6">
            <h2 className="text-lg font-medium">Upload result</h2>
            <p className="mt-2 text-sm text-cf-muted">
              {result.created} employee{result.created === 1 ? "" : "s"} added to the roster
              {result.failed.length ? `. ${result.failed.length} row${result.failed.length === 1 ? "" : "s"} could not be added.` : "."}
            </p>
            {result.failed.length ? (
              <>
                <ul className="mt-4 space-y-3 lg:hidden">
                  {result.failed.map((item) => (
                    <li key={`${item.row}-${item.email}-${item.message}`} className="rounded-lg border border-cf-border p-3">
                      <p className="font-mono text-xs text-cf-muted">Row {item.row}</p>
                      <p className="mt-1 break-all text-sm">{item.email || "No email"}</p>
                      <p className="mt-1 text-sm text-cf-muted">{item.message}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 hidden overflow-x-auto lg:block">
                  <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.08em] text-cf-muted">
                    <tr>
                      <th className="py-2 pr-4">Row</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2">Issue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.failed.map((item) => (
                      <tr key={`${item.row}-${item.email}-${item.message}`} className="border-t border-cf-border">
                        <td className="py-2 pr-4 font-mono text-xs">{item.row}</td>
                        <td className="py-2 pr-4">{item.email || "—"}</td>
                        <td className="py-2">{item.message}</td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              </>
            ) : null}
            {result.created > 0 ? (
              <a
                href="/employees"
                className="cf-action mt-5 bg-cf-primary text-white"
              >
                Open roster
              </a>
            ) : null}
          </section>
        ) : null}

        <button
          type="submit"
          disabled={submitting || !file}
          className="cf-action bg-cf-primary text-white hover:bg-cf-primary-dark disabled:opacity-60"
        >
          {submitting ? "Uploading..." : "Upload CSV"}
        </button>
      </form>
    </div>
  );
}
