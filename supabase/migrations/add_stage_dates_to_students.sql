-- ========================================================
-- VOEG STAGEDATA TOE AAN STUDENTS TABEL
-- ========================================================
-- Voer dit script uit in de Supabase SQL Editor om kolommen
-- toe te voegen die de start- en einddatum van de stage opslaan.
-- ========================================================

ALTER TABLE public."Students" 
ADD COLUMN IF NOT EXISTS stage_start_date DATE,
ADD COLUMN IF NOT EXISTS stage_end_date DATE;

-- ========================================================
-- VERIFICATIE
-- ========================================================
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Students'
  AND column_name IN ('stage_start_date', 'stage_end_date');
