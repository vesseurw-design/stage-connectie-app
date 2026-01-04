-- Check for duplicate or conflicting attendance records
-- This will show if there are records with student names vs student IDs

-- 1. Check what's currently in the Attendance table
SELECT 
    student_id,
    date,
    status,
    COUNT(*) as count
FROM public."Attendance"
GROUP BY student_id, date, status
HAVING COUNT(*) > 1
ORDER BY date DESC;

-- 2. Check if student_id contains names or IDs
SELECT 
    student_id,
    CASE 
        WHEN student_id ~ '^[0-9]+$' THEN 'ID (number)'
        ELSE 'Name (text)'
    END as id_type,
    COUNT(*) as record_count
FROM public."Attendance"
GROUP BY student_id
ORDER BY id_type, student_id;

-- 3. Show all attendance records from today
SELECT *
FROM public."Attendance"
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC, student_id;
