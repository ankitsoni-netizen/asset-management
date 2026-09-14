-- Delivery tracking for asset allocation acknowledgement emails.
-- Do not edit previously deployed migrations; additive schema only.

ALTER TYPE public.audit_event ADD VALUE IF NOT EXISTS 'acknowledgement_email_sent';
ALTER TYPE public.audit_event ADD VALUE IF NOT EXISTS 'acknowledgement_email_failed';
ALTER TYPE public.audit_event ADD VALUE IF NOT EXISTS 'acknowledgement_email_retried';

ALTER TABLE public.allocations
  ADD COLUMN IF NOT EXISTS email_delivery_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_message_id text,
  ADD COLUMN IF NOT EXISTS email_last_attempted_at timestamptz;

UPDATE public.allocations
SET
  email_delivery_status = CASE
    WHEN email_sent THEN 'sent'
    WHEN email_error IS NOT NULL THEN 'failed'
    ELSE 'pending'
  END,
  email_sent_at = CASE
    WHEN email_sent THEN coalesce(email_sent_at, updated_at)
    ELSE email_sent_at
  END,
  email_attempt_count = CASE
    WHEN email_attempt_count > 0 THEN email_attempt_count
    WHEN email_sent OR email_error IS NOT NULL THEN 1
    ELSE 0
  END
WHERE email_delivery_status = 'pending'
   OR (email_sent AND email_sent_at IS NULL);

ALTER TABLE public.allocations
  DROP CONSTRAINT IF EXISTS allocations_email_delivery_status_check;

ALTER TABLE public.allocations
  ADD CONSTRAINT allocations_email_delivery_status_check
    CHECK (email_delivery_status IN ('pending', 'sent', 'failed', 'not_configured'));

ALTER TABLE public.allocations
  DROP CONSTRAINT IF EXISTS allocations_email_sent_matches_status;

ALTER TABLE public.allocations
  ADD CONSTRAINT allocations_email_sent_matches_status
    CHECK (
      (email_sent AND email_delivery_status = 'sent' AND email_sent_at IS NOT NULL)
      OR
      (NOT email_sent AND email_delivery_status <> 'sent')
    );

ALTER TABLE public.allocations
  DROP CONSTRAINT IF EXISTS allocations_email_attempt_count_nonnegative;

ALTER TABLE public.allocations
  ADD CONSTRAINT allocations_email_attempt_count_nonnegative
    CHECK (email_attempt_count >= 0);

CREATE INDEX IF NOT EXISTS allocations_email_delivery_status_idx
  ON public.allocations (email_delivery_status);

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
    IF NEW.email_message_id IS NOT NULL AND btrim(NEW.email_message_id) = '' THEN
      NEW.email_message_id := NULL;
    END IF;
    NEW.employee_email := lower(btrim(NEW.employee_email));
    NEW.employee_name := btrim(NEW.employee_name);
    NEW.department := btrim(NEW.department);
    NEW.position := btrim(NEW.position);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_acknowledgement_send(
  p_allocation_id uuid,
  p_min_interval_seconds integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allocation public.allocations;
  v_asset public.assets;
  v_type public.asset_types;
  v_status text;
BEGIN
  PERFORM public.assert_cloutflow_admin();

  SELECT * INTO v_allocation
  FROM public.allocations
  WHERE id = p_allocation_id
  FOR UPDATE;

  IF v_allocation.id IS NULL THEN
    RAISE EXCEPTION 'Allocation not found.'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_asset
  FROM public.assets
  WHERE id = v_allocation.asset_id;

  SELECT * INTO v_type
  FROM public.asset_types
  WHERE id = v_asset.asset_type_id;

  IF v_allocation.email_sent OR v_allocation.email_delivery_status = 'sent' THEN
    v_status := 'already_sent';
  ELSIF v_allocation.email_last_attempted_at IS NOT NULL
    AND v_allocation.email_last_attempted_at > now() - make_interval(secs => GREATEST(p_min_interval_seconds, 0)) THEN
    v_status := 'cooldown';
  ELSE
    UPDATE public.allocations
    SET
      email_attempt_count = email_attempt_count + 1,
      email_last_attempted_at = now(),
      email_delivery_status = 'pending',
      email_error = NULL
    WHERE id = p_allocation_id
    RETURNING * INTO v_allocation;
    v_status := 'claimed';
  END IF;

  RETURN jsonb_build_object(
    'status', v_status,
    'allocation', to_jsonb(v_allocation),
    'asset', to_jsonb(v_asset),
    'assetType', to_jsonb(v_type)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_acknowledgement_send(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_acknowledgement_send(uuid, integer) TO authenticated;
