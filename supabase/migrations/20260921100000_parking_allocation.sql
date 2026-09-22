-- Parking spots can be allocated to employees the same way assets are.
-- Valet has no slot number. Basement 1–3 require a unique slot.

CREATE TYPE public.parking_type AS ENUM (
  'valet',
  'basement_1',
  'basement_2',
  'basement_3'
);

CREATE TABLE public.parking_spots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_type public.parking_type NOT NULL,
  slot_number text,
  cost numeric(12,2) NOT NULL CHECK (cost >= 0),
  status public.asset_status NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT parking_spots_valet_has_no_slot CHECK (
    parking_type <> 'valet' OR slot_number IS NULL
  ),
  CONSTRAINT parking_spots_basement_has_slot CHECK (
    parking_type = 'valet' OR (slot_number IS NOT NULL AND btrim(slot_number) <> '')
  )
);

CREATE UNIQUE INDEX parking_spots_basement_slot_idx
  ON public.parking_spots (parking_type, lower(btrim(slot_number)))
  WHERE slot_number IS NOT NULL;

CREATE INDEX parking_spots_type_status_idx
  ON public.parking_spots (parking_type, status);

CREATE TABLE public.parking_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_spot_id uuid NOT NULL REFERENCES public.parking_spots (id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES public.employees (id) ON DELETE RESTRICT,
  employee_name text NOT NULL,
  department text NOT NULL,
  position text NOT NULL,
  employee_email text NOT NULL,
  vehicle_numbers text[] NOT NULL,
  cost numeric(12,2) NOT NULL CHECK (cost >= 0),
  action public.allocation_action NOT NULL DEFAULT 'allocated',
  allocated_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT parking_allocations_employee_name_not_empty CHECK (btrim(employee_name) <> ''),
  CONSTRAINT parking_allocations_department_not_empty CHECK (btrim(department) <> ''),
  CONSTRAINT parking_allocations_position_not_empty CHECK (btrim(position) <> ''),
  CONSTRAINT parking_allocations_has_vehicle CHECK (cardinality(vehicle_numbers) >= 1),
  CONSTRAINT parking_allocations_current_has_no_ended_at CHECK (NOT is_current OR ended_at IS NULL),
  CONSTRAINT parking_allocations_ended_at_not_before_start CHECK (ended_at IS NULL OR ended_at >= allocated_at)
);

CREATE INDEX parking_allocations_spot_current_idx
  ON public.parking_allocations (parking_spot_id, is_current);

CREATE INDEX parking_allocations_employee_current_idx
  ON public.parking_allocations (employee_id, is_current);

CREATE INDEX parking_allocations_allocated_at_idx
  ON public.parking_allocations (allocated_at DESC);

CREATE TRIGGER parking_spots_set_updated_at
  BEFORE UPDATE ON public.parking_spots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER parking_allocations_set_updated_at
  BEFORE UPDATE ON public.parking_allocations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.parking_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_allocations ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.parking_spots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.parking_allocations TO authenticated;

CREATE POLICY parking_spots_admin_all ON public.parking_spots
  FOR ALL TO authenticated
  USING (public.is_cloutflow_admin())
  WITH CHECK (public.is_cloutflow_admin());

CREATE POLICY parking_allocations_admin_all ON public.parking_allocations
  FOR ALL TO authenticated
  USING (public.is_cloutflow_admin())
  WITH CHECK (public.is_cloutflow_admin());

CREATE OR REPLACE FUNCTION public.allocate_parking(
  p_parking_type public.parking_type,
  p_slot_number text,
  p_vehicle_numbers text[],
  p_cost numeric,
  p_employee_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot text;
  v_vehicles text[];
  v_spot public.parking_spots;
  v_has_spot boolean := false;
  v_employee public.employees;
  v_allocation public.parking_allocations;
BEGIN
  PERFORM public.assert_cloutflow_admin();

  IF p_cost IS NULL OR p_cost < 0 THEN
    RAISE EXCEPTION 'Enter a parking cost of zero or more.';
  END IF;

  v_slot := nullif(btrim(coalesce(p_slot_number, '')), '');
  IF p_parking_type = 'valet' THEN
    v_slot := NULL;
  ELSIF v_slot IS NULL THEN
    RAISE EXCEPTION 'Slot number is required for basement parking.';
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT upper(btrim(regexp_replace(v, '\s+', '', 'g')))
    FROM unnest(coalesce(p_vehicle_numbers, ARRAY[]::text[])) AS v
    WHERE btrim(coalesce(v, '')) <> ''
  ) INTO v_vehicles;

  IF v_vehicles IS NULL OR cardinality(v_vehicles) < 1 THEN
    RAISE EXCEPTION 'Add at least one vehicle number.';
  END IF;

  SELECT * INTO v_employee
  FROM public.employees
  WHERE id = p_employee_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected employee was not found. Add them to the roster first.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_employee.disabled THEN
    RAISE EXCEPTION 'This employee is disabled and cannot receive parking.';
  END IF;

  IF p_parking_type = 'valet' THEN
    SELECT * INTO v_spot
    FROM public.parking_spots
    WHERE parking_type = 'valet'
      AND status <> 'allocated'
      AND NOT EXISTS (
        SELECT 1
        FROM public.parking_allocations
        WHERE parking_spot_id = parking_spots.id
          AND is_current
      )
    ORDER BY created_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF FOUND THEN
      v_has_spot := true;
      UPDATE public.parking_spots
      SET cost = round(p_cost, 2)
      WHERE id = v_spot.id
      RETURNING * INTO v_spot;
    END IF;
  ELSE
    SELECT * INTO v_spot
    FROM public.parking_spots
    WHERE parking_type = p_parking_type
      AND lower(btrim(slot_number)) = lower(v_slot)
    FOR UPDATE;

    IF FOUND THEN
      v_has_spot := true;
      IF v_spot.status = 'allocated' OR EXISTS (
        SELECT 1 FROM public.parking_allocations
        WHERE parking_spot_id = v_spot.id AND is_current
      ) THEN
        RAISE EXCEPTION 'This parking slot is currently allocated. Remove it from the employee first.';
      END IF;

      UPDATE public.parking_spots
      SET cost = round(p_cost, 2)
      WHERE id = v_spot.id
      RETURNING * INTO v_spot;
    END IF;
  END IF;

  IF NOT v_has_spot THEN
    BEGIN
      INSERT INTO public.parking_spots (
        parking_type, slot_number, cost, status
      )
      VALUES (
        p_parking_type, v_slot, round(p_cost, 2), 'available'
      )
      RETURNING * INTO v_spot;
    EXCEPTION
      WHEN unique_violation THEN
        RAISE EXCEPTION 'This parking slot is currently allocated. Remove it from the employee first.';
    END;
  END IF;

  INSERT INTO public.parking_allocations (
    parking_spot_id,
    employee_id,
    employee_name,
    department,
    position,
    employee_email,
    vehicle_numbers,
    cost,
    action,
    is_current
  )
  VALUES (
    v_spot.id,
    v_employee.id,
    v_employee.name,
    v_employee.department,
    v_employee.position,
    v_employee.email,
    v_vehicles,
    round(p_cost, 2),
    'allocated',
    true
  )
  RETURNING * INTO v_allocation;

  UPDATE public.parking_spots
  SET status = 'allocated'
  WHERE id = v_spot.id
  RETURNING * INTO v_spot;

  RETURN jsonb_build_object(
    'parkingSpot', to_jsonb(v_spot),
    'allocation', to_jsonb(v_allocation),
    'employee', to_jsonb(v_employee)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.return_parking(
  p_parking_spot_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_spot public.parking_spots;
  v_now timestamptz := clock_timestamp();
BEGIN
  PERFORM public.assert_cloutflow_admin();

  SELECT * INTO v_spot
  FROM public.parking_spots
  WHERE id = p_parking_spot_id
  FOR UPDATE;

  IF v_spot.id IS NULL THEN
    RAISE EXCEPTION 'No parking allocation was found.'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.parking_allocations
    WHERE parking_spot_id = v_spot.id AND is_current
  ) THEN
    RAISE EXCEPTION 'This parking slot is already available.';
  END IF;

  UPDATE public.parking_allocations
  SET is_current = false,
      ended_at = v_now,
      action = 'returned'
  WHERE parking_spot_id = v_spot.id
    AND is_current;

  UPDATE public.parking_spots
  SET status = 'available'
  WHERE id = v_spot.id
  RETURNING * INTO v_spot;

  RETURN jsonb_build_object('ok', true, 'parkingSpot', to_jsonb(v_spot));
END;
$$;

REVOKE ALL ON FUNCTION public.allocate_parking(public.parking_type, text, text[], numeric, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.return_parking(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.allocate_parking(public.parking_type, text, text[], numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_parking(uuid) TO authenticated;
