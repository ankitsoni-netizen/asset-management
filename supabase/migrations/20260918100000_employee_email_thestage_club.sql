-- Allow official employee emails at @cloutflow.com or @thestage.club.
-- Former @backstage.* addresses are no longer accepted.

ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_official_email;

ALTER TABLE public.employees
  ADD CONSTRAINT employees_official_email CHECK (
    email ~* '^[^[:space:]@]+@(cloutflow\.com|thestage\.club)$'
  );

ALTER TABLE public.allocations
  DROP CONSTRAINT IF EXISTS allocations_official_email;

ALTER TABLE public.allocations
  ADD CONSTRAINT allocations_official_email CHECK (
    employee_email ~* '^[^[:space:]@]+@(cloutflow\.com|thestage\.club)$'
  );
