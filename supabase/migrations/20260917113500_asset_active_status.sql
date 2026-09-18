-- Inventory assets can be marked inactive without deleting them.
-- Inactive devices stay in the catalog but cannot be allocated.

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS assets_active_idx ON public.assets (active);

DROP FUNCTION IF EXISTS public.register_asset(text, uuid, text, text, text, text);

CREATE OR REPLACE FUNCTION public.register_asset(
  p_uid text,
  p_asset_type_id uuid,
  p_brand text DEFAULT NULL,
  p_model text DEFAULT NULL,
  p_serial_number text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_active boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type public.asset_types;
  v_asset public.assets;
  v_uid text;
BEGIN
  PERFORM public.assert_cloutflow_admin();

  v_uid := upper(btrim(regexp_replace(coalesce(p_uid, ''), '\s+', '', 'g')));
  IF v_uid = '' THEN
    RAISE EXCEPTION 'Asset UID from the printed QR code is required.';
  END IF;

  SELECT * INTO v_type
  FROM public.asset_types
  WHERE id = p_asset_type_id;

  IF v_type.id IS NULL THEN
    RAISE EXCEPTION 'Selected asset type was not found.'
      USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (SELECT 1 FROM public.assets WHERE uid = v_uid) THEN
    RAISE EXCEPTION 'This QR code / UID is already in inventory.';
  END IF;

  INSERT INTO public.assets (
    uid, asset_type_id, brand, model, serial_number, notes, status, active
  )
  VALUES (
    v_uid, v_type.id, p_brand, p_model, p_serial_number, p_notes, 'available', coalesce(p_active, true)
  )
  RETURNING * INTO v_asset;

  RETURN jsonb_build_object(
    'asset', to_jsonb(v_asset),
    'assetType', to_jsonb(v_type)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.allocate_asset(
  p_uid text,
  p_employee_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid text := upper(btrim(regexp_replace(coalesce(p_uid, ''), '\s+', '', 'g')));
  v_asset public.assets;
  v_type public.asset_types;
  v_employee public.employees;
  v_allocation public.allocations;
BEGIN
  PERFORM public.assert_cloutflow_admin();

  SELECT * INTO v_asset
  FROM public.assets
  WHERE uid = v_uid
  FOR UPDATE;

  IF v_asset.id IS NULL THEN
    RAISE EXCEPTION 'No asset was found for this UID. Add it to inventory first.'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT v_asset.active THEN
    RAISE EXCEPTION 'This asset is inactive and cannot be allocated.';
  END IF;

  IF v_asset.status = 'allocated' OR EXISTS (
    SELECT 1 FROM public.allocations WHERE asset_id = v_asset.id AND is_current
  ) THEN
    RAISE EXCEPTION 'This asset is currently allocated. Remove it from the employee first.';
  END IF;

  SELECT * INTO v_employee
  FROM public.employees
  WHERE id = p_employee_id;

  IF v_employee.id IS NULL THEN
    RAISE EXCEPTION 'Selected employee was not found. Add them to the roster first.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_employee.disabled THEN
    RAISE EXCEPTION 'This employee is disabled and cannot receive assets.';
  END IF;

  SELECT * INTO v_type
  FROM public.asset_types
  WHERE id = v_asset.asset_type_id;

  INSERT INTO public.allocations (
    asset_id,
    employee_id,
    employee_name,
    department,
    position,
    employee_email,
    action,
    is_current
  )
  VALUES (
    v_asset.id,
    v_employee.id,
    v_employee.name,
    v_employee.department,
    v_employee.position,
    v_employee.email,
    'allocated',
    true
  )
  RETURNING * INTO v_allocation;

  UPDATE public.assets
  SET status = 'allocated'
  WHERE id = v_asset.id
  RETURNING * INTO v_asset;

  RETURN jsonb_build_object(
    'asset', to_jsonb(v_asset),
    'allocation', to_jsonb(v_allocation),
    'employee', to_jsonb(v_employee),
    'assetType', to_jsonb(v_type)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_asset(text, uuid, text, text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_asset(text, uuid, text, text, text, text, boolean) TO authenticated;
