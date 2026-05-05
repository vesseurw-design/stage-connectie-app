
-- 1. Voeg email toe aan de Students tabel om inloggen mogelijk te maken
ALTER TABLE public."Students" ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- 2. Voeg extra kolommen toe aan de Attendance tabel
ALTER TABLE public."Attendance" ADD COLUMN IF NOT EXISTS hours_worked NUMERIC DEFAULT 0;
ALTER TABLE public."Attendance" ADD COLUMN IF NOT EXISTS updated_by_role TEXT;

-- 3. Update RLS voor de Students tabel (studenten mogen hun eigen gegevens zien)
-- We gaan ervan uit dat studenten inloggen met een 'student' rol in metadata
DROP POLICY IF EXISTS "students_read_own" ON public."Students";
CREATE POLICY "students_read_own" ON public."Students"
    FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() ->> 'email') = email
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'supervisor', 'employer')
    );

-- 4. Update RLS voor de Attendance tabel (studenten mogen hun eigen uren schrijven)
DROP POLICY IF EXISTS "attendance_student_access" ON public."Attendance";
CREATE POLICY "attendance_student_access" ON public."Attendance"
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public."Students" s 
            WHERE s.id = student_id 
            AND s.email = (auth.jwt() ->> 'email')
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'supervisor', 'employer')
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public."Students" s 
            WHERE s.id = student_id 
            AND s.email = (auth.jwt() ->> 'email')
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'supervisor', 'employer')
    );
