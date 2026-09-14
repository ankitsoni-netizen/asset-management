-- Cloutflow Asset Desk — production schema
-- Field names match the existing application (camelCase in TS, snake_case in Postgres).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE public.asset_status AS ENUM ('allocated', 'available');
CREATE TYPE public.allocation_action AS ENUM ('allocated', 'reallocated', 'returned');
CREATE TYPE public.audit_event AS ENUM (
  'asset_type_created',
  'asset_created',
  'employee_upserted',
  'allocated',
  'reallocated',
  'returned'
);

-- ---------------------------------------------------------------------------
-- Updated-at helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Admin gate (normalized email must be admin@cloutflow.com)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_cloutflow_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(lower(btrim(auth.jwt() ->> 'email')), '') = 'admin@cloutflow.com';
$$;

REVOKE ALL ON FUNCTION public.is_cloutflow_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_cloutflow_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.assert_cloutflow_admin()
RETURNS void
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF NOT public.is_cloutflow_admin() THEN
    RAISE EXCEPTION 'Unauthorized'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_cloutflow_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_cloutflow_admin() TO authenticated;

-- ---------------------------------------------------------------------------
-- Permanent UID: CF-AST-XXXXXX
-- ---------------------------------------------------------------------------

CREATE SEQUENCE public.asset_uid_seq AS bigint START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.next_asset_uid()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  n bigint;
BEGIN
  n := nextval('public.asset_uid_seq');
  IF n < 1 OR n > 999999 THEN
    RAISE EXCEPTION 'Asset UID space exhausted';
  END IF;
  RETURN 'CF-AST-' || lpad(n::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_asset_uid()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.uid IS NULL OR btrim(NEW.uid) = '' THEN
    NEW.uid := public.next_asset_uid();
  END IF;
  NEW.uid := upper(btrim(NEW.uid));
  IF NEW.uid !~ '^CF-AST-[0-9]{6}$' THEN
    RAISE EXCEPTION 'Asset UID must match CF-AST-XXXXXX';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.freeze_asset_uid()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.uid IS DISTINCT FROM OLD.uid THEN
    RAISE EXCEPTION 'Asset UID is permanent and cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.asset_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_custom boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT asset_types_name_not_empty CHECK (btrim(name) <> '')
);

CREATE UNIQUE INDEX asset_types_name_lower_idx
  ON public.asset_types (lower(btrim(name)));
ALTER TABLE public.asset_types
  ADD CONSTRAINT asset_types_name_key UNIQUE (name);

CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  department text NOT NULL,
  position text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employees_name_not_empty CHECK (btrim(name) <> ''),
  CONSTRAINT employees_department_not_empty CHECK (btrim(department) <> ''),
  CONSTRAINT employees_position_not_empty CHECK (btrim(position) <> ''),
  CONSTRAINT employees_official_email CHECK (
    email ~* '^[^[:space:]@]+@(cloutflow\.com|backstage\.[a-z0-9.-]+)$'
  )
);

CREATE UNIQUE INDEX employees_email_lower_idx
  ON public.employees (lower(btrim(email)));

CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uid text NOT NULL,
  asset_type_id uuid NOT NULL REFERENCES public.asset_types (id) ON DELETE RESTRICT,
  brand text,
  model text,
  serial_number text,
  notes text,
  status public.asset_status NOT NULL DEFAULT 'allocated',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assets_uid_format CHECK (uid ~ '^CF-AST-[0-9]{6}$')
);

CREATE UNIQUE INDEX assets_uid_idx ON public.assets (uid);
CREATE INDEX assets_asset_type_id_idx ON public.assets (asset_type_id);
CREATE INDEX assets_status_idx ON public.assets (status);
CREATE INDEX assets_created_at_idx ON public.assets (created_at DESC);

CREATE TABLE public.allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets (id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES public.employees (id) ON DELETE RESTRICT,
  employee_name text NOT NULL,
  department text NOT NULL,
  position text NOT NULL,
  employee_email text NOT NULL,
  action public.allocation_action NOT NULL DEFAULT 'allocated',
  allocated_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  is_current boolean NOT NULL DEFAULT true,
  confirmation_note text,
  email_sent boolean NOT NULL DEFAULT false,
  email_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT allocations_employee_name_not_empty CHECK (btrim(employee_name) <> ''),
  CONSTRAINT allocations_department_not_empty CHECK (btrim(department) <> ''),
  CONSTRAINT allocations_position_not_empty CHECK (btrim(position) <> ''),
  CONSTRAINT allocations_official_email CHECK (
    employee_email ~* '^[^[:space:]@]+@(cloutflow\.com|backstage\.[a-z0-9.-]+)$'
  ),
  CONSTRAINT allocations_current_has_no_ended_at CHECK (NOT is_current OR ended_at IS NULL),
  CONSTRAINT allocations_ended_at_not_before_start CHECK (ended_at IS NULL OR ended_at >= allocated_at)
);

CREATE INDEX allocations_asset_id_idx ON public.allocations (asset_id);
CREATE INDEX allocations_employee_id_idx ON public.allocations (employee_id);
CREATE INDEX allocations_employee_email_idx ON public.allocations (lower(employee_email));
CREATE INDEX allocations_department_idx ON public.allocations (department);
CREATE INDEX allocations_allocated_at_idx ON public.allocations (allocated_at DESC);
CREATE INDEX allocations_action_idx ON public.allocations (action);

-- At most one active allocation per asset.
CREATE UNIQUE INDEX allocations_one_current_per_asset_idx
  ON public.allocations (asset_id)
  WHERE is_current;

CREATE TABLE public.allocation_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id uuid NOT NULL REFERENCES public.allocations (id) ON DELETE CASCADE,
  filename text NOT NULL,
  mime_type text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT allocation_images_filename_not_empty CHECK (btrim(filename) <> ''),
  CONSTRAINT allocation_images_storage_path_not_empty CHECK (btrim(storage_path) <> ''),
  CONSTRAINT allocation_images_mime_type CHECK (
    mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif')
  )
);

CREATE UNIQUE INDEX allocation_images_allocation_filename_idx
  ON public.allocation_images (allocation_id, filename);
CREATE UNIQUE INDEX allocation_images_storage_path_idx
  ON public.allocation_images (storage_path);
CREATE INDEX allocation_images_allocation_id_idx
  ON public.allocation_images (allocation_id);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action public.audit_event NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  asset_id uuid REFERENCES public.assets (id) ON DELETE RESTRICT,
  allocation_id uuid REFERENCES public.allocations (id) ON DELETE RESTRICT,
  employee_id uuid REFERENCES public.employees (id) ON DELETE RESTRICT,
  actor_email text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX audit_logs_asset_id_idx ON public.audit_logs (asset_id);
CREATE INDEX audit_logs_allocation_id_idx ON public.audit_logs (allocation_id);
CREATE INDEX audit_logs_employee_id_idx ON public.audit_logs (employee_id);
CREATE INDEX audit_logs_action_idx ON public.audit_logs (action);

-- ---------------------------------------------------------------------------
-- Triggers: timestamps, UID, immutability
-- ---------------------------------------------------------------------------

CREATE TRIGGER asset_types_set_updated_at
  BEFORE UPDATE ON public.asset_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER employees_set_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER assets_set_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER allocations_set_updated_at
  BEFORE UPDATE ON public.allocations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER assets_assign_uid
  BEFORE INSERT ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.assign_asset_uid();

CREATE TRIGGER assets_freeze_uid
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.freeze_asset_uid();

CREATE OR REPLACE FUNCTION public.reject_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable';
END;
$$;

CREATE TRIGGER audit_logs_no_update
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.reject_audit_log_mutation();

CREATE TRIGGER audit_logs_no_delete
  BEFORE DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.reject_audit_log_mutation();

CREATE OR REPLACE FUNCTION public.normalize_employee_row()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.email := lower(btrim(NEW.email));
  NEW.name := btrim(NEW.name);
  NEW.department := btrim(NEW.department);
  NEW.position := btrim(NEW.position);
  RETURN NEW;
END;
$$;

CREATE TRIGGER employees_normalize
  BEFORE INSERT OR UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.normalize_employee_row();

CREATE OR REPLACE FUNCTION public.normalize_asset_type_row()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.name := btrim(regexp_replace(NEW.name, '\s+', ' ', 'g'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER asset_types_normalize
  BEFORE INSERT OR UPDATE ON public.asset_types
  FOR EACH ROW EXECUTE FUNCTION public.normalize_asset_type_row();

CREATE OR REPLACE FUNCTION public.blank_to_null()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'assets' THEN
    IF NEW.brand IS NOT NULL AND btrim(NEW.brand) = '' THEN NEW.brand := NULL; END IF;
    IF NEW.model IS NOT NULL AND btrim(NEW.model) = '' THEN NEW.model := NULL; END IF;
    IF NEW.serial_number IS NOT NULL AND btrim(NEW.serial_number) = '' THEN NEW.serial_number := NULL; END IF;
    IF NEW.notes IS NOT NULL AND btrim(NEW.notes) = '' THEN NEW.notes := NULL; END IF;
  ELSIF TG_TABLE_NAME = 'allocations' THEN
    IF NEW.confirmation_note IS NOT NULL AND btrim(NEW.confirmation_note) = '' THEN
      NEW.confirmation_note := NULL;
    END IF;
    IF NEW.email_error IS NOT NULL AND btrim(NEW.email_error) = '' THEN
      NEW.email_error := NULL;
    END IF;
    NEW.employee_email := lower(btrim(NEW.employee_email));
    NEW.employee_name := btrim(NEW.employee_name);
    NEW.department := btrim(NEW.department);
    NEW.position := btrim(NEW.position);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assets_blank_to_null
  BEFORE INSERT OR UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.blank_to_null();

CREATE TRIGGER allocations_blank_to_null
  BEFORE INSERT OR UPDATE ON public.allocations
  FOR EACH ROW EXECUTE FUNCTION public.blank_to_null();

-- ---------------------------------------------------------------------------
-- Immutable audit writers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_actor_email()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(lower(btrim(auth.jwt() ->> 'email')), 'unknown');
$$;

CREATE OR REPLACE FUNCTION public.write_asset_type_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (action, entity_type, entity_id, actor_email, payload)
  VALUES (
    'asset_type_created',
    'asset_type',
    NEW.id,
    public.current_actor_email(),
    jsonb_build_object('id', NEW.id, 'name', NEW.name, 'isCustom', NEW.is_custom)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER asset_types_audit_insert
  AFTER INSERT ON public.asset_types
  FOR EACH ROW EXECUTE FUNCTION public.write_asset_type_audit();

CREATE OR REPLACE FUNCTION public.write_asset_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (action, entity_type, entity_id, asset_id, actor_email, payload)
  VALUES (
    'asset_created',
    'asset',
    NEW.id,
    NEW.id,
    public.current_actor_email(),
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER assets_audit_insert
  AFTER INSERT ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.write_asset_audit();

CREATE OR REPLACE FUNCTION public.write_employee_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (action, entity_type, entity_id, employee_id, actor_email, payload)
  VALUES (
    'employee_upserted',
    'employee',
    NEW.id,
    NEW.id,
    public.current_actor_email(),
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER employees_audit_insert
  AFTER INSERT ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.write_employee_audit();

CREATE TRIGGER employees_audit_update
  AFTER UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.write_employee_audit();

CREATE OR REPLACE FUNCTION public.write_allocation_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      action, entity_type, entity_id, asset_id, allocation_id, employee_id, actor_email, payload
    )
    VALUES (
      CASE NEW.action
        WHEN 'reallocated' THEN 'reallocated'::public.audit_event
        WHEN 'returned' THEN 'returned'::public.audit_event
        ELSE 'allocated'::public.audit_event
      END,
      'allocation',
      NEW.id,
      NEW.asset_id,
      NEW.id,
      NEW.employee_id,
      public.current_actor_email(),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE'
    AND NEW.action = 'returned'
    AND OLD.action IS DISTINCT FROM NEW.action THEN
    INSERT INTO public.audit_logs (
      action, entity_type, entity_id, asset_id, allocation_id, employee_id, actor_email, payload
    )
    VALUES (
      'returned',
      'allocation',
      NEW.id,
      NEW.asset_id,
      NEW.id,
      NEW.employee_id,
      public.current_actor_email(),
      to_jsonb(NEW)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER allocations_audit_insert
  AFTER INSERT ON public.allocations
  FOR EACH ROW EXECUTE FUNCTION public.write_allocation_audit();

CREATE TRIGGER allocations_audit_update
  AFTER UPDATE ON public.allocations
  FOR EACH ROW EXECUTE FUNCTION public.write_allocation_audit();

-- ---------------------------------------------------------------------------
-- Employee upsert used by allocation RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.upsert_employee(
  p_name text,
  p_email text,
  p_department text,
  p_position text
)
RETURNS public.employees
LANGUAGE plpgsql
AS $$
DECLARE
  v_row public.employees;
  v_email text := lower(btrim(p_email));
BEGIN
  INSERT INTO public.employees (name, email, department, position)
  VALUES (btrim(p_name), v_email, btrim(p_department), btrim(p_position))
  ON CONFLICT (email) DO UPDATE
    SET name = EXCLUDED.name,
        department = EXCLUDED.department,
        position = EXCLUDED.position
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- Unique constraint name for ON CONFLICT (email) — index is on lower(btrim(email)),
-- so add a matching unique constraint on the stored (already normalized) email column.
ALTER TABLE public.employees
  ADD CONSTRAINT employees_email_key UNIQUE (email);

-- ---------------------------------------------------------------------------
-- Transaction-safe allocation / reallocation / return
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.allocate_asset(
  p_asset_type_id uuid,
  p_employee_name text,
  p_department text,
  p_position text,
  p_employee_email text,
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
  v_employee public.employees;
  v_asset public.assets;
  v_allocation public.allocations;
BEGIN
  PERFORM public.assert_cloutflow_admin();

  SELECT * INTO v_type
  FROM public.asset_types
  WHERE id = p_asset_type_id;

  IF v_type.id IS NULL THEN
    RAISE EXCEPTION 'Selected asset type was not found.'
      USING ERRCODE = 'P0002';
  END IF;

  v_employee := public.upsert_employee(
    p_employee_name,
    p_employee_email,
    p_department,
    p_position
  );

  INSERT INTO public.assets (
    asset_type_id, brand, model, serial_number, notes, status
  )
  VALUES (
    v_type.id, p_brand, p_model, p_serial_number, p_notes, 'allocated'
  )
  RETURNING * INTO v_asset;

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

  RETURN jsonb_build_object(
    'asset', to_jsonb(v_asset),
    'allocation', to_jsonb(v_allocation),
    'employee', to_jsonb(v_employee),
    'assetType', to_jsonb(v_type)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reallocate_asset(
  p_uid text,
  p_employee_name text,
  p_department text,
  p_position text,
  p_employee_email text,
  p_confirmation_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid text := upper(btrim(p_uid));
  v_asset public.assets;
  v_type public.asset_types;
  v_employee public.employees;
  v_allocation public.allocations;
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

  SELECT * INTO v_type
  FROM public.asset_types
  WHERE id = v_asset.asset_type_id;

  v_employee := public.upsert_employee(
    p_employee_name,
    p_employee_email,
    p_department,
    p_position
  );

  UPDATE public.allocations
  SET is_current = false,
      ended_at = v_now
  WHERE asset_id = v_asset.id
    AND is_current;

  INSERT INTO public.allocations (
    asset_id,
    employee_id,
    employee_name,
    department,
    position,
    employee_email,
    action,
    is_current,
    confirmation_note
  )
  VALUES (
    v_asset.id,
    v_employee.id,
    v_employee.name,
    v_employee.department,
    v_employee.position,
    v_employee.email,
    'reallocated',
    true,
    p_confirmation_note
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
  v_uid text := upper(btrim(p_uid));
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

REVOKE ALL ON FUNCTION public.next_asset_uid() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_employee(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.allocate_asset(uuid, text, text, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reallocate_asset(text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.return_asset(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.allocate_asset(uuid, text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reallocate_asset(text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_asset(text) TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.asset_uid_seq TO authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.asset_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocation_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.asset_types FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.employees FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.assets FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.allocations FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.allocation_images FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.audit_logs FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.asset_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.employees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.allocations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.allocation_images TO authenticated;
GRANT SELECT, INSERT ON TABLE public.audit_logs TO authenticated;

CREATE POLICY asset_types_admin_all ON public.asset_types
  FOR ALL TO authenticated
  USING (public.is_cloutflow_admin())
  WITH CHECK (public.is_cloutflow_admin());

CREATE POLICY employees_admin_all ON public.employees
  FOR ALL TO authenticated
  USING (public.is_cloutflow_admin())
  WITH CHECK (public.is_cloutflow_admin());

CREATE POLICY assets_admin_all ON public.assets
  FOR ALL TO authenticated
  USING (public.is_cloutflow_admin())
  WITH CHECK (public.is_cloutflow_admin());

CREATE POLICY allocations_admin_all ON public.allocations
  FOR ALL TO authenticated
  USING (public.is_cloutflow_admin())
  WITH CHECK (public.is_cloutflow_admin());

CREATE POLICY allocation_images_admin_all ON public.allocation_images
  FOR ALL TO authenticated
  USING (public.is_cloutflow_admin())
  WITH CHECK (public.is_cloutflow_admin());

CREATE POLICY audit_logs_admin_select ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_cloutflow_admin());

CREATE POLICY audit_logs_admin_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_cloutflow_admin());

-- ---------------------------------------------------------------------------
-- Private storage bucket + policies
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'asset-images',
  'asset-images',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Admin read asset-images" ON storage.objects;
DROP POLICY IF EXISTS "Admin insert asset-images" ON storage.objects;
DROP POLICY IF EXISTS "Admin update asset-images" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete asset-images" ON storage.objects;

CREATE POLICY "Admin read asset-images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'asset-images' AND public.is_cloutflow_admin());

CREATE POLICY "Admin insert asset-images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'asset-images' AND public.is_cloutflow_admin());

CREATE POLICY "Admin update asset-images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'asset-images' AND public.is_cloutflow_admin())
  WITH CHECK (bucket_id = 'asset-images' AND public.is_cloutflow_admin());

CREATE POLICY "Admin delete asset-images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'asset-images' AND public.is_cloutflow_admin());

-- ---------------------------------------------------------------------------
-- Default asset types from the original product requirements.
-- No employees, assets, or allocations are seeded.
-- ---------------------------------------------------------------------------

INSERT INTO public.asset_types (name, is_custom)
VALUES
  ('Laptop', false),
  ('Mouse', false),
  ('Keyboard', false),
  ('Hard Disk', false),
  ('Monitor', false),
  ('Headset', false),
  ('Mobile Phone', false),
  ('Charger', false),
  ('Docking Station', false),
  ('Webcam', false),
  ('Tablet', false),
  ('USB Drive', false),
  ('Adapter', false),
  ('Laptop Bag', false)
ON CONFLICT (name) DO NOTHING;
