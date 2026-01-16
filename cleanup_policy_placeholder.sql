-- Trigger in Database (Zou in Supabase SQL Editor moeten worden uitgevoerd)

-- Functie om oude data op te schonen
CREATE OR REPLACE FUNCTION cleanup_old_student_data()
RETURNS void AS $$
BEGIN
  -- Verwijder studenten die 'uitgeschreven' zijn en waarbij de 'archive_date' langer dan 1 jaar geleden is
  -- LET OP: Dit vereist dat we een 'status' en 'archive_date' kolom hebben in de Students tabel.
  
  -- Voorbeeld (pseudo-code, pas aan op basis van werkelijke kolommen):
  -- DELETE FROM "Students" 
  -- WHERE status = 'uitgeschreven' 
  -- AND archive_date < (NOW() - INTERVAL '1 year');
  
  -- Als we geen status hebben, kunnen we voorlopig alleen handmatig verwijderen of op basis van 'end_date'
  -- DELETE FROM "Students"
  -- WHERE end_date < (NOW() - INTERVAL '2 years'); -- Bijv. 1 jaar na max schooltijd + 1 jaar bewaar
END;
$$ LANGUAGE plpgsql;

-- Om dit automatisch te laten draaien, zou je in Supabase een 'pg_cron' job kunnen instellen (vereist Pro plan)
-- Of je maakt een Edge Function die dit 1x per dag aanroept.
