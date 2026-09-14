import { redirect } from "next/navigation";

export default function LegacyAllocatePage() {
  redirect("/allocations/new");
}
