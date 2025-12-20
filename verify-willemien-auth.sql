-- Check of de auth user voor Willemien correct is aangemaakt
SELECT 
    id,
    email,
    encrypted_password IS NOT NULL as has_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at
FROM auth.users
WHERE email = 'WVs@youscope.nl';

-- Check ook de koppeling in stagebegeleiders
SELECT 
    s.id,
    s.name,
    s.email,
    s.auth_user_id,
    u.email as auth_email
FROM public.stagebegeleiders s
LEFT JOIN auth.users u ON s.auth_user_id = u.id
WHERE s.email = 'WVs@youscope.nl';
