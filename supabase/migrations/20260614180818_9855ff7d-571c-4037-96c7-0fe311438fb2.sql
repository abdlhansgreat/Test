
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, role, full_name, avatar_url, city, state, created_at)
  ON public.profiles TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_phone()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT phone FROM public.profiles WHERE id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_phone() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_phone() TO authenticated;

REVOKE SELECT ON public.payments FROM anon, authenticated;
GRANT SELECT (id, booking_id, amount, commission_amount, gateway, status, payout_status, created_at, updated_at)
  ON public.payments TO authenticated;
