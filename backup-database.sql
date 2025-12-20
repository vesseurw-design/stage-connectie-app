-- Database Backup Script (AANGEPASTE VERSIE)
-- Voer dit uit in Supabase SQL Editor VOOR de migratie
-- Datum: 19 December 2024
-- Deze versie werkt met zowel hoofdletters als kleine letters tabelnamen

-- STAP 1: Controleer eerst welke tabellen bestaan
DO $$
DECLARE
    table_exists boolean;
BEGIN
    -- Check Stagebegeleiders (met hoofdletters)
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Stagebegeleiders'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE '✅ Tabel "Stagebegeleiders" (hoofdletters) gevonden';
    ELSE
        RAISE NOTICE '❌ Tabel "Stagebegeleiders" (hoofdletters) NIET gevonden';
    END IF;
    
    -- Check stagebegeleiders (kleine letters)
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'stagebegeleiders'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE '✅ Tabel "stagebegeleiders" (kleine letters) gevonden';
    ELSE
        RAISE NOTICE '❌ Tabel "stagebegeleiders" (kleine letters) NIET gevonden';
    END IF;
END $$;

-- STAP 2: Maak backups (probeer beide varianten)
-- Backup voor Stagebegeleiders (hoofdletters) - als deze bestaat
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Stagebegeleiders') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS backup_stagebegeleiders_20241219 AS SELECT * FROM public."Stagebegeleiders"';
        RAISE NOTICE '✅ Backup gemaakt van "Stagebegeleiders"';
    END IF;
END $$;

-- Backup voor stagebegeleiders (kleine letters) - als deze bestaat
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stagebegeleiders') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS backup_stagebegeleiders_20241219 AS SELECT * FROM public.stagebegeleiders';
        RAISE NOTICE '✅ Backup gemaakt van "stagebegeleiders"';
    END IF;
END $$;

-- Backup voor Bedrijven (hoofdletters)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Bedrijven') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS backup_bedrijven_20241219 AS SELECT * FROM public."Bedrijven"';
        RAISE NOTICE '✅ Backup gemaakt van "Bedrijven"';
    END IF;
END $$;

-- Backup voor bedrijven (kleine letters)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bedrijven') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS backup_bedrijven_20241219 AS SELECT * FROM public.bedrijven';
        RAISE NOTICE '✅ Backup gemaakt van "bedrijven"';
    END IF;
END $$;

-- Backup voor Students (hoofdletters)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Students') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS backup_students_20241219 AS SELECT * FROM public."Students"';
        RAISE NOTICE '✅ Backup gemaakt van "Students"';
    END IF;
END $$;

-- Backup voor students (kleine letters)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS backup_students_20241219 AS SELECT * FROM public.students';
        RAISE NOTICE '✅ Backup gemaakt van "students"';
    END IF;
END $$;

-- Backup voor Attendance (hoofdletters)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Attendance') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS backup_attendance_20241219 AS SELECT * FROM public."Attendance"';
        RAISE NOTICE '✅ Backup gemaakt van "Attendance"';
    END IF;
END $$;

-- Backup voor attendance (kleine letters)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS backup_attendance_20241219 AS SELECT * FROM public.attendance';
        RAISE NOTICE '✅ Backup gemaakt van "attendance"';
    END IF;
END $$;

-- STAP 3: Verificatie - Tel records in backup tabellen
SELECT 
    'backup_stagebegeleiders_20241219' as tabel, 
    COUNT(*) as aantal 
FROM backup_stagebegeleiders_20241219
UNION ALL
SELECT 
    'backup_bedrijven_20241219' as tabel, 
    COUNT(*) as aantal 
FROM backup_bedrijven_20241219
UNION ALL
SELECT 
    'backup_students_20241219' as tabel, 
    COUNT(*) as aantal 
FROM backup_students_20241219
UNION ALL
SELECT 
    'backup_attendance_20241219' as tabel, 
    COUNT(*) as aantal 
FROM backup_attendance_20241219;

-- ✅ Als je aantallen ziet, is de backup succesvol!
