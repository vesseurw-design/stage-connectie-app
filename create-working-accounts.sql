-- ============================================
-- WERKENDE METHODE voor Supervisor & Admin accounts
-- Gebruikt exact dezelfde structuur als employers
-- ============================================

-- Verwijder oude accounts eerst (optioneel)
DELETE FROM auth.users 
WHERE email LIKE '%@youscope.nl' 
  AND raw_user_meta_data->>'role' = 'supervisor';

-- ============================================
-- SUPERVISORS (10 accounts)
-- Password: WelkomSupervisor
-- ============================================

-- Jolanda de Graaff
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'jgk@youscope.nl', crypt('WelkomSupervisor', gen_salt('bf')), now(), jsonb_build_object('role', 'supervisor'), now(), now(), '', '', '', '');

-- Hayat el Ouakill
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'hou@youscope.nl', crypt('WelkomSupervisor', gen_salt('bf')), now(), jsonb_build_object('role', 'supervisor'), now(), now(), '', '', '', '');

-- Janneke de Ligny
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'jli@youscope.nl', crypt('WelkomSupervisor', gen_salt('bf')), now(), jsonb_build_object('role', 'supervisor'), now(), now(), '', '', '', '');

-- Karen Smook
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'ksm@youscope.nl', crypt('WelkomSupervisor', gen_salt('bf')), now(), jsonb_build_object('role', 'supervisor'), now(), now(), '', '', '', '');

-- Irene Voogd
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'ime@youscope.nl', crypt('WelkomSupervisor', gen_salt('bf')), now(), jsonb_build_object('role', 'supervisor'), now(), now(), '', '', '', '');

-- Willemien Vesseur
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'wvs@youscope.nl', crypt('WelkomSupervisor', gen_salt('bf')), now(), jsonb_build_object('role', 'supervisor'), now(), now(), '', '', '', '');

-- Sylvia Brunott
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'sbx@youscope.nl', crypt('WelkomSupervisor', gen_salt('bf')), now(), jsonb_build_object('role', 'supervisor'), now(), now(), '', '', '', '');

-- Manon Huttinga
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'mhu@youscope.nl', crypt('WelkomSupervisor', gen_salt('bf')), now(), jsonb_build_object('role', 'supervisor'), now(), now(), '', '', '', '');

-- Dick Everts
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'djev@youscope.nl', crypt('WelkomSupervisor', gen_salt('bf')), now(), jsonb_build_object('role', 'supervisor'), now(), now(), '', '', '', '');

-- Paulien van der Leun
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'pln@youscope.nl', crypt('WelkomSupervisor', gen_salt('bf')), now(), jsonb_build_object('role', 'supervisor'), now(), now(), '', '', '', '');

-- ============================================
-- ADMIN 2
-- Password: WelkomAdmin
-- ============================================

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'ksm@scopemail.nl', crypt('WelkomAdmin', gen_salt('bf')), now(), jsonb_build_object('role', 'admin'), now(), now(), '', '', '', '');

-- ============================================
-- VERIFICATIE
-- ============================================

SELECT email, raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email LIKE '%@youscope.nl' OR email LIKE '%@scopemail.nl'
ORDER BY role, email;
