import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { allocateParking } from "@/lib/queries";
import { parkingAllocationErrorMessage, parseParkingAllocationBody, parkingSpotLabel } from "@/lib/parking";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = parseParkingAllocationBody(await request.json());
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  let result: Awaited<ReturnType<typeof allocateParking>>;
  try {
    result = await allocateParking(admin.supabase, parsed.data);
  } catch (error) {
    const message = parkingAllocationErrorMessage(error);
    const status = /not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({
    parkingSpotId: result.parkingSpot.id,
    allocationId: result.allocation.id,
    parkingLabel: parkingSpotLabel(result.parkingSpot.parking_type, result.parkingSpot.slot_number),
    employeeName: result.allocation.employee_name,
    vehicleNumbers: result.allocation.vehicle_numbers,
  });
}
