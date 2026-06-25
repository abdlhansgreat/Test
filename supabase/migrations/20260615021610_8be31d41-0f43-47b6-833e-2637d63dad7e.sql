
-- notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text,
  title text,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users mark their own notifications read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins manage all notifications"
  ON public.notifications FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE INDEX notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- subscribers
CREATE TABLE public.subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.subscribers TO anon, authenticated;
GRANT SELECT ON public.subscribers TO authenticated;
GRANT ALL ON public.subscribers TO service_role;

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe"
  ON public.subscribers FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins read subscribers"
  ON public.subscribers FOR SELECT TO authenticated
  USING (public.is_admin());
