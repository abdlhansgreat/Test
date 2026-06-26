
-- 1) Restrict direct SELECT on profiles (was: viewable by everyone)
DROP POLICY IF EXISTS "profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "users can view own profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- Admins already covered by existing "admins manage profiles" ALL policy.

-- 2) Public-safe view (no phone), bypasses RLS by running as owner, exposes only non-sensitive columns
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = off) AS
SELECT id, role, full_name, avatar_url, city, state, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 3) Prevent users from escalating their own role
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'You are not allowed to change your role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_role_self_escalation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prevent_role_self_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_role_self_escalation_trg
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_self_escalation();
