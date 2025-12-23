-- Cleanup: Verwijder custom_branche kolom
-- Datum: 23 december 2025

-- Verwijder custom_branche kolom (niet nodig)
ALTER TABLE public."Bedrijven" 
DROP COLUMN IF EXISTS custom_branche;

-- Verificatie: Check alle kolommen in Bedrijven tabel
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'Bedrijven' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check of branche kolom bestaat
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'Bedrijven' 
AND column_name = 'branche';

-- Check branches tabel
SELECT * FROM public."Branches" ORDER BY is_custom, name;
