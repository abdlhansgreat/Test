
REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_conversation_last_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.find_or_create_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_or_create_conversation(uuid) TO authenticated;
