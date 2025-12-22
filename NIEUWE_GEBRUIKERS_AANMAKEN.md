# Nieuwe Gebruikers Aanmaken - Handleiding
**StageConnectie - Supabase Auth**

---

## 📋 OVERZICHT

Er zijn **3 soorten gebruikers** in StageConnectie:
1. **Admins** - Volledige toegang tot admin panel
2. **Employers** (Bedrijven) - Registreren aanwezigheid
3. **Supervisors** (Stagebegeleiders) - Monitoren stages

---

## 🔐 NIEUWE GEBRUIKER AANMAKEN

### ✅ **AANBEVOLEN METHODE: Via Supabase Dashboard**

**Waarom deze methode?**
- ✅ Meest betrouwbaar
- ✅ Geen "Database error querying schema"
- ✅ Werkt altijd

**Stappen:**

#### 1. Maak User Aan
1. Ga naar **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecteer je project: **StageConnectie**
3. Ga naar **Authentication** → **Users**
4. Klik **"Add user"**
5. Vul in:
   - **Email**: bijv. `nieuw@bedrijf.nl`
   - **Password**: Laat leeg (wordt later ingesteld)
   - **Auto Confirm User**: ✅ **AAN** (belangrijk!)
6. Klik **"Create user"**

#### 2. Stel Wachtwoord + Role In (Via SQL)
1. Ga naar **SQL Editor** in Supabase
2. Voer uit:

```sql
-- Stel wachtwoord en role in
UPDATE auth.users
SET 
    encrypted_password = crypt('JouwWachtwoord2025!', gen_salt('bf')),
    raw_user_meta_data = jsonb_build_object(
        'role', 'employer',  -- of 'supervisor' of 'admin'
        'name', 'Bedrijfsnaam'
    )
WHERE email = 'nieuw@bedrijf.nl';

-- Verificatie
SELECT 
    email, 
    raw_user_meta_data->>'role' as role,
    raw_user_meta_data->>'name' as name
FROM auth.users
WHERE email = 'nieuw@bedrijf.nl';
```

#### 3. Koppel aan Database Tabel (Voor Employers/Supervisors)

**Voor Employers:**
```sql
-- Voeg bedrijf toe aan Bedrijven tabel
INSERT INTO public."Bedrijven" (
    company_name, email, phone_number, contact_person, auth_user_id
) VALUES (
    'Bedrijfsnaam',
    'nieuw@bedrijf.nl',
    '0612345678',
    'Contactpersoon',
    (SELECT id FROM auth.users WHERE email = 'nieuw@bedrijf.nl')
);
```

**Voor Supervisors:**
```sql
-- Voeg supervisor toe aan stagebegeleiders tabel
INSERT INTO public.stagebegeleiders (
    name, email, phone, whatsapp_enabled, auth_user_id
) VALUES (
    'Naam Begeleider',
    'begeleider@school.nl',
    '0612345678',
    true,
    (SELECT id FROM auth.users WHERE email = 'begeleider@school.nl')
);
```

---

## ⚠️ NIET AANBEVOLEN: Via SQL INSERT

**Waarom niet?**
- ❌ Geeft vaak "Database error querying schema"
- ❌ Mist interne Supabase configuratie
- ❌ Identities worden niet altijd correct aangemaakt

**Als je het toch doet:**
```sql
-- Gebruik alleen als Dashboard niet werkt!
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'email@example.nl',
    crypt('Wachtwoord2025!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"employer","name":"Naam"}'::jsonb,
    NOW(), NOW()
);

-- Maak identity (BELANGRIJK!)
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
WHERE u.email = 'email@example.nl'
AND NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
);
```

---

## 🔧 TROUBLESHOOTING

### Probleem: "Database error querying schema"

**Oorzaak:** User is via SQL INSERT gemaakt zonder correcte identities

**Oplossing:**
1. Verwijder de user:
```sql
DELETE FROM auth.identities WHERE user_id = (SELECT id FROM auth.users WHERE email = 'email@example.nl');
DELETE FROM auth.users WHERE email = 'email@example.nl';
```

2. Maak opnieuw aan via **Dashboard** (zie boven)

---

### Probleem: "Dit account is geen [role] account"

**Oorzaak:** `raw_user_meta_data` mist de `role` property

**Oplossing:**
```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || 
    jsonb_build_object('role', 'employer')  -- of 'supervisor' of 'admin'
WHERE email = 'email@example.nl';
```

---

### Probleem: User kan niet inloggen (verkeerd wachtwoord)

**Oplossing: Reset wachtwoord**
```sql
UPDATE auth.users
SET encrypted_password = crypt('NieuwWachtwoord2025!', gen_salt('bf'))
WHERE email = 'email@example.nl';
```

---

## 📊 VERIFICATIE QUERIES

**Check of user correct is aangemaakt:**
```sql
-- Check auth user
SELECT 
    email,
    raw_user_meta_data->>'role' as role,
    raw_user_meta_data->>'name' as name,
    email_confirmed_at IS NOT NULL as confirmed,
    encrypted_password IS NOT NULL as has_password
FROM auth.users
WHERE email = 'email@example.nl';

-- Check identity (moet 1 zijn!)
SELECT COUNT(*) as identity_count
FROM auth.identities
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'email@example.nl');

-- Check koppeling (voor employers)
SELECT 
    b.company_name,
    b.email,
    b.auth_user_id IS NOT NULL as linked
FROM public."Bedrijven" b
WHERE b.email = 'email@example.nl';
```

---

## 📝 ROLES OVERZICHT

| Role | Login URL | Toegang |
|------|-----------|---------|
| `admin` | `/admin-login.html` | Admin panel, alle data |
| `employer` | `/login.html` | Employer portal, eigen studenten |
| `supervisor` | `/supervisor-login.html` | Supervisor portal, eigen studenten |

---

## 🔒 WACHTWOORD REQUIREMENTS

**Minimale eisen:**
- Minimaal 8 karakters
- Minimaal 1 hoofdletter
- Minimaal 1 cijfer
- Minimaal 1 speciaal teken (!, @, #, etc.)

**Aanbevolen format:**
- `WelkomBedrijf2025!`
- `AdminNaam2025!`
- `SupervisorNaam2025!`

---

## 📧 BULK IMPORT (Meerdere Users Tegelijk)

**Voor grote aantallen (>10 users):**

1. **Maak CSV bestand:**
```csv
email,name,role,password
bedrijf1@example.nl,Bedrijf 1,employer,Welkom2025!
bedrijf2@example.nl,Bedrijf 2,employer,Welkom2025!
```

2. **Gebruik dit SQL script:**
```sql
-- Voorbeeld voor bulk import
-- Pas aan naar jouw CSV data

DO $$
DECLARE
    user_email TEXT;
    user_name TEXT;
    user_role TEXT;
    user_password TEXT;
BEGIN
    -- Herhaal voor elke user
    FOR user_email, user_name, user_role, user_password IN
        VALUES 
            ('bedrijf1@example.nl', 'Bedrijf 1', 'employer', 'Welkom2025!'),
            ('bedrijf2@example.nl', 'Bedrijf 2', 'employer', 'Welkom2025!')
    LOOP
        -- Maak user aan via Dashboard, dan:
        UPDATE auth.users
        SET 
            encrypted_password = crypt(user_password, gen_salt('bf')),
            raw_user_meta_data = jsonb_build_object('role', user_role, 'name', user_name)
        WHERE email = user_email;
    END LOOP;
END $$;
```

**Maar beter: Maak users 1-voor-1 via Dashboard voor betrouwbaarheid!**

---

## ✅ CHECKLIST NIEUWE USER

- [ ] User aangemaakt via Supabase Dashboard
- [ ] Auto Confirm User: AAN
- [ ] Wachtwoord ingesteld via SQL
- [ ] Role ingesteld in `raw_user_meta_data`
- [ ] Identity bestaat (check met SQL)
- [ ] Gekoppeld aan database tabel (Bedrijven/stagebegeleiders)
- [ ] Login getest
- [ ] Credentials gedocumenteerd

---

## 🆘 HULP NODIG?

**Check deze bestanden:**
- `SUPERVISOR_LOGIN_CREDENTIALS.md` - Voorbeeld supervisor setup
- `EMPLOYER_LOGIN_CREDENTIALS.md` - Voorbeeld employer setup
- `create-employers-via-dashboard.sql` - Voorbeeld SQL scripts

**Of neem contact op met de ontwikkelaar!**

---

**Versie:** 1.0  
**Datum:** December 2025  
**Laatst bijgewerkt:** 22 december 2025
