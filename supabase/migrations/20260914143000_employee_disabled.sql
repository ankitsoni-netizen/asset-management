-- Employees can be disabled without deleting them.
-- Disabled people stay on the roster but cannot receive new allocations.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS disabled boolean NOT NULL DEFAULT false;

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
