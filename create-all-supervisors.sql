-- Maak auth users voor alle 9 resterende supervisors
-- Voer dit uit in Supabase SQL Editor

-- Verwijder eerst eventuele bestaande users (behalve Willemien en test users)
DELETE FROM auth.users 
WHERE email IN (
    'djev@youscope.nl', 'hou@youscope.nl', 'ime@youscope.nl',
    'jli@youscope.nl', 'jgk@youscope.nl', 'ksm@youscope.nl',
    'mhu@youscope.nl', 'pln@youscope.nl', 'sbx@youscope.nl'
);

-- 1. Dick Everts
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'djev@youscope.nl',
    crypt('WelkomDick2024!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"supervisor","name":"Dick Everts","supervisor_id":"db85af4e-93d9-430d-8c3a-51c35ba143a4"}'::jsonb,
    NOW(), NOW()
);

-- 2. Hayat el Ouakill
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'hou@youscope.nl',
    crypt('WelkomHayat2024!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"supervisor","name":"Hayat el Ouakill","supervisor_id":"52fa5cbd-c1f0-428c-9d98-b45b29a9e53a"}'::jsonb,
    NOW(), NOW()
);

-- 3. Irene Voogd
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'ime@youscope.nl',
    crypt('WelkomIrene2024!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"supervisor","name":"Irene Voogd","supervisor_id":"786921ef-4fc7-40d2-887d-a35d5aa8b9e7"}'::jsonb,
    NOW(), NOW()
);

-- 4. Janneke de Ligny
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'jli@youscope.nl',
    crypt('WelkomJanneke2024!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"supervisor","name":"Janneke de Ligny","supervisor_id":"68f85363-6f51-4f4f-aeda-96b141a0160e"}'::jsonb,
    NOW(), NOW()
);

-- 5. Jolanda de Graaff
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'jgk@youscope.nl',
    crypt('WelkomJolanda2024!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"supervisor","name":"Jolanda de Graaff","supervisor_id":"22368603-747d-4e41-ae0e-bef4ffe7cb35"}'::jsonb,
    NOW(), NOW()
);

-- 6. Karen Smook
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'ksm@youscope.nl',
    crypt('WelkomKaren2024!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"supervisor","name":"Karen Smook","supervisor_id":"751d59ad-49d1-45e7-9756-5ca5b32a9227"}'::jsonb,
    NOW(), NOW()
);

-- 7. Manon Huttinga
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'mhu@youscope.nl',
    crypt('WelkomManon2024!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"supervisor","name":"Manon Huttinga","supervisor_id":"ac10541e-5a79-4010-84cb-566299dfa87f"}'::jsonb,
    NOW(), NOW()
);

-- 8. Paulien van der Leun
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'pln@youscope.nl',
    crypt('WelkomPaulien2024!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"supervisor","name":"Paulien van der Leun","supervisor_id":"f5209782-c02f-4c68-a5f5-f3cde4251818"}'::jsonb,
    NOW(), NOW()
);

-- 9. Sylvia Brunott
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'sbx@youscope.nl',
    crypt('WelkomSylvia2024!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"supervisor","name":"Sylvia Brunott","supervisor_id":"ab8ef69d-ef8e-49a0-b63e-4bbec7f4e834"}'::jsonb,
    NOW(), NOW()
);

-- Maak identities voor alle nieuwe users
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
WHERE u.email LIKE '%@youscope.nl'
AND NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
);

-- Koppel auth_user_id aan stagebegeleiders
UPDATE public.stagebegeleiders s
SET auth_user_id = u.id
FROM auth.users u
WHERE LOWER(s.email) = LOWER(u.email)
AND s.auth_user_id IS NULL;

-- Verificatie: Toon alle supervisors met hun auth status
SELECT 
    s.name,
    s.email,
    CASE WHEN s.auth_user_id IS NOT NULL THEN '✅ Gemigreerd' ELSE '❌ Nog niet' END as status,
    u.email as auth_email
FROM public.stagebegeleiders s
LEFT JOIN auth.users u ON s.auth_user_id = u.id
ORDER BY s.name;
