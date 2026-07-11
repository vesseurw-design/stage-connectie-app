-- ========================================================
-- VOEG TERMS_ACCEPTED_AT TOE AAN TABELLEN (CLICK-WRAP)
-- ========================================================
-- Voer dit script uit in de Supabase SQL Editor om kolommen
-- toe te voegen die de datum en tijd van acceptatie opslaan.
-- ========================================================

-- 1. Voeg terms_accepted_at toe aan Students (Leerlingen)
ALTER TABLE public."Students" 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;

-- 2. Voeg terms_accepted_at toe aan Stagebegeleiders (Docenten)
ALTER TABLE public."Stagebegeleiders" 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;

-- 3. Voeg terms_accepted_at toe aan Bedrijven (Werkgevers)
ALTER TABLE public."Bedrijven" 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;

-- ========================================================
-- VERIFICATIE
-- ========================================================
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('Students', 'Stagebegeleiders', 'Bedrijven')
  AND column_name = 'terms_accepted_at';
