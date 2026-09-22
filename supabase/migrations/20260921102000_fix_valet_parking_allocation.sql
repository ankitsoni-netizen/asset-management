-- Valet has no slot, so the original function skipped the spot lookup and then
-- read v_spot.id before the record was assigned. Recreate it so valet inserts
-- a new spot (or reuses a free valet spot) without touching slot_number.

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

REVOKE ALL ON FUNCTION public.allocate_parking(public.parking_type, text, text[], numeric, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.allocate_parking(public.parking_type, text, text[], numeric, uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
