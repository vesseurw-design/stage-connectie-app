-- Migration to add Class and School Year to Students table
-- First run this in Staging (Test) project
-- Then run this in Production project when testing is complete

-- 1. Add new columns
ALTER TABLE public."Students" 
ADD COLUMN IF NOT EXISTS class TEXT,
ADD COLUMN IF NOT EXISTS school_year TEXT;

-- 2. (Optional) Comment to document the change
COMMENT ON COLUMN public."Students".class IS 'The class/group the student belongs to (e.g. 4A)';
COMMENT ON COLUMN public."Students".school_year IS 'The academic year (e.g. 2025-2026)';
