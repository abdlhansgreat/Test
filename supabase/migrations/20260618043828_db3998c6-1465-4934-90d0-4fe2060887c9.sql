
DROP POLICY IF EXISTS "profiles public basics readable" ON public.profiles;

CREATE POLICY "profiles readable to authenticated"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.profiles FROM authenticated;

GRANT SELECT (id, role, full_name, avatar_url, city, state, created_at)
  ON public.profiles TO authenticated;
