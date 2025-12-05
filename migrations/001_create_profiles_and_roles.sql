-- 001_create_profiles_and_roles.sql
-- Creates roles, profiles and mapping table for assigning users to companies.

BEGIN;

-- Roles table
CREATE TABLE IF NOT EXISTS public.roles (
  name text PRIMARY KEY
);

INSERT INTO public.roles (name) VALUES ('admin'), ('supervisor'), ('employer')
ON CONFLICT DO NOTHING;

-- Profiles table that links auth.users -> application role
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  role text REFERENCES public.roles (name) DEFAULT 'employer',
  created_at timestamptz DEFAULT now()
);

-- Mapping table: which user is linked to which company (employer accounts)
CREATE TABLE IF NOT EXISTS public.company_employers (
  user_id uuid REFERENCES public.profiles (id) ON DELETE CASCADE,
  company_id uuid,
  PRIMARY KEY (user_id, company_id)
);

-- Trigger function to create a profile row when a new auth.user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, created_at)
  VALUES (NEW.id, NEW.email, 'employer', now())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users (Supabase supports triggers on auth.users)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;
