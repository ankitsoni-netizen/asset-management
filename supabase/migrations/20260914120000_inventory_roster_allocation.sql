-- Inventory, roster, and mapping are independent.
-- Assets keep the QR/UID already printed on the device. Employees are a roster.
-- Allocation only maps an available asset to an employee. Removal returns the asset to available.

-- ---------------------------------------------------------------------------
-- Employees: optional printed badge / QR code
-- ---------------------------------------------------------------------------

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS code text;

CREATE UNIQUE INDEX IF NOT EXISTS employees_code_idx
  ON public.employees (code)
  WHERE code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.normalize_employee_row()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.email := lower(btrim(NEW.email));
  NEW.name := btrim(NEW.name);
  NEW.department := btrim(NEW.department);
  NEW.position := btrim(NEW.position);
  IF NEW.code IS NOT NULL THEN
    NEW.code := upper(btrim(regexp_replace(NEW.code, '\s+', '', 'g')));
    IF NEW.code = '' THEN
      NEW.code := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Assets: existing printed UID/QR, default into inventory
-- ---------------------------------------------------------------------------

ALTER TABLE public.assets
  DROP CONSTRAINT IF EXISTS assets_uid_format;

ALTER TABLE public.assets
  ALTER COLUMN status SET DEFAULT 'available';

ALTER TABLE public.assets
  DROP CONSTRAINT IF EXISTS assets_uid_not_empty;

ALTER TABLE public.assets
  ADD CONSTRAINT assets_uid_not_empty CHECK (btrim(uid) <> '');

DROP TRIGGER IF EXISTS assets_assign_uid ON public.assets;
DROP FUNCTION IF EXISTS public.assign_asset_uid();
DROP FUNCTION IF EXISTS public.next_asset_uid();
DROP SEQUENCE IF EXISTS public.asset_uid_seq;

CREATE OR REPLACE FUNCTION public.normalize_asset_uid()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.uid := upper(btrim(regexp_replace(coalesce(NEW.uid, ''), '\s+', '', 'g')));
  IF NEW.uid = '' THEN
    RAISE EXCEPTION 'Asset UID from the printed QR code is required.';
  END IF;
  IF char_length(NEW.uid) > 120 THEN
    RAISE EXCEPTION 'Asset UID is too long.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assets_normalize_uid
  BEFORE INSERT OR UPDATE OF uid ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.normalize_asset_uid();

-- ---------------------------------------------------------------------------
-- Inventory photographs live on the asset, not the employee mapping
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.asset_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets (id) ON DELETE CASCADE,
  filename text NOT NULL,
  mime_type text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT asset_images_filename_not_empty CHECK (btrim(filename) <> ''),
  CONSTRAINT asset_images_storage_path_not_empty CHECK (btrim(storage_path) <> ''),
  CONSTRAINT asset_images_mime_type CHECK (
    mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS asset_images_asset_filename_idx
  ON public.asset_images (asset_id, filename);
CREATE UNIQUE INDEX IF NOT EXISTS asset_images_storage_path_idx
  ON public.asset_images (storage_path);
CREATE INDEX IF NOT EXISTS asset_images_asset_id_idx
  ON public.asset_images (asset_id);

ALTER TABLE public.asset_images ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.asset_images FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.asset_images TO authenticated;

DROP POLICY IF EXISTS asset_images_admin_all ON public.asset_images;
CREATE POLICY asset_images_admin_all ON public.asset_images
  FOR ALL TO authenticated
  USING (public.is_cloutflow_admin())
  WITH CHECK (public.is_cloutflow_admin());

-- ---------------------------------------------------------------------------
-- Replace allocate / reallocate with inventory register + mapping
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.allocate_asset(uuid, text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.reallocate_asset(text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.register_asset(
  p_uid text,
  p_asset_type_id uuid,
  p_brand text DEFAULT NULL,
  p_model text DEFAULT NULL,
  p_serial_number text DEFAULT NULL,
  p_notes text DEFAULT NULL
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
    uid, asset_type_id, brand, model, serial_number, notes, status
  )
  VALUES (
    v_uid, v_type.id, p_brand, p_model, p_serial_number, p_notes, 'available'
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

CREATE OR REPLACE FUNCTION public.return_asset(p_uid text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid text := upper(btrim(regexp_replace(coalesce(p_uid, ''), '\s+', '', 'g')));
  v_asset public.assets;
  v_now timestamptz := clock_timestamp();
BEGIN
  PERFORM public.assert_cloutflow_admin();

  SELECT * INTO v_asset
  FROM public.assets
  WHERE uid = v_uid
  FOR UPDATE;

  IF v_asset.id IS NULL THEN
    RAISE EXCEPTION 'No asset was found for this UID.'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.allocations WHERE asset_id = v_asset.id AND is_current
  ) THEN
    RAISE EXCEPTION 'This asset is already available in inventory.';
  END IF;

  UPDATE public.allocations
  SET is_current = false,
      ended_at = v_now,
      action = 'returned'
  WHERE asset_id = v_asset.id
    AND is_current;

  UPDATE public.assets
  SET status = 'available'
  WHERE id = v_asset.id
  RETURNING * INTO v_asset;

  RETURN jsonb_build_object('ok', true, 'asset', to_jsonb(v_asset));
END;
$$;

REVOKE ALL ON FUNCTION public.register_asset(text, uuid, text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.allocate_asset(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.return_asset(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.register_asset(text, uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_asset(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_asset(text) TO authenticated;
