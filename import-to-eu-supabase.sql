-- ============================================
-- IMPORT SCHEMA TO EU SUPABASE PROJECT
-- Voer dit uit in je NIEUWE EU Supabase project
-- ============================================

-- ============================================
-- STAP 1: Create Tables
-- ============================================

-- Students table
CREATE TABLE IF NOT EXISTS public."Students" (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    student_number text,
    company_id uuid,
    supervisor_id uuid,
    scheduled_days text[],
    created_at timestamp with time zone DEFAULT now()
);

-- Bedrijven table
CREATE TABLE IF NOT EXISTS public."Bedrijven" (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    company_name text NOT NULL,
    email text NOT NULL UNIQUE,
    phone text,
    address text,
    branche text,
    created_at timestamp with time zone DEFAULT now()
);

-- stagebegeleiders table
CREATE TABLE IF NOT EXISTS public.stagebegeleiders (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    phone text,
    whatsapp_enabled boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- Attendance table
CREATE TABLE IF NOT EXISTS public."Attendance" (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    student_id uuid NOT NULL,
    employer_id uuid NOT NULL,
    date date NOT NULL,
    status text NOT NULL CHECK (status IN ('present', 'absent', 'sick', 'late')),
    minutes_late integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(student_id, date)
);

-- Branches table (optional)
CREATE TABLE IF NOT EXISTS public."Branches" (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- STAP 2: Create Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_students_company ON public."Students"(company_id);
CREATE INDEX IF NOT EXISTS idx_students_supervisor ON public."Students"(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public."Attendance"(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public."Attendance"(date);
CREATE INDEX IF NOT EXISTS idx_attendance_employer ON public."Attendance"(employer_id);

-- ============================================
-- STAP 3: Add Foreign Key Constraints
-- ============================================

ALTER TABLE public."Students"
    ADD CONSTRAINT fk_students_company 
    FOREIGN KEY (company_id) 
    REFERENCES public."Bedrijven"(id) 
    ON DELETE SET NULL;

ALTER TABLE public."Students"
    ADD CONSTRAINT fk_students_supervisor 
    FOREIGN KEY (supervisor_id) 
    REFERENCES public.stagebegeleiders(id) 
    ON DELETE SET NULL;

ALTER TABLE public."Attendance"
    ADD CONSTRAINT fk_attendance_student 
    FOREIGN KEY (student_id) 
    REFERENCES public."Students"(id) 
    ON DELETE CASCADE;

ALTER TABLE public."Attendance"
    ADD CONSTRAINT fk_attendance_employer 
    FOREIGN KEY (employer_id) 
    REFERENCES public."Bedrijven"(id) 
    ON DELETE CASCADE;

-- ============================================
-- STAP 4: Enable Row Level Security
-- ============================================

ALTER TABLE public."Students" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Bedrijven" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stagebegeleiders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Branches" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STAP 5: Create RLS Policies
-- ============================================

-- Students: Authenticated users can read
DROP POLICY IF EXISTS "students_read_all" ON public."Students";
CREATE POLICY "students_read_all" ON public."Students"
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Bedrijven: Authenticated users can read
DROP POLICY IF EXISTS "bedrijven_read_all" ON public."Bedrijven";
CREATE POLICY "bedrijven_read_all" ON public."Bedrijven"
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- stagebegeleiders: Authenticated users can read
DROP POLICY IF EXISTS "stagebegeleiders_read_all" ON public.stagebegeleiders;
CREATE POLICY "stagebegeleiders_read_all" ON public.stagebegeleiders
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Attendance: Authenticated users can read and write
DROP POLICY IF EXISTS "attendance_read_all" ON public."Attendance";
CREATE POLICY "attendance_read_all" ON public."Attendance"
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "attendance_insert_all" ON public."Attendance";
CREATE POLICY "attendance_insert_all" ON public."Attendance"
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "attendance_update_all" ON public."Attendance";
CREATE POLICY "attendance_update_all" ON public."Attendance"
    FOR UPDATE
    USING (auth.uid() IS NOT NULL);

-- Branches: Authenticated users can read
DROP POLICY IF EXISTS "branches_read_all" ON public."Branches";
CREATE POLICY "branches_read_all" ON public."Branches"
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- ============================================
-- STAP 6: Verify Setup
-- ============================================

-- Check if all tables exist
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- VOLGENDE STAPPEN
-- ============================================

-- 1. Importeer de CSV data via Table Editor:
--    - Ga naar Table Editor
--    - Klik op elke tabel
--    - Klik "Insert" → "Import data from CSV"
--    - Upload het CSV bestand
--
-- 2. Verifieer de data:
--    SELECT COUNT(*) FROM public."Students";
--    SELECT COUNT(*) FROM public."Bedrijven";
--    SELECT COUNT(*) FROM public.stagebegeleiders;
--
-- 3. Update de application code met nieuwe Supabase URL en KEY
--
-- 4. Test alle functionaliteit!
