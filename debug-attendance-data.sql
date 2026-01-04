-- Check if there is any attendance data in the database
-- Run this in Supabase SQL Editor to see what data exists

-- 1. Check total attendance records
SELECT COUNT(*) as total_attendance_records
FROM public."Attendance";

-- 2. Check attendance records with details
SELECT 
    a.id,
    a.student_id,
    a.employer_id,
    a.date,
    a.status,
    a.minutes_late,
    s.name as student_name,
    b.company_name
FROM public."Attendance" a
LEFT JOIN public."Students" s ON s.id = a.student_id
LEFT JOIN public."Bedrijven" b ON b.id = a.employer_id
ORDER BY a.date DESC
LIMIT 20;

-- 3. Check which students have attendance records
SELECT 
    s.id,
    s.name,
    s.supervisor_id,
    COUNT(a.id) as attendance_count
FROM public."Students" s
LEFT JOIN public."Attendance" a ON a.student_id = s.id
GROUP BY s.id, s.name, s.supervisor_id
ORDER BY s.name;

-- 4. Check RLS policies on Attendance table
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
  AND tablename = 'Attendance';
