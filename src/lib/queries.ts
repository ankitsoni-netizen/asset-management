import { ASSET_STATUS } from "./constants";
import { createServerSupabaseClient } from "./supabase/server";
import type { Database } from "@/types/database";
import {
  asRow,
  mapAllocationWithAsset,
  mapAsset,
  mapAssetType,
  mapEmployee,
  one,
} from "./mappers";
import type {
  AllocationWithAsset,
  AssetRecord,
  AssetTypeRecord,
  EmployeeRecord,
} from "./models";

type Client = Awaited<ReturnType<typeof createServerSupabaseClient>>;
type AssetRow = Database["public"]["Tables"]["assets"]["Row"];
type AssetTypeRow = Database["public"]["Tables"]["asset_types"]["Row"];
type AllocationRow = Database["public"]["Tables"]["allocations"]["Row"];
type ImageRow = Database["public"]["Tables"]["allocation_images"]["Row"];
type AssetImageRow = Database["public"]["Tables"]["asset_images"]["Row"];
type EmployeeRow = Database["public"]["Tables"]["employees"]["Row"];

const ALLOCATION_SELECT = `
  *,
  assets!inner (
    *,
    asset_types (*)
  ),
  allocation_images (*)
`;

const ASSET_SELECT = `
  *,
  asset_types (*)
`;

function throwIfError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

function mapJoinedAllocation(row: {
  assets: AssetRow | AssetRow[] | null;
  asset_types?: AssetTypeRow | AssetTypeRow[] | null;
  allocation_images: ImageRow | ImageRow[] | null;
} & AllocationRow): AllocationWithAsset {
  const asset = one(row.assets);
  if (!asset) {
    throw new Error("Allocation is missing its asset.");
  }
  const assetType = one(
    (asset as AssetRow & { asset_types?: AssetTypeRow | AssetTypeRow[] | null }).asset_types,
  );
  if (!assetType) {
    throw new Error("Asset is missing its type.");
  }
  return mapAllocationWithAsset(row, row.allocation_images, asset, assetType);
}

function mapJoinedAsset(
  row: {
    asset_types: AssetTypeRow | AssetTypeRow[] | null;
  } & AssetRow,
  images: AssetImageRow[] = [],
): AssetRecord {
  const assetType = one(row.asset_types);
  if (!assetType) {
    throw new Error("Asset is missing its type.");
  }
  return mapAsset(row, assetType, images);
}

export async function listAssetTypes(): Promise<AssetTypeRecord[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("asset_types")
    .select("*")
    .order("is_custom", { ascending: true })
    .order("name", { ascending: true });
  throwIfError(error);
  return (data ?? []).map(mapAssetType);
}

export async function listAssets(filters: {
  q?: string;
  status?: string;
  assetTypeId?: string;
} = {}): Promise<AssetRecord[]> {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("assets").select(ASSET_SELECT);

  if (filters.status === ASSET_STATUS.allocated || filters.status === ASSET_STATUS.available) {
    query = query.eq("status", filters.status);
  }
  if (filters.assetTypeId) {
    query = query.eq("asset_type_id", filters.assetTypeId);
  }

  const search = filters.q?.trim();
  if (search) {
    const safe = search.replace(/[%_,()]/g, " ").slice(0, 80);
    if (safe) {
      query = query.or(
        `uid.ilike.%${safe}%,brand.ilike.%${safe}%,model.ilike.%${safe}%,serial_number.ilike.%${safe}%`,
      );
    }
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(500);
  throwIfError(error);
  return (data ?? []).map((row) => mapJoinedAsset(row as never));
}

export async function listAssetUids(): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("assets").select("uid").limit(5000);
  throwIfError(error);
  return (data ?? []).map((row) => row.uid);
}

export async function listAvailableAssets(): Promise<AssetRecord[]> {
  return listAssets({ status: ASSET_STATUS.available });
}

export async function listEmployees(
  filters: { q?: string; department?: string; disabled?: boolean } = {},
): Promise<EmployeeRecord[]> {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("employees").select("*");

  if (filters.department) {
    query = query.eq("department", filters.department);
  }

  if (filters.disabled === true || filters.disabled === false) {
    query = query.eq("disabled", filters.disabled);
  }

  const search = filters.q?.trim();
  if (search) {
    const safe = search.replace(/[%_,()]/g, " ").slice(0, 80);
    if (safe) {
      query = query.or(
        `name.ilike.%${safe}%,email.ilike.%${safe}%,position.ilike.%${safe}%,code.ilike.%${safe}%`,
      );
    }
  }

  const { data, error } = await query.order("name", { ascending: true }).limit(500);
  throwIfError(error);
  return (data ?? []).map(mapEmployee);
}

export async function getEmployeeById(id: string): Promise<EmployeeRecord | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("employees").select("*").eq("id", id).maybeSingle();
  throwIfError(error);
  return data ? mapEmployee(data) : null;
}

export async function findEmployeeByCodeOrEmail(value: string): Promise<EmployeeRecord | null> {
  const supabase = await createServerSupabaseClient();
  const trimmed = value.trim();
  if (!trimmed) return null;

  const email = trimmed.toLowerCase();
  const code = trimmed.toUpperCase().replace(/\s+/g, "");

  const { data: byEmail, error: emailError } = await supabase
    .from("employees")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  throwIfError(emailError);
  if (byEmail) return mapEmployee(byEmail);

  const { data: byCode, error: codeError } = await supabase
    .from("employees")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  throwIfError(codeError);
  return byCode ? mapEmployee(byCode) : null;
}

export async function getAssetByUid(uid: string): Promise<AssetRecord | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("assets").select(ASSET_SELECT).eq("uid", uid).maybeSingle();
  throwIfError(error);
  if (!data) return null;

  const { data: images, error: imageError } = await supabase
    .from("asset_images")
    .select("*")
    .eq("asset_id", data.id)
    .order("created_at", { ascending: true });
  throwIfError(imageError);

  return mapJoinedAsset(data as never, images ?? []);
}

export async function getDashboardStats() {
  const supabase = await createServerSupabaseClient();
  const [totalAssets, allocated, available, totalEmployees, currentAllocations] = await Promise.all([
    supabase.from("assets").select("id", { count: "exact", head: true }),
    supabase.from("assets").select("id", { count: "exact", head: true }).eq("status", ASSET_STATUS.allocated),
    supabase.from("assets").select("id", { count: "exact", head: true }).eq("status", ASSET_STATUS.available),
    supabase.from("employees").select("id", { count: "exact", head: true }),
    supabase.from("allocations").select("id", { count: "exact", head: true }).eq("is_current", true),
  ]);

  throwIfError(totalAssets.error);
  throwIfError(allocated.error);
  throwIfError(available.error);
  throwIfError(totalEmployees.error);
  throwIfError(currentAllocations.error);

  return {
    totalAssets: totalAssets.count ?? 0,
    allocated: allocated.count ?? 0,
    available: available.count ?? 0,
    totalEmployees: totalEmployees.count ?? 0,
    currentAllocations: currentAllocations.count ?? 0,
  };
}

function matchesQuery(row: AllocationWithAsset, q: string) {
  const needle = q.trim().toLowerCase();
  const uidNeedle = q.trim().toUpperCase();
  return (
    row.employeeName.toLowerCase().includes(needle) ||
    row.employeeEmail.toLowerCase().includes(needle) ||
    row.position.toLowerCase().includes(needle) ||
    row.department.toLowerCase().includes(needle) ||
    row.asset.uid.includes(uidNeedle) ||
    row.asset.assetType.name.toLowerCase().includes(needle) ||
    (row.asset.serialNumber ?? "").toLowerCase().includes(needle)
  );
}

export async function getAllocationLogs(filters: {
  q?: string;
  status?: string;
  assetTypeId?: string;
  department?: string;
  from?: string;
  to?: string;
}): Promise<AllocationWithAsset[]> {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("allocations").select(ALLOCATION_SELECT);

  if (filters.status === "allocated") {
    query = query.eq("is_current", true).eq("assets.status", ASSET_STATUS.allocated);
  } else if (filters.status === "available") {
    query = query.eq("assets.status", ASSET_STATUS.available);
  } else if (filters.status === "historical") {
    query = query.eq("is_current", false);
  }

  if (filters.assetTypeId) {
    query = query.eq("assets.asset_type_id", filters.assetTypeId);
  }

  if (filters.department) {
    query = query.eq("department", filters.department);
  }

  if (filters.from) {
    query = query.gte("allocated_at", new Date(`${filters.from}T00:00:00`).toISOString());
  }

  if (filters.to) {
    query = query.lte("allocated_at", new Date(`${filters.to}T23:59:59`).toISOString());
  }

  const search = filters.q?.trim();
  if (search) {
    const safe = search.replace(/[%_,()]/g, " ").slice(0, 80);
    if (safe) {
      query = query.or(
        `employee_name.ilike.%${safe}%,employee_email.ilike.%${safe}%,department.ilike.%${safe}%,position.ilike.%${safe}%`,
      );
    }
  }

  const { data, error } = await query.order("allocated_at", { ascending: false }).limit(300);
  throwIfError(error);

  const rows = (data ?? []).map((row) => mapJoinedAllocation(row as never));
  if (!filters.q?.trim()) return rows;
  return rows.filter((row) => matchesQuery(row, filters.q!));
}

export async function getFilterOptions() {
  const supabase = await createServerSupabaseClient();
  const [typesResult, departmentsResult] = await Promise.all([
    supabase.from("asset_types").select("*").order("name", { ascending: true }),
    supabase.from("employees").select("department").order("department", { ascending: true }),
  ]);

  throwIfError(typesResult.error);
  throwIfError(departmentsResult.error);

  const departments = [
    ...new Set((departmentsResult.data ?? []).map((item) => item.department).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));

  return {
    types: (typesResult.data ?? []).map(mapAssetType),
    departments,
  };
}

export async function findAssetTypeById(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("asset_types").select("*").eq("id", id).maybeSingle();
  throwIfError(error);
  return data ? mapAssetType(data) : null;
}

export async function findOrCreateAssetType(name: string): Promise<{
  type: AssetTypeRecord;
  created: boolean;
}> {
  const supabase = await createServerSupabaseClient();
  const normalized = name.replace(/\s+/g, " ").trim();
  const { data: existing, error: existingError } = await supabase
    .from("asset_types")
    .select("*")
    .ilike("name", normalized)
    .maybeSingle();
  throwIfError(existingError);
  if (existing) return { type: mapAssetType(existing), created: false };

  const { data, error } = await supabase
    .from("asset_types")
    .insert({ name: normalized, is_custom: true })
    .select("*")
    .single();

  if (error) {
    const { data: conflict, error: conflictError } = await supabase
      .from("asset_types")
      .select("*")
      .ilike("name", normalized)
      .maybeSingle();
    throwIfError(conflictError);
    if (conflict) return { type: mapAssetType(conflict), created: false };
    throw new Error(error.message);
  }

  return { type: mapAssetType(data), created: true };
}

export async function registerAsset(
  supabase: Client,
  input: {
    uid: string;
    assetTypeId: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    notes?: string;
  },
) {
  const { data, error } = await supabase.rpc("register_asset", {
    p_uid: input.uid,
    p_asset_type_id: input.assetTypeId,
    p_brand: input.brand ?? null,
    p_model: input.model ?? null,
    p_serial_number: input.serialNumber ?? null,
    p_notes: input.notes ?? null,
  });
  throwIfError(error);
  const payload = asRow<{
    asset: AssetRow;
    assetType: AssetTypeRow;
  }>(data);
  return {
    asset: payload.asset,
    assetType: payload.assetType,
  };
}

export async function createEmployee(
  supabase: Client,
  input: {
    name: string;
    email: string;
    department: string;
    position: string;
    code?: string;
  },
) {
  const { data, error } = await supabase
    .from("employees")
    .insert({
      name: input.name,
      email: input.email,
      department: input.department,
      position: input.position,
      code: input.code || null,
    })
    .select("*")
    .single();

  if (error) {
    if (/employees_email_key|employees_email_lower|duplicate key/i.test(error.message)) {
      throw new Error("An employee with this email is already on the roster.");
    }
    if (/employees_code_idx|duplicate key/i.test(error.message)) {
      throw new Error("An employee with this employee ID is already on the roster.");
    }
    throw new Error(error.message);
  }

  return mapEmployee(data as EmployeeRow);
}

export async function setEmployeeDisabled(
  supabase: Client,
  id: string,
  disabled: boolean,
) {
  const { data, error } = await supabase
    .from("employees")
    .update({ disabled })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Employee was not found.");
  }
  return mapEmployee(data as EmployeeRow);
}

export async function createEmployeesBulk(
  supabase: Client,
  inputs: Array<{
    name: string;
    email: string;
    department: string;
    position: string;
    code?: string;
    row: number;
  }>,
) {
  const created: Awaited<ReturnType<typeof createEmployee>>[] = [];
  const failed: Array<{ row: number; email: string; message: string }> = [];

  for (const input of inputs) {
    try {
      created.push(
        await createEmployee(supabase, {
          name: input.name,
          email: input.email,
          department: input.department,
          position: input.position,
          code: input.code,
        }),
      );
    } catch (error) {
      failed.push({
        row: input.row,
        email: input.email,
        message: error instanceof Error ? error.message : "Unable to save this employee.",
      });
    }
  }

  return { created, failed };
}

export async function allocateAsset(
  supabase: Client,
  input: {
    uid: string;
    employeeId: string;
  },
) {
  const { data, error } = await supabase.rpc("allocate_asset", {
    p_uid: input.uid,
    p_employee_id: input.employeeId,
  });
  throwIfError(error);
  const payload = asRow<{
    asset: AssetRow;
    allocation: AllocationRow;
    assetType: AssetTypeRow;
  }>(data);
  return {
    asset: payload.asset,
    allocation: payload.allocation,
    assetType: payload.assetType,
  };
}

export async function returnAsset(supabase: Client, uid: string) {
  const { error } = await supabase.rpc("return_asset", { p_uid: uid });
  throwIfError(error);
}
