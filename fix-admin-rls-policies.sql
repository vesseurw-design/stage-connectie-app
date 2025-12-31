-- Check and fix RLS policies for admin access
-- This ensures admins can read all data needed for the dashboard

-- First, let's check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('Attendance', 'Bedrijven', 'Students', 'stagebegeleiders')
ORDER BY tablename, policyname;

-- Enable RLS on all tables if not already enabled
ALTER TABLE IF EXISTS public."Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Bedrijven" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Students" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stagebegeleiders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them correctly)
DROP POLICY IF EXISTS "attendance_read_all" ON public."Attendance";
DROP POLICY IF EXISTS "bedrijven_read_all" ON public."Bedrijven";
DROP POLICY IF EXISTS "students_read_all" ON public."Students";
DROP POLICY IF EXISTS "stagebegeleiders_read_all" ON public.stagebegeleiders;

-- Create policies that allow authenticated users to read data
-- Students: Allow authenticated users to read
CREATE POLICY "students_read_all" ON public."Students"
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Bedrijven: Allow authenticated users to read
CREATE POLICY "bedrijven_read_all" ON public."Bedrijven"
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Attendance: Allow authenticated users to read
CREATE POLICY "attendance_read_all" ON public."Attendance"
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Stagebegeleiders: Allow authenticated users to read
CREATE POLICY "stagebegeleiders_read_all" ON public.stagebegeleiders
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Verify the new policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('Attendance', 'Bedrijven', 'Students', 'stagebegeleiders')
ORDER BY tablename, policyname;
