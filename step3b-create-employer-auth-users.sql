-- STAP 3B: Maak Auth Users voor Bedrijven (CORRECTE VERSIE)
-- Tabelnaam: Bedrijven (hoofdletter B!)

DO $$
DECLARE
    company_record RECORD;
    new_user_id UUID;
    temp_password TEXT := 'TempPass2024!';
    success_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🚀 Start migratie van Bedrijven naar Supabase Auth...';
    
    FOR company_record IN 
        SELECT id, email, company_name 
        FROM public."Bedrijven"
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
                company_record.email,
                crypt(temp_password, gen_salt('bf')),
                NOW(),
                jsonb_build_object(
                    'provider', 'email',
                    'providers', ARRAY['email'],
                    'role', 'employer'
                ),
                jsonb_build_object(
                    'company_name', company_record.company_name,
                    'company_id', company_record.id,
                    'role', 'employer'
                ),
                NOW(),
                NOW(),
                '',
                '',
                '',
                ''
            ) RETURNING id INTO new_user_id;
            
            UPDATE public."Bedrijven" 
            SET auth_user_id = new_user_id 
            WHERE id = company_record.id;
            
            success_count := success_count + 1;
            RAISE NOTICE '✅ [%] Auth user aangemaakt voor: % (Bedrijf: %)', 
                success_count,
                company_record.email,
                company_record.company_name;
            
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            RAISE NOTICE '❌ Fout bij %: %', company_record.email, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '✅ Migratie voltooid! Succesvol: %, Fouten: %', success_count, error_count;
END $$;

-- Verificatie
SELECT 
    COUNT(*) as totaal,
    COUNT(auth_user_id) as met_auth,
    COUNT(*) - COUNT(auth_user_id) as zonder_auth
FROM public."Bedrijven"
WHERE email IS NOT NULL;

-- Details
SELECT 
    id,
    company_name,
    email,
    CASE 
        WHEN auth_user_id IS NOT NULL THEN '✅ Gemigreerd'
        ELSE '❌ Nog niet'
    END as status
FROM public."Bedrijven"
WHERE email IS NOT NULL
ORDER BY company_name;
