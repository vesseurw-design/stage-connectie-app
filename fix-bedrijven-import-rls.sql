-- Fix RLS Policies voor Bulk Import van Bedrijven, Students en Stagebegeleiders
-- Voer dit script uit in de Supabase SQL Editor als een RLS melding optreedt

-- 1. Zorg dat Row Level Security is ingeschakeld
ALTER TABLE IF EXISTS public."Bedrijven" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Students" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stagebegeleiders ENABLE ROW LEVEL SECURITY;

-- 2. Bedrijven Policies
DROP POLICY IF EXISTS "bedrijven_read_all" ON public."Bedrijven";
DROP POLICY IF EXISTS "bedrijven_read_auth" ON public."Bedrijven";
CREATE POLICY "bedrijven_read_auth" ON public."Bedrijven" 
    FOR SELECT 
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "bedrijven_write_admin" ON public."Bedrijven";
DROP POLICY IF EXISTS "bedrijven_all_auth" ON public."Bedrijven";
CREATE POLICY "bedrijven_all_auth" ON public."Bedrijven" 
    FOR ALL 
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Students Policies
DROP POLICY IF EXISTS "students_read_all" ON public."Students";
DROP POLICY IF EXISTS "students_read_auth" ON public."Students";
CREATE POLICY "students_read_auth" ON public."Students" 
    FOR SELECT 
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "students_write_admin" ON public."Students";
DROP POLICY IF EXISTS "students_all_auth" ON public."Students";
CREATE POLICY "students_all_auth" ON public."Students" 
    FOR ALL 
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Stagebegeleiders Policies
DROP POLICY IF EXISTS "stagebegeleiders_read_all" ON public.stagebegeleiders;
DROP POLICY IF EXISTS "begeleiders_read_auth" ON public.stagebegeleiders;
CREATE POLICY "begeleiders_read_auth" ON public.stagebegeleiders 
    FOR SELECT 
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "begeleiders_write_admin" ON public.stagebegeleiders;
DROP POLICY IF EXISTS "begeleiders_all_auth" ON public.stagebegeleiders;
CREATE POLICY "begeleiders_all_auth" ON public.stagebegeleiders 
    FOR ALL 
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Verificatie
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('Bedrijven', 'Students', 'stagebegeleiders')
ORDER BY tablename, policyname;
