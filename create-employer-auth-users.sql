-- Maak auth users voor alle 6 bedrijven
-- Gegenereerd op: 20 december 2024

-- 1. Perspektief
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'madelon@perspektiefacademie.nl',
    crypt('WelkomPerspektief2024!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"employer","company_name":"Perspektief","contact_person":"Madelon Jautze"}'::jsonb,
    NOW(), NOW()
);

-- 2. GSB
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'info@gsbgrafischeafwerking.nl',
    crypt('WelkomGSB2024!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"employer","company_name":"GSB","contact_person":"Mathijs Broer"}'::jsonb,
    NOW(), NOW()
);

-- 3. Activite Zuidervaart
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'r.heemskerk@activite.nl',
    crypt('WelkomActiviteZ2024!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"employer","company_name":"Activite Zuidervaart","contact_person":"Rineke Heemskerk"}'::jsonb,
    NOW(), NOW()
);

-- 4. Activite Noorderbrink
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'p.ooms@activite.nl',
    crypt('WelkomActiviteN2024!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"employer","company_name":"Activite Noorderbrink","contact_person":"Petra Ooms"}'::jsonb,
    NOW(), NOW()
);

-- 5. Timmerfabriek Koenekoop
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'info@timmerfabriekkoenekoop.nl',
    crypt('WelkomTimmerfabriek2024!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"employer","company_name":"Timmerfabriek Koenekoop","contact_person":"Mart Koenekoop"}'::jsonb,
    NOW(), NOW()
);

-- 6. nagelgroothandel Korneliya
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'alexvanharskamp@hotmail.com',
    crypt('WelkomKorneliya2024!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"employer","company_name":"nagelgroothandel Korneliya","contact_person":"Alex van Harskamp"}'::jsonb,
    NOW(), NOW()
);

-- Maak identities voor alle bedrijven
INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
)
SELECT 
    gen_random_uuid(),
    u.id,
    jsonb_build_object('sub', u.id::text, 'email', u.email),
    'email',
    u.id::text,
    NOW(), NOW(), NOW()
FROM auth.users u
WHERE u.raw_user_meta_data->>'role' = 'employer'
AND NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
);

-- Koppel auth_user_id aan bedrijven
UPDATE public."Bedrijven" b
SET auth_user_id = u.id
FROM auth.users u
WHERE LOWER(b.email) = LOWER(u.email)
AND b.auth_user_id IS NULL;

-- Verificatie: Toon alle bedrijven met hun auth status
SELECT 
    b.company_name,
    b.contact_person,
    b.email,
    CASE WHEN b.auth_user_id IS NOT NULL THEN '✅ Gemigreerd' ELSE '❌ Nog niet' END as status,
    u.email as auth_email
FROM public."Bedrijven" b
LEFT JOIN auth.users u ON b.auth_user_id = u.id
ORDER BY b.company_name;
