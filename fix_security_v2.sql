-- Security Fix Script v2 - Fix ALL missing RLS
-- Run this in Supabase SQL Editor

-- 1. Enable RLS on all tables (handling Case Sensitivity)
ALTER TABLE IF EXISTS public."Stagebegeleiders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stagebegeleiders ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public."Bedrijven" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bedrijven ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public."Students" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public."Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public."Branches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."company_employers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."employer_contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."supervisor_contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employers ENABLE ROW LEVEL SECURITY;

-- 2. Create Safety Policies for Students
-- Allow authenticated users to view students
DROP POLICY IF EXISTS "students_read_auth" ON public."Students";
CREATE POLICY "students_read_auth" ON public."Students" FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "students_read_auth_lower" ON public.students;
CREATE POLICY "students_read_auth_lower" ON public.students FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow admins to modify students
DROP POLICY IF EXISTS "students_write_admin" ON public."Students";
CREATE POLICY "students_write_admin" ON public."Students" FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "students_write_admin_lower" ON public.students;
CREATE POLICY "students_write_admin_lower" ON public.students FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 3. Create Safety Policies for Attendance
-- Allow authenticated users to view
DROP POLICY IF EXISTS "attendance_read_auth" ON public."Attendance";
CREATE POLICY "attendance_read_auth" ON public."Attendance" FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "attendance_read_auth_lower" ON public.attendance;
CREATE POLICY "attendance_read_auth_lower" ON public.attendance FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow admins/employers to modify (adjust based on needs, here Admin only for safety + Employers if they own it)
DROP POLICY IF EXISTS "attendance_write_admin" ON public."Attendance";
CREATE POLICY "attendance_write_admin" ON public."Attendance" FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'employer'))
);

DROP POLICY IF EXISTS "attendance_write_admin_lower" ON public.attendance;
CREATE POLICY "attendance_write_admin_lower" ON public.attendance FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'employer'))
);

-- 4. Create Safety Policies for Bedrijven (if missing)
DROP POLICY IF EXISTS "bedrijven_read_auth" ON public."Bedrijven";
CREATE POLICY "bedrijven_read_auth" ON public."Bedrijven" FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "bedrijven_read_auth_lower" ON public.bedrijven;
CREATE POLICY "bedrijven_read_auth_lower" ON public.bedrijven FOR SELECT USING (auth.uid() IS NOT NULL);

-- 5. Verify RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
