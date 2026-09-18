-- One-off reset of live operational data. Keep asset types and the admin auth user.
-- Do not add this to the migrations folder.

TRUNCATE TABLE
  public.allocation_images,
  public.asset_images,
  public.audit_logs,
  public.allocations,
  public.assets,
  public.employees
RESTART IDENTITY CASCADE;

DELETE FROM storage.objects
WHERE bucket_id = 'asset-images';
