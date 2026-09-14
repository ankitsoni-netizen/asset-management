import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { parseEmployeeCsv } from "@/lib/employee-csv";
import { createEmployeesBulk } from "@/lib/queries";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) {
    return NextResponse.json({ error: "Choose a CSV file to upload." }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  if (name && !name.endsWith(".csv") && file.type && !/csv|excel|plain|octet-stream/i.test(file.type)) {
    return NextResponse.json({ error: "Upload a CSV file. Download the sample sheet if you need the format." }, { status: 400 });
  }

  const text = await file.text();
  const parsed = parseEmployeeCsv(text);
  if (!parsed.rows.length) {
    return NextResponse.json(
      {
        error: parsed.errors[0]?.message || "No valid employee rows were found.",
        errors: parsed.errors,
        created: 0,
        failed: parsed.errors,
      },
      { status: 400 },
    );
  }

  const result = await createEmployeesBulk(admin.supabase, parsed.rows);
  const failed = [
    ...parsed.errors.map((item) => ({ row: item.row, email: "", message: item.message })),
    ...result.failed,
  ].sort((a, b) => a.row - b.row);

  return NextResponse.json({
    created: result.created.length,
    failed,
    employees: result.created.map((employee) => ({
      id: employee.id,
      name: employee.name,
      email: employee.email,
    })),
  });
}
