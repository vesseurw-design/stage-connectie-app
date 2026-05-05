-- =========================================================================
-- JOUW STANDAARD SCRIPT OM ÉÉN OF MEERDERE STUDENTEN TOE TE VOEGEN
-- =========================================================================

DO $$
DECLARE
    student record;
    new_user_id uuid;
BEGIN
    -- VUL HIERONDER DE LEERLINGEN IN:
    -- Formaat: ('Naam', 'Email', 'Wachtwoord', 'Studentnummer')
    -- Let op de komma op het einde van elke regel, behalve bij de allerlaatste regel.
    FOR student IN (
        SELECT * FROM (VALUES
            ('NAAM VAN STUDENT 1', 'MAILADRES1@STUDENT.NL', 'WACHTWOORD123!', 'STUDENTNUMMER 1')
            -- ('NAAM VAN STUDENT 2', 'MAILADRES2@STUDENT.NL', 'WACHTWOORD123!', 'STUDENTNUMMER 2')
        ) AS t(naam, email, wachtwoord, student_nummer)
    )
    LOOP
        -- (GEEN AANPASSINGEN NODIG ONDER DEZE LIJN)
        
        -- Controleer of de user al bestaat om dubbele fouten te voorkomen
        IF EXISTS (SELECT 1 FROM auth.users WHERE email = student.email) THEN
            RAISE NOTICE 'Skipping: Gebruiker met e-mailadres % bestaat al!', student.email;
            CONTINUE; -- Sla deze over en ga door naar de volgende
        END IF;

        new_user_id := gen_random_uuid();

        -- 1. Maak de auth user aan in Supabase
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            new_user_id, 'authenticated', 'authenticated', student.email,
            crypt(student.wachtwoord, gen_salt('bf')),
            now(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            jsonb_build_object('role', 'student', 'name', student.naam),
            now(), now()
        );

        -- 2. Maak de identity aan
        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, provider_id,
            last_sign_in_at, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), new_user_id,
            jsonb_build_object('sub', new_user_id::text, 'email', student.email),
            'email', new_user_id::text,
            now(), now(), now()
        );

        -- 3. Voeg de leerling toe aan de Students tabel binnen de app
        INSERT INTO public."Students" (
            name,
            email,
            student_number
        ) VALUES (
            student.naam,
            student.email,
            student.student_nummer
        );
        
        RAISE NOTICE 'Student % succesvol toegevoegd!', student.naam;
    END LOOP;
END $$;
