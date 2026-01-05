-- ============================================
-- CREATE SUPERVISOR AND ADMIN ACCOUNTS
-- Voor EU Supabase project
-- ============================================

-- ============================================
-- SUPERVISORS (10 accounts)
-- Password format: Stage[Naam]
-- ============================================

-- Jolanda de Graaff
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
    'authenticated', 'authenticated', 'jgk@youscope.nl',
    crypt('StageJolandadeGraaff', gen_salt('bf')),
    now(), '{"role": "supervisor"}'::jsonb, now(), now()
);

-- Hayat el Ouakill
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
    'authenticated', 'authenticated', 'hou@youscope.nl',
    crypt('StageHayatelOuakill', gen_salt('bf')),
    now(), '{"role": "supervisor"}'::jsonb, now(), now()
);

-- Janneke de Ligny
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
    'authenticated', 'authenticated', 'jli@youscope.nl',
    crypt('StageJannekedeligny', gen_salt('bf')),
    now(), '{"role": "supervisor"}'::jsonb, now(), now()
);

-- Karen Smook
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
    'authenticated', 'authenticated', 'ksm@youscope.nl',
    crypt('StageKarenSmook', gen_salt('bf')),
    now(), '{"role": "supervisor"}'::jsonb, now(), now()
);

-- Irene Voogd
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
    'authenticated', 'authenticated', 'ime@youscope.nl',
    crypt('StageIreneVoogd', gen_salt('bf')),
    now(), '{"role": "supervisor"}'::jsonb, now(), now()
);

-- Willemien Vesseur
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
    'authenticated', 'authenticated', 'wvs@youscope.nl',
    crypt('StageWillemienVesseur', gen_salt('bf')),
    now(), '{"role": "supervisor"}'::jsonb, now(), now()
);

-- Sylvia Brunott
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
    'authenticated', 'authenticated', 'sbx@youscope.nl',
    crypt('StageSylviaBrunott', gen_salt('bf')),
    now(), '{"role": "supervisor"}'::jsonb, now(), now()
);

-- Manon Huttinga
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
    'authenticated', 'authenticated', 'mhu@youscope.nl',
    crypt('StageManonHuttinga', gen_salt('bf')),
    now(), '{"role": "supervisor"}'::jsonb, now(), now()
);

-- Dick Everts
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
    'authenticated', 'authenticated', 'djev@youscope.nl',
    crypt('StageDickEverts', gen_salt('bf')),
    now(), '{"role": "supervisor"}'::jsonb, now(), now()
);

-- Paulien van der Leun
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
    'authenticated', 'authenticated', 'pln@youscope.nl',
    crypt('StagePaulienvanderLeun', gen_salt('bf')),
    now(), '{"role": "supervisor"}'::jsonb, now(), now()
);

-- ============================================
-- ADMIN ACCOUNT
-- Password: AdminStage2026!
-- ============================================

-- Admin account (VERVANG EMAIL EN WACHTWOORD!)
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
    'authenticated', 'authenticated', 'admin@youscope.nl',  -- ← VERVANG
    crypt('AdminStage2026!', gen_salt('bf')),  -- ← VERVANG
    now(), '{"role": "admin"}'::jsonb, now(), now()
);

-- ============================================
-- VERIFICATION
-- ============================================

-- Check alle nieuwe accounts
SELECT email, raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email LIKE '%@youscope.nl'
ORDER BY role, email;
