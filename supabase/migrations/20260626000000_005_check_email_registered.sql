-- Check if an email is already registered (used during signup validation).
CREATE OR REPLACE FUNCTION public.is_email_registered(p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE lower(email) = lower(trim(p_email))
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_email_registered(text) TO anon, authenticated;
