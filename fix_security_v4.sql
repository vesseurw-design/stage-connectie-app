-- Security Fix Script v4 - No 'profiles' dependency
-- Run this in Supabase SQL Editor

DO $$
BEGIN
    -- 1. Students (Capitalized)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Students') THEN
        ALTER TABLE public."Students" ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "students_read_auth" ON public."Students";
        CREATE POLICY "students_read_auth" ON public."Students" FOR SELECT USING (auth.uid() IS NOT NULL);
        
        DROP POLICY IF EXISTS "students_write_admin" ON public."Students";
        CREATE POLICY "students_write_admin" ON public."Students" FOR ALL USING (
            (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
            lower(auth.jwt() ->> 'email') LIKE '%@groenehartprocollege.nl' OR
            lower(auth.jwt() ->> 'email') LIKE '%@youscope.nl'
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
            (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
            lower(auth.jwt() ->> 'email') LIKE '%@groenehartprocollege.nl' OR
            lower(auth.jwt() ->> 'email') LIKE '%@youscope.nl'
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
            (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'employer') OR
            (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'employer') OR
             lower(auth.jwt() ->> 'email') LIKE '%@groenehartprocollege.nl' OR
             lower(auth.jwt() ->> 'email') LIKE '%@youscope.nl'
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
             (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'employer') OR
            (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'employer') OR
             lower(auth.jwt() ->> 'email') LIKE '%@groenehartprocollege.nl' OR
             lower(auth.jwt() ->> 'email') LIKE '%@youscope.nl'
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
                DROP POLICY IF EXISTS "begeleiders_read_auth" ON public."Stagebegeleiders";
        CREATE POLICY "begeleiders_read_auth" ON public."Stagebegeleiders" FOR SELECT USING (auth.uid() IS NOT NULL);
        RAISE NOTICE '✅ Secured table: Stagebegeleiders';
    END IF;

END $$;
