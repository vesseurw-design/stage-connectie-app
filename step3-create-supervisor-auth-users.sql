-- STAP 3: Maak Auth Users voor Stagebegeleiders (CORRECTE VERSIE)
-- Tabelnaam: stagebegeleiders (kleine letters)

DO $$
DECLARE
    supervisor_record RECORD;
    new_user_id UUID;
    temp_password TEXT := 'TempPass2024!';
    success_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🚀 Start migratie van stagebegeleiders naar Supabase Auth...';
    
    FOR supervisor_record IN 
        SELECT id, email, name 
        FROM public.stagebegeleiders
        WHERE auth_user_id IS NULL
        AND email IS NOT NULL
    LOOP
        BEGIN
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
                updated_at,
                confirmation_token,
                email_change,
                email_change_token_new,
                recovery_token
            ) VALUES (
                '00000000-0000-0000-0000-000000000000',
                gen_random_uuid(),
                'authenticated',
                'authenticated',
                supervisor_record.email,
                crypt(temp_password, gen_salt('bf')),
                NOW(),
                jsonb_build_object(
                    'provider', 'email',
                    'providers', ARRAY['email'],
                    'role', 'supervisor'
                ),
                jsonb_build_object(
                    'name', supervisor_record.name,
                    'supervisor_id', supervisor_record.id,
                    'role', 'supervisor'
                ),
                NOW(),
                NOW(),
                '',
                '',
                '',
                ''
            ) RETURNING id INTO new_user_id;
            
            UPDATE public.stagebegeleiders 
            SET auth_user_id = new_user_id 
            WHERE id = supervisor_record.id;
            
            success_count := success_count + 1;
            RAISE NOTICE '✅ [%] Auth user aangemaakt voor: % (ID: %)', 
                success_count, 
                supervisor_record.email, 
                new_user_id;
            
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            RAISE NOTICE '❌ Fout bij %: %', supervisor_record.email, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '✅ Migratie voltooid! Succesvol: %, Fouten: %', success_count, error_count;
END $$;

-- Verificatie
SELECT 
    COUNT(*) as totaal,
    COUNT(auth_user_id) as met_auth,
    COUNT(*) - COUNT(auth_user_id) as zonder_auth
FROM public.stagebegeleiders
WHERE email IS NOT NULL;

-- Details
SELECT 
    id,
    name,
    email,
    CASE 
        WHEN auth_user_id IS NOT NULL THEN '✅ Gemigreerd'
        ELSE '❌ Nog niet'
    END as status
FROM public.stagebegeleiders
WHERE email IS NOT NULL
ORDER BY name;
