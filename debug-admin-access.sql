-- Debug script: Check authentication and RLS setup
-- Run this to see what's happening

-- 1. Check if RLS is enabled on tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('Attendance', 'Bedrijven', 'Students', 'stagebegeleiders')
ORDER BY tablename;

-- 2. Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('Attendance', 'Bedrijven', 'Students', 'stagebegeleiders')
ORDER BY tablename, policyname;

-- 3. Check if there are any admin users in auth.users
SELECT 
    id,
    email,
    raw_user_meta_data->>'role' as role,
    created_at,
    confirmed_at
FROM auth.users
WHERE raw_user_meta_data->>'role' = 'admin'
ORDER BY created_at DESC;

-- 4. Test if you can read data (this will show if RLS is blocking)
SELECT COUNT(*) as student_count FROM public."Students";
SELECT COUNT(*) as bedrijven_count FROM public."Bedrijven";
SELECT COUNT(*) as attendance_count FROM public."Attendance";
SELECT COUNT(*) as begeleiders_count FROM public.stagebegeleiders;
