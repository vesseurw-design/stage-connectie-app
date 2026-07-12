-- ============================================
-- SUPABASE DATABASE SETUP FOR GHPC
-- Voer dit script in één keer uit in de SQL Editor van het nieuwe GHPC project
-- ============================================

-- 1. Create Tables

-- stagebegeleiders (school supervisors)
CREATE TABLE IF NOT EXISTS public.stagebegeleiders (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    whatsapp_enabled BOOLEAN DEFAULT false,
    terms_accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bedrijven (companies)
CREATE TABLE IF NOT EXISTS public."Bedrijven" (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    company_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    address TEXT,
    branche TEXT,
    contact_person TEXT,
    terms_accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Students
CREATE TABLE IF NOT EXISTS public."Students" (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    student_number TEXT,
    company_id UUID REFERENCES public."Bedrijven"(id) ON DELETE SET NULL,
    supervisor_id UUID REFERENCES public.stagebegeleiders(id) ON DELETE SET NULL,
    scheduled_days TEXT[],
    unenrollment_date DATE,
    class TEXT,
    school_year TEXT,
    email TEXT UNIQUE,
    terms_accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance
CREATE TABLE IF NOT EXISTS public."Attendance" (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public."Students"(id) ON DELETE CASCADE,
    employer_id UUID NOT NULL REFERENCES public."Bedrijven"(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT CHECK (status IN ('present', 'absent', 'sick', 'late')),
    minutes_late INTEGER DEFAULT 0,
    student_status TEXT CHECK (student_status IN ('present', 'absent', 'sick', 'late')),
    student_hours NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, date)
);

-- Vakanties (holidays)
CREATE TABLE IF NOT EXISTS public."Vakanties" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_students_company ON public."Students"(company_id);
CREATE INDEX IF NOT EXISTS idx_students_supervisor ON public."Students"(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public."Attendance"(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public."Attendance"(date);
CREATE INDEX IF NOT EXISTS idx_attendance_employer ON public."Attendance"(employer_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public."Students" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Bedrijven" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stagebegeleiders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Vakanties" ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies

-- Students Read & Write
DROP POLICY IF EXISTS "students_read_auth" ON public."Students";
CREATE POLICY "students_read_auth" ON public."Students" FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "students_write_admin" ON public."Students";
CREATE POLICY "students_write_admin" ON public."Students" FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
    lower(auth.jwt() ->> 'email') LIKE '%@groenehartprocollege.nl' OR
    lower(auth.jwt() ->> 'email') LIKE '%@youscope.nl'
);

-- Bedrijven Read & Write
DROP POLICY IF EXISTS "bedrijven_read_auth" ON public."Bedrijven";
CREATE POLICY "bedrijven_read_auth" ON public."Bedrijven" FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "bedrijven_write_admin" ON public."Bedrijven";
CREATE POLICY "bedrijven_write_admin" ON public."Bedrijven" FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
    lower(auth.jwt() ->> 'email') LIKE '%@groenehartprocollege.nl' OR
    lower(auth.jwt() ->> 'email') LIKE '%@youscope.nl'
);

-- stagebegeleiders Read & Write
DROP POLICY IF EXISTS "begeleiders_read_auth" ON public.stagebegeleiders;
CREATE POLICY "begeleiders_read_auth" ON public.stagebegeleiders FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "begeleiders_write_admin" ON public.stagebegeleiders;
CREATE POLICY "begeleiders_write_admin" ON public.stagebegeleiders FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
    lower(auth.jwt() ->> 'email') LIKE '%@groenehartprocollege.nl' OR
    lower(auth.jwt() ->> 'email') LIKE '%@youscope.nl'
);

-- Attendance Read & Write
DROP POLICY IF EXISTS "attendance_read_auth" ON public."Attendance";
CREATE POLICY "attendance_read_auth" ON public."Attendance" FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "attendance_write_admin" ON public."Attendance";
CREATE POLICY "attendance_write_admin" ON public."Attendance" FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'employer') OR
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'employer') OR
    lower(auth.jwt() ->> 'email') LIKE '%@groenehartprocollege.nl' OR
    lower(auth.jwt() ->> 'email') LIKE '%@youscope.nl'
);

-- Vakanties Read
DROP POLICY IF EXISTS "Vakanties_read_all" ON public."Vakanties";
CREATE POLICY "Vakanties_read_all" ON public."Vakanties" FOR SELECT USING (true);

-- 5. Insert Default Holiday (Voorbeeld)
INSERT INTO public."Vakanties" (name, start_date, end_date)
VALUES ('Zomervakantie 2026', '2026-07-20', '2026-08-30')
ON CONFLICT DO NOTHING;
