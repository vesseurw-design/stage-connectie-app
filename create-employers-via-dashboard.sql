-- Maak employer auth users via Supabase Admin API methode
-- Deze methode gebruikt de juiste Supabase functies

-- Eerst: check welke bedrijven we hebben
SELECT 
    id,
    company_name,
    contact_person,
    email
FROM public."Bedrijven"
ORDER BY company_name;

-- Dan voer je deze uit in Supabase SQL Editor:
-- Deze gebruikt auth.create_user() functie als die beschikbaar is

-- ALTERNATIEF: Maak ze 1 voor 1 via Supabase Dashboard
-- Ga naar: Authentication → Users → Add user

-- 1. Perspektief
-- Email: madelon@perspektiefacademie.nl
-- Password: WelkomPerspektief2024!
-- Auto Confirm: AAN

-- 2. GSB  
-- Email: info@gsbgrafischeafwerking.nl
-- Password: WelkomGSB2024!
-- Auto Confirm: AAN

-- 3. Activite Zuidervaart
-- Email: r.heemskerk@activite.nl
-- Password: WelkomActiviteZ2024!
-- Auto Confirm: AAN

-- 4. Activite Noorderbrink
-- Email: p.ooms@activite.nl
-- Password: WelkomActiviteN2024!
-- Auto Confirm: AAN

-- 5. Timmerfabriek Koenekoop
-- Email: info@timmerfabriekkoenekoop.nl
-- Password: WelkomTimmerfabriek2024!
-- Auto Confirm: AAN

-- 6. nagelgroothandel Korneliya
-- Email: alexvanharskamp@hotmail.com
-- Password: WelkomKorneliya2024!
-- Auto Confirm: AAN

-- NA het aanmaken via Dashboard, voer dit uit:

-- Update metadata voor alle employers
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || 
    jsonb_build_object('role', 'employer')
WHERE email IN (
    'madelon@perspektiefacademie.nl',
    'info@gsbgrafischeafwerking.nl',
    'r.heemskerk@activite.nl',
    'p.ooms@activite.nl',
    'info@timmerfabriekkoenekoop.nl',
    'alexvanharskamp@hotmail.com'
);

-- Koppel auth_user_id aan bedrijven
UPDATE public."Bedrijven" b
SET auth_user_id = u.id
FROM auth.users u
WHERE LOWER(b.email) = LOWER(u.email)
AND b.auth_user_id IS NULL;

-- Verificatie
SELECT 
    b.company_name,
    b.email,
    CASE WHEN b.auth_user_id IS NOT NULL THEN '✅' ELSE '❌' END as gekoppeld,
    u.email as auth_email
FROM public."Bedrijven" b
LEFT JOIN auth.users u ON b.auth_user_id = u.id
ORDER BY b.company_name;
