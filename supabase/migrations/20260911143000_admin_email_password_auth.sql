-- Lock authentication and RLS to the single permitted admin account.

CREATE OR REPLACE FUNCTION public.is_cloutflow_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(lower(btrim(auth.jwt() ->> 'email')), '') = 'admin@cloutflow.com';
$$;

REVOKE ALL ON FUNCTION public.is_cloutflow_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_cloutflow_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_admin_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF coalesce(lower(btrim(NEW.email)), '') IS DISTINCT FROM 'admin@cloutflow.com' THEN
    RAISE EXCEPTION 'Only admin@cloutflow.com is permitted to authenticate';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_admin_auth_user ON auth.users;
CREATE TRIGGER enforce_admin_auth_user
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_auth_user();
