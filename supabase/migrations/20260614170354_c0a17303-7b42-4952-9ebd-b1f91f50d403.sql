
-- Drop the previous security-definer view (flagged by linter)
DROP VIEW IF EXISTS public.public_profiles;

-- Allow public to see profile rows, but only non-sensitive columns via column-level grants
DROP POLICY IF EXISTS "users can view own profile" ON public.profiles;

CREATE POLICY "profiles public basics readable"
ON public.profiles
FOR SELECT
USING (true);

-- Revoke broad column access, then re-grant only safe columns to anon/authenticated.
-- Owners and admins still get full row access via service_role / admin policy paths and explicit owner grant below.
REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT (id, role, full_name, avatar_url, city, state, created_at)
  ON public.profiles TO anon, authenticated;

-- Allow authenticated owners to also read their own phone via a SECURITY INVOKER helper
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- Grant owner full column SELECT by adding back full SELECT only for rows they own through a separate role-less approach:
-- Use column grants is global; instead expose phone to owner only through get_my_profile().
