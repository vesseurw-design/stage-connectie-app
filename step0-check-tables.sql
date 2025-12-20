-- STAP 0: Controleer welke tabellen er zijn
-- Voer dit EERST uit om de exacte tabelnamen te zien

-- Toon alle tabellen in de public schema
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Dit toont alle tabelnamen zoals ze EXACT zijn (hoofdlettergevoelig!)
