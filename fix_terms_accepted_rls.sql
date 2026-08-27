-- SQL MIGRATIE: FIX TERMS ACCEPTED EN RLS POLICIES
-- Dit script voegt de benodigde kolommen toe en stelt RLS in zodat gebruikers
-- eenmalig akkoord kunnen geven op de gebruikersovereenkomst.

-- =========================================================================
-- STAP 1: Kolommen toevoegen (als ze nog niet bestaan)
-- =========================================================================

-- 1. Voeg terms_accepted_at toe aan Students (Stagiairs)
ALTER TABLE IF EXISTS public."Students" 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;

-- 2. Voeg terms_accepted_at toe aan Bedrijven (Werkgevers)
ALTER TABLE IF EXISTS public."Bedrijven" 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;

-- 3. Voeg terms_accepted_at toe aan stagebegeleiders (Docenten)
ALTER TABLE IF EXISTS public.stagebegeleiders 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;


-- =========================================================================
-- STAP 2: RLS Policies instellen voor het updaten van het akkoord
-- =========================================================================

-- 4. Bedrijven (Werkgevers) toestaan hun eigen terms_accepted_at bij te werken
DROP POLICY IF EXISTS "bedrijven_update_own_terms" ON public."Bedrijven";
CREATE POLICY "bedrijven_update_own_terms" ON public."Bedrijven" 
FOR UPDATE 
USING (id::text = (auth.jwt() -> 'user_metadata' ->> 'company_id'))
WITH CHECK (id::text = (auth.jwt() -> 'user_metadata' ->> 'company_id'));

-- 5. Stagebegeleiders (Docenten) toestaan hun eigen terms_accepted_at bij te werken
DROP POLICY IF EXISTS "stagebegeleiders_update_own_terms" ON public.stagebegeleiders;
CREATE POLICY "stagebegeleiders_update_own_terms" ON public.stagebegeleiders 
FOR UPDATE 
USING (id::text = (auth.jwt() -> 'user_metadata' ->> 'supervisor_id'))
WITH CHECK (id::text = (auth.jwt() -> 'user_metadata' ->> 'supervisor_id'));

-- 6. Students (Stagiairs) toestaan hun eigen terms_accepted_at bij te werken
DROP POLICY IF EXISTS "students_update_own_terms" ON public."Students";
CREATE POLICY "students_update_own_terms" ON public."Students" 
FOR UPDATE 
USING (auth.jwt() ->> 'email' = email)
WITH CHECK (auth.jwt() ->> 'email' = email);

-- ✅ Kolommen en RLS Policies voor Click-Wrap akkoord succesvol aangemaakt!
