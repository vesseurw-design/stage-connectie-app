-- Voeg branche kolom toe aan Bedrijven tabel
-- Datum: 23 december 2025

-- Stap 1: Voeg branche kolom toe
ALTER TABLE public."Bedrijven" 
ADD COLUMN IF NOT EXISTS branche TEXT;

-- Stap 2: Voeg custom_branche kolom toe (voor zelf te labelen branches)
ALTER TABLE public."Bedrijven" 
ADD COLUMN IF NOT EXISTS custom_branche TEXT;

-- Stap 3: Maak een tabel voor branche opties
CREATE TABLE IF NOT EXISTS public."Branches" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    is_custom BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stap 4: Voeg standaard branches toe
INSERT INTO public."Branches" (name, is_custom) VALUES
    ('Zorg & Welzijn', false),
    ('Horeca', false),
    ('Retail', false),
    ('ICT & Technologie', false),
    ('Bouw & Constructie', false),
    ('Techniek', false),
    ('Administratie & Kantoor', false),
    ('Sport & Recreatie', false),
    ('Agrarisch', false),
    ('Overig', false)
ON CONFLICT (name) DO NOTHING;

-- Stap 5: Voeg 5 custom branch slots toe (kunnen later worden ingevuld)
INSERT INTO public."Branches" (name, is_custom) VALUES
    ('Custom 1', true),
    ('Custom 2', true),
    ('Custom 3', true),
    ('Custom 4', true),
    ('Custom 5', true)
ON CONFLICT (name) DO NOTHING;

-- Stap 6: Maak een view voor actieve branches
CREATE OR REPLACE VIEW public."ActiveBranches" AS
SELECT 
    id,
    name,
    is_custom,
    CASE 
        WHEN is_custom AND name LIKE 'Custom %' THEN false
        ELSE true
    END as is_active
FROM public."Branches"
ORDER BY is_custom, name;

-- Verificatie
SELECT * FROM public."Branches" ORDER BY is_custom, name;

-- Check hoeveel bedrijven er zijn
SELECT COUNT(*) as total_bedrijven FROM public."Bedrijven";

-- Check welke bedrijven nog geen branche hebben
SELECT company_name, email 
FROM public."Bedrijven" 
WHERE branche IS NULL;
