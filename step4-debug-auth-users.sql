-- STAP 4: Maak Auth Users - SIMPELE VERSIE
-- Deze versie maakt 1 voor 1 auth users aan en toont duidelijk wat er gebeurt

-- EERST: Check hoeveel stagebegeleiders er zijn
SELECT 
    COUNT(*) as totaal_stagebegeleiders,
    COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as met_email,
    COUNT(CASE WHEN auth_user_id IS NOT NULL THEN 1 END) as al_gemigreerd
FROM public.stagebegeleiders;

-- Toon alle stagebegeleiders die nog gemigreerd moeten worden
SELECT 
    id,
    name,
    email,
    auth_user_id
FROM public.stagebegeleiders
WHERE email IS NOT NULL
AND auth_user_id IS NULL
ORDER BY name;

-- ⚠️ STOP HIER - Controleer de output hierboven
-- Zie je de stagebegeleiders die gemigreerd moeten worden?
-- Zo ja, voer dan het onderstaande script uit (verwijder de -- voor elke regel)

/*
-- Maak auth user aan voor EERSTE stagebegeleider (TEST)
DO $$
DECLARE
    v_supervisor_id UUID;
    v_email TEXT;
    v_name TEXT;
    v_new_user_id UUID;
BEGIN
    -- Haal eerste stagebegeleider op
    SELECT id, email, name 
    INTO v_supervisor_id, v_email, v_name
    FROM public.stagebegeleiders
    WHERE email IS NOT NULL 
    AND auth_user_id IS NULL
    LIMIT 1;
    
    RAISE NOTICE 'Migreren: % (%) - ID: %', v_name, v_email, v_supervisor_id;
    
    -- Maak auth user
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        v_email,
        crypt('TempPass2024!', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"],"role":"supervisor"}'::jsonb,
        jsonb_build_object('name', v_name, 'supervisor_id', v_supervisor_id, 'role', 'supervisor'),
        NOW(),
        NOW()
    ) RETURNING id INTO v_new_user_id;
    
    RAISE NOTICE 'Auth user aangemaakt: %', v_new_user_id;
    
    -- Koppel aan stagebegeleider
    UPDATE public.stagebegeleiders
    SET auth_user_id = v_new_user_id
    WHERE id = v_supervisor_id;
    
    RAISE NOTICE '✅ Gekoppeld!';
END $$;

-- Verificatie
SELECT 
    s.name,
    s.email,
    s.auth_user_id,
    u.email as auth_email,
    u.created_at
FROM public.stagebegeleiders s
LEFT JOIN auth.users u ON s.auth_user_id = u.id
WHERE s.email IS NOT NULL
ORDER BY s.name;
*/
