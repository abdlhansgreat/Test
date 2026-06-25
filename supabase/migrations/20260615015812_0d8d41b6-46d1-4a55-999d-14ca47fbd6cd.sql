
CREATE POLICY "Public read post-covers"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'post-covers');

CREATE POLICY "Admins upload post-covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'post-covers' AND public.is_admin());

CREATE POLICY "Admins update post-covers"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'post-covers' AND public.is_admin())
  WITH CHECK (bucket_id = 'post-covers' AND public.is_admin());

CREATE POLICY "Admins delete post-covers"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'post-covers' AND public.is_admin());
