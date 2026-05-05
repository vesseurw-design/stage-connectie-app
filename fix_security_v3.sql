-- Security Fix Script v3 - Robust Installation
-- Run this in Supabase SQL Editor
-- This script checks if tables exist before applying policies to avoid errors

DO $$
BEGIN
    -- 1. Students (Capitalized)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Students') THEN
        ALTER TABLE public."Students" ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "students_read_auth" ON public."Students";
        CREATE POLICY "students_read_auth" ON public."Students" FOR SELECT USING (auth.uid() IS NOT NULL);
        
        DROP POLICY IF EXISTS "students_write_admin" ON public."Students";
        CREATE POLICY "students_write_admin" ON public."Students" FOR ALL USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );
        RAISE NOTICE '✅ Secured table: Students';
    END IF;

    -- 2. students (Lowercase)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'students') THEN
        ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "students_read_auth_lower" ON public.students;
        CREATE POLICY "students_read_auth_lower" ON public.students FOR SELECT USING (auth.uid() IS NOT NULL);
        
        DROP POLICY IF EXISTS "students_write_admin_lower" ON public.students;
        CREATE POLICY "students_write_admin_lower" ON public.students FOR ALL USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );
        RAISE NOTICE '✅ Secured table: students';
    END IF;

    -- 3. Attendance (Capitalized)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Attendance') THEN
        ALTER TABLE public."Attendance" ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "attendance_read_auth" ON public."Attendance";
        CREATE POLICY "attendance_read_auth" ON public."Attendance" FOR SELECT USING (auth.uid() IS NOT NULL);
        
        DROP POLICY IF EXISTS "attendance_write_admin" ON public."Attendance";
        CREATE POLICY "attendance_write_admin" ON public."Attendance" FOR ALL USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'employer'))
        );
        RAISE NOTICE '✅ Secured table: Attendance';
    END IF;

    -- 4. attendance (Lowercase)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance') THEN
        ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "attendance_read_auth_lower" ON public.attendance;
        CREATE POLICY "attendance_read_auth_lower" ON public.attendance FOR SELECT USING (auth.uid() IS NOT NULL);
        
        DROP POLICY IF EXISTS "attendance_write_admin_lower" ON public.attendance;
        CREATE POLICY "attendance_write_admin_lower" ON public.attendance FOR ALL USING (
             EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'employer'))
        );
        RAISE NOTICE '✅ Secured table: attendance';
    END IF;

    -- 5. Bedrijven (Capitalized)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Bedrijven') THEN
        ALTER TABLE public."Bedrijven" ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "bedrijven_read_auth" ON public."Bedrijven";
        CREATE POLICY "bedrijven_read_auth" ON public."Bedrijven" FOR SELECT USING (auth.uid() IS NOT NULL);
        RAISE NOTICE '✅ Secured table: Bedrijven';
    END IF;

    -- 6. Stagebegeleiders (Capitalized)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Stagebegeleiders') THEN
        ALTER TABLE public."Stagebegeleiders" ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ Secured table: Stagebegeleiders';
    END IF;

    -- 7. profiles (Lowercase) - Critical for admin checks
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        -- Ensure admins can read profiles to check roles
         DROP POLICY IF EXISTS "profiles_read_auth" ON public.profiles;
         CREATE POLICY "profiles_read_auth" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL);
        RAISE NOTICE '✅ Secured table: profiles';
    END IF;

END $$;
