-- Controleer ALLE tabelnamen in de database
-- Voer dit uit om te zien welke tabellen er precies zijn

SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Dit toont ALLE tabellen met hun exacte namen
