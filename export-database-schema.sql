-- ============================================
-- SUPABASE DATABASE SCHEMA EXPORT
-- Voor migratie naar EU region
-- ============================================

-- Dit script exporteert het volledige database schema
-- Voer dit uit in je HUIDIGE (Canada) Supabase project

-- ============================================
-- STAP 1: Export Table Schemas
-- ============================================

-- Students table
SELECT 
    'CREATE TABLE IF NOT EXISTS public."Students" (' ||
    string_agg(
        column_name || ' ' || 
        CASE 
            WHEN data_type = 'ARRAY' THEN udt_name || '[]'
            WHEN data_type = 'USER-DEFINED' THEN udt_name
            ELSE data_type 
        END ||
        CASE 
            WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')'
            WHEN data_type = 'uuid' THEN ''
            ELSE ''
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
        ', ' ORDER BY ordinal_position
    ) || 
    ', PRIMARY KEY (id));' as create_statement
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'Students'
GROUP BY table_name;

-- Bedrijven table
SELECT 
    'CREATE TABLE IF NOT EXISTS public."Bedrijven" (' ||
    string_agg(
        column_name || ' ' || 
        CASE 
            WHEN data_type = 'ARRAY' THEN udt_name || '[]'
            WHEN data_type = 'USER-DEFINED' THEN udt_name
            ELSE data_type 
        END ||
        CASE 
            WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')'
            ELSE ''
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
        ', ' ORDER BY ordinal_position
    ) || 
    ', PRIMARY KEY (id));' as create_statement
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'Bedrijven'
GROUP BY table_name;

-- stagebegeleiders table
SELECT 
    'CREATE TABLE IF NOT EXISTS public.stagebegeleiders (' ||
    string_agg(
        column_name || ' ' || 
        CASE 
            WHEN data_type = 'ARRAY' THEN udt_name || '[]'
            WHEN data_type = 'USER-DEFINED' THEN udt_name
            ELSE data_type 
        END ||
        CASE 
            WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')'
            ELSE ''
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
        ', ' ORDER BY ordinal_position
    ) || 
    ', PRIMARY KEY (id));' as create_statement
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'stagebegeleiders'
GROUP BY table_name;

-- Attendance table
SELECT 
    'CREATE TABLE IF NOT EXISTS public."Attendance" (' ||
    string_agg(
        column_name || ' ' || 
        CASE 
            WHEN data_type = 'ARRAY' THEN udt_name || '[]'
            WHEN data_type = 'USER-DEFINED' THEN udt_name
            ELSE data_type 
        END ||
        CASE 
            WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')'
            ELSE ''
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
        ', ' ORDER BY ordinal_position
    ) || 
    ', PRIMARY KEY (id), UNIQUE(student_id, date));' as create_statement
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'Attendance'
GROUP BY table_name;

-- Branches table (if exists)
SELECT 
    'CREATE TABLE IF NOT EXISTS public."Branches" (' ||
    string_agg(
        column_name || ' ' || 
        CASE 
            WHEN data_type = 'ARRAY' THEN udt_name || '[]'
            WHEN data_type = 'USER-DEFINED' THEN udt_name
            ELSE data_type 
        END ||
        CASE 
            WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')'
            ELSE ''
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
        ', ' ORDER BY ordinal_position
    ) || 
    ', PRIMARY KEY (id));' as create_statement
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'Branches'
GROUP BY table_name;

-- ============================================
-- STAP 2: Export Data as CSV
-- ============================================

-- Kopieer de output van onderstaande queries en sla op als CSV bestanden

-- Students data
COPY (SELECT * FROM public."Students" ORDER BY id) TO STDOUT WITH CSV HEADER;

-- Bedrijven data  
COPY (SELECT * FROM public."Bedrijven" ORDER BY id) TO STDOUT WITH CSV HEADER;

-- stagebegeleiders data
COPY (SELECT * FROM public.stagebegeleiders ORDER BY id) TO STDOUT WITH CSV HEADER;

-- Branches data (if exists)
COPY (SELECT * FROM public."Branches" ORDER BY id) TO STDOUT WITH CSV HEADER;

-- ============================================
-- STAP 3: Export Foreign Key Constraints
-- ============================================

SELECT
    'ALTER TABLE ' || quote_ident(tc.table_name) || 
    ' ADD CONSTRAINT ' || quote_ident(tc.constraint_name) ||
    ' FOREIGN KEY (' || string_agg(quote_ident(kcu.column_name), ', ') || ')' ||
    ' REFERENCES ' || quote_ident(ccu.table_name) ||
    ' (' || string_agg(quote_ident(ccu.column_name), ', ') || ')' ||
    CASE 
        WHEN rc.delete_rule = 'CASCADE' THEN ' ON DELETE CASCADE'
        WHEN rc.delete_rule = 'SET NULL' THEN ' ON DELETE SET NULL'
        ELSE ''
    END || ';' as add_constraint
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
GROUP BY tc.table_name, tc.constraint_name, ccu.table_name, rc.delete_rule;

-- ============================================
-- NOTITIES
-- ============================================

-- 1. Voer eerst alle CREATE TABLE statements uit in het nieuwe EU project
-- 2. Importeer dan de CSV data via Table Editor
-- 3. Voer daarna de Foreign Key constraints uit
-- 4. Configureer RLS policies (zie setup-rls-policies-eu.sql)
