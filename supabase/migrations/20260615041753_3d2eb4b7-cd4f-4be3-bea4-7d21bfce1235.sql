DROP POLICY IF EXISTS "Anyone can subscribe" ON public.subscribers;
REVOKE INSERT ON public.subscribers FROM anon, authenticated;
-- Subscriber inserts now go through the subscribe-newsletter edge function
-- (service role), which silently ignores duplicates so anonymous callers
-- cannot enumerate which emails are already on the list.