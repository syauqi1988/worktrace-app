
CREATE OR REPLACE FUNCTION public.cleanup_deleted_user_email(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM auth.identities WHERE user_id = p_user_id;
  DELETE FROM auth.sessions WHERE user_id = p_user_id;
  DELETE FROM auth.refresh_tokens WHERE user_id = p_user_id;
  DELETE FROM auth.mfa_factors WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_deleted_user_email(uuid) TO service_role;
