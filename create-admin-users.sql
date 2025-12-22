-- Maak 2 Admin Accounts aan
-- Datum: 22 december 2025

-- Admin 1: Willemien Vesseur
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'wvs@scopemail.nl',
    crypt('AdminWVS2025!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"admin","name":"Willemien Vesseur"}'::jsonb,
    NOW(), NOW()
);

-- Admin 2: KSM
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'ksm@scopemail.nl',
    crypt('AdminKSM2025!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"admin","name":"KSM"}'::jsonb,
    NOW(), NOW()
);

-- Maak identities voor beide admins
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
WHERE u.email IN ('wvs@scopemail.nl', 'ksm@scopemail.nl')
AND NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
);

-- Verificatie
SELECT 
    email,
    raw_user_meta_data->>'role' as role,
    raw_user_meta_data->>'name' as name,
    email_confirmed_at IS NOT NULL as confirmed
FROM auth.users
WHERE email IN ('wvs@scopemail.nl', 'ksm@scopemail.nl')
ORDER BY email;
