GRANT USAGE ON TYPE public.parking_type TO postgres, anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
