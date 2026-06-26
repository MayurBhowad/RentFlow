-- Create profile (and default utility types for owners) when a new auth user signs up.
-- Runs as SECURITY DEFINER so it is not blocked by RLS before the client has a session.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'tenant');
  IF user_role NOT IN ('owner', 'tenant', 'manager') THEN
    user_role := 'tenant';
  END IF;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    user_role
  );

  IF user_role = 'owner' THEN
    INSERT INTO public.utility_types (owner_id, name, charge_type, description)
    VALUES
      (NEW.id, 'Electricity', 'variable', 'Electricity bill'),
      (NEW.id, 'Water', 'variable', 'Water bill'),
      (NEW.id, 'Gas', 'variable', 'Gas bill'),
      (NEW.id, 'Internet', 'fixed', 'Internet / WiFi'),
      (NEW.id, 'Maintenance', 'fixed', 'Maintenance charges');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
