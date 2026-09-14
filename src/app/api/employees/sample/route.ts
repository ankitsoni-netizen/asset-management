import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { EMPLOYEE_CSV_FILENAME, EMPLOYEE_CSV_SAMPLE } from "@/lib/employee-csv";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return new NextResponse(`\uFEFF${EMPLOYEE_CSV_SAMPLE}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${EMPLOYEE_CSV_FILENAME}"`,
      "Cache-Control": "no-store",
    },
  });
}
