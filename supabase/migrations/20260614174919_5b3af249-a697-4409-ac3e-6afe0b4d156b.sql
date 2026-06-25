
-- Conversations
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_b uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversations_pair_unique UNIQUE (participant_a, participant_b),
  CONSTRAINT conversations_pair_order CHECK (participant_a < participant_b)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() = participant_a OR auth.uid() = participant_b OR public.is_admin());

CREATE POLICY "Participants can create conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = participant_a OR auth.uid() = participant_b);

CREATE POLICY "Participants can update conversations"
  ON public.conversations FOR UPDATE TO authenticated
  USING (auth.uid() = participant_a OR auth.uid() = participant_b OR public.is_admin())
  WITH CHECK (auth.uid() = participant_a OR auth.uid() = participant_b OR public.is_admin());

CREATE POLICY "Admins delete conversations"
  ON public.conversations FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE INDEX conversations_participant_a_idx ON public.conversations(participant_a, last_message_at DESC);
CREATE INDEX conversations_participant_b_idx ON public.conversations(participant_b, last_message_at DESC);

-- Messages
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text,
  attachments text[] NOT NULL DEFAULT '{}',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = _conversation_id
      AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
  );
$$;

CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id) OR public.is_admin());

CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_conversation_participant(conversation_id)
  );

CREATE POLICY "Participants can update messages"
  ON public.messages FOR UPDATE TO authenticated
  USING (public.is_conversation_participant(conversation_id) OR public.is_admin())
  WITH CHECK (public.is_conversation_participant(conversation_id) OR public.is_admin());

CREATE POLICY "Admins delete messages"
  ON public.messages FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE INDEX messages_conversation_idx ON public.messages(conversation_id, created_at DESC);
CREATE INDEX messages_unread_idx ON public.messages(conversation_id, sender_id) WHERE read = false;

-- Bump conversation.last_message_at on new message
CREATE OR REPLACE FUNCTION public.bump_conversation_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_bump_conversation
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_last_message();

-- Find or create a conversation between current user and another profile
CREATE OR REPLACE FUNCTION public.find_or_create_conversation(_other uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _a uuid;
  _b uuid;
  _id uuid;
BEGIN
  IF _me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _other IS NULL OR _other = _me THEN
    RAISE EXCEPTION 'Invalid conversation target';
  END IF;

  IF _me < _other THEN
    _a := _me; _b := _other;
  ELSE
    _a := _other; _b := _me;
  END IF;

  SELECT id INTO _id FROM public.conversations
    WHERE participant_a = _a AND participant_b = _b;

  IF _id IS NULL THEN
    INSERT INTO public.conversations (participant_a, participant_b)
      VALUES (_a, _b)
      RETURNING id INTO _id;
  END IF;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_or_create_conversation(uuid) TO authenticated;

-- Realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
