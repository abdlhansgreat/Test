
CREATE POLICY "Users upload attachments to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Conversation participants view attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'attachments'
  AND EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE name = ANY(m.attachments)
      AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
  )
);

CREATE POLICY "Senders view their own uploaded attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users delete own attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
