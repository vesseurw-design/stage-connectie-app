-- Clean up old attendance records to fix ON CONFLICT error
-- This removes all attendance records that use student names instead of IDs
-- Run this ONLY if you're okay with losing old attendance data

-- OPTION 1: Delete ALL old attendance records (clean slate)
-- Uncomment the line below to delete everything:
-- DELETE FROM public."Attendance";

-- OPTION 2: Delete only records with student names (not IDs)
-- This keeps records that already use student IDs
DELETE FROM public."Attendance"
WHERE student_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
-- This regex matches UUID format (student IDs are UUIDs)

-- OPTION 3: Delete only records older than today
-- Uncomment the line below to keep today's records:
-- DELETE FROM public."Attendance" WHERE date < CURRENT_DATE;

-- Verify the cleanup
SELECT COUNT(*) as remaining_records FROM public."Attendance";
