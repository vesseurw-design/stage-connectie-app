-- STAP 2: Voeg auth_user_id kolommen toe (CORRECTE VERSIE)
-- Aangepast voor de exacte tabelnamen in jouw database
-- Voer dit uit NA de backup

-- 2.1: Voeg auth_user_id kolom toe aan stagebegeleiders (kleine letters!)
ALTER TABLE public.stagebegeleiders 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2.2: Voeg auth_user_id kolom toe aan Bedrijven (hoofdletter B!)
ALTER TABLE public."Bedrijven" 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2.3: Maak indexes voor snellere lookups
CREATE INDEX IF NOT EXISTS idx_stagebegeleiders_auth_user_id 
ON public.stagebegeleiders(auth_user_id);

CREATE INDEX IF NOT EXISTS idx_bedrijven_auth_user_id 
ON public."Bedrijven"(auth_user_id);

-- Verificatie
SELECT 
    'stagebegeleiders' as tabel,
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'stagebegeleiders' 
AND column_name = 'auth_user_id'
UNION ALL
SELECT 
    'Bedrijven' as tabel,
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'Bedrijven' 
AND column_name = 'auth_user_id';

-- ✅ Als je 2 rijen ziet met 'auth_user_id' en 'uuid', is het gelukt!
