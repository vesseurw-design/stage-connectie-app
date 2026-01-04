-- Fix ALL RLS Security Issues from Supabase Security Advisor
-- Run this in Supabase SQL Editor

-- 1. Enable RLS on all main tables (skip ActiveBranches - it's a view)
ALTER TABLE IF EXISTS public."Branches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Bedrijven" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company_employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stagebegeleiders ENABLE ROW LEVEL SECURITY;

-- 2. Enable RLS on backup tables (optional but recommended)
ALTER TABLE IF EXISTS public.backup_stagebegeleiders_20241219 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.backup_bedrijven_20241219 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.backup_students_20241219 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.backup_attendance_20241219 ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for Branches (authenticated users can read)
DROP POLICY IF EXISTS "branches_read_all" ON public."Branches";
CREATE POLICY "branches_read_all" ON public."Branches"
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- 5. Create policies for company_employers (users can see their own records)
DROP POLICY IF EXISTS "company_employers_own_records" ON public.company_employers;
CREATE POLICY "company_employers_own_records" ON public.company_employers
    FOR ALL
    USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- 6. Create policies for profiles (users can see their own profile, admins see all)
DROP POLICY IF EXISTS "profiles_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_own_or_admin" ON public.profiles
    FOR SELECT
    USING (
        auth.uid() = id 
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

-- 7. Create policies for roles (authenticated users can read)
DROP POLICY IF EXISTS "roles_read_all" ON public.roles;
CREATE POLICY "roles_read_all" ON public.roles
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- 8. Backup tables - restrict to admins only
DROP POLICY IF EXISTS "backup_admin_only" ON public.backup_stagebegeleiders_20241219;
CREATE POLICY "backup_admin_only" ON public.backup_stagebegeleiders_20241219
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "backup_bedrijven_admin_only" ON public.backup_bedrijven_20241219;
CREATE POLICY "backup_bedrijven_admin_only" ON public.backup_bedrijven_20241219
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "backup_students_admin_only" ON public.backup_students_20241219;
CREATE POLICY "backup_students_admin_only" ON public.backup_students_20241219
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "backup_attendance_admin_only" ON public.backup_attendance_20241219;
CREATE POLICY "backup_attendance_admin_only" ON public.backup_attendance_20241219
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 9. Enable Leaked Password Protection (recommended)
-- This is done in Supabase Dashboard: Authentication -> Settings -> Enable "Leaked Password Protection"

-- Verify all RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
