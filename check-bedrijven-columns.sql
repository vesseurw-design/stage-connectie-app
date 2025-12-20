-- Check kolommen van Bedrijven tabel
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Bedrijven'
ORDER BY ordinal_position;
