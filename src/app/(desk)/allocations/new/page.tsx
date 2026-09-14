import { AllocationMapForm } from "@/components/allocate/AllocationMapForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { getDashboardStats, listAvailableAssets, listEmployees } from "@/lib/queries";

export default async function NewAllocationPage() {
  const [assets, employees, stats] = await Promise.all([
    listAvailableAssets(),
    listEmployees(),
    getDashboardStats(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Mapping"
        title="New allocation"
        description="Match an available inventory asset to an employee. This does not create a UID, and it does not reallocate a device that is already attached to someone."
      />
      <AllocationMapForm
        assets={assets.map((asset) => ({
          id: asset.id,
          uid: asset.uid,
          status: asset.status,
          brand: asset.brand,
          model: asset.model,
          serialNumber: asset.serialNumber,
          assetType: asset.assetType,
        }))}
        employees={employees.map((employee) => ({
          id: employee.id,
          name: employee.name,
          email: employee.email,
          department: employee.department,
          position: employee.position,
          code: employee.code,
        }))}
        availableCount={stats.available}
        allocatedCount={stats.allocated}
      />
    </>
  );
}
