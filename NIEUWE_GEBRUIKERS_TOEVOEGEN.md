# 📝 Nieuwe Gebruikers Toevoegen

## 🏢 Nieuw Bedrijf Toevoegen

### Stap 1: Voeg bedrijf toe aan Bedrijven tabel
```sql
INSERT INTO public."Bedrijven" (company_name, email, phone, address, branche)
VALUES (
    'Bedrijfsnaam',           -- ← Vervang
    'info@bedrijf.nl',        -- ← Vervang
    '+31612345678',           -- ← Vervang (optioneel)
    'Straat 123, Plaats',     -- ← Vervang (optioneel)
    'ICT & Technologie'       -- ← Vervang (optioneel)
);
```

### Stap 2: Maak auth account
```sql
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'info@bedrijf.nl',                    -- ← Zelfde email als hierboven
    crypt('WelkomBedrijfsnaam', gen_salt('bf')),  -- ← Wachtwoord
    now(),
    jsonb_build_object('role', 'employer'),
    now(),
    now(),
    '', '', '', ''
);
```

---

## 👨‍🏫 Nieuwe Supervisor Toevoegen

### Stap 1: Voeg supervisor toe aan stagebegeleiders tabel
```sql
INSERT INTO public.stagebegeleiders (name, email, phone, whatsapp_enabled)
VALUES (
    'Naam Achternaam',        -- ← Vervang
    'naam@youscope.nl',       -- ← Vervang
    '+31612345678',           -- ← Vervang (optioneel)
    true                      -- ← true/false voor WhatsApp
);
```

### Stap 2: Maak auth account EN link supervisor_id
```sql
-- Eerst auth account maken
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'naam@youscope.nl',                   -- ← Zelfde email
    crypt('WelkomStagebegeleider', gen_salt('bf')),
    now(),
    jsonb_build_object('role', 'supervisor'),  -- ← Tijdelijk zonder supervisor_id
    now(),
    now(),
    '', '', '', ''
);

-- Dan supervisor_id toevoegen aan metadata
UPDATE auth.users au
SET raw_user_meta_data = jsonb_build_object(
    'role', 'supervisor',
    'supervisor_id', s.id
)
FROM public.stagebegeleiders s
WHERE au.email = s.email
  AND au.email = 'naam@youscope.nl';      -- ← Zelfde email
```

---

## 👤 Nieuwe Admin Toevoegen

```sql
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@school.nl',                    -- ← Vervang
    crypt('WelkomAdmin', gen_salt('bf')),
    now(),
    jsonb_build_object('role', 'admin'),
    now(),
    now(),
    '', '', '', ''
);
```

---

## 🔑 Standaard Wachtwoorden

- **Bedrijven**: `Welkom[BedrijfsNaam]` (zonder spaties)
- **Supervisors**: `WelkomStagebegeleider`
- **Admins**: `WelkomAdmin`

**Gebruikers kunnen hun wachtwoord later wijzigen via "Wachtwoord vergeten"!**

---

## 📋 Checklist voor nieuwe gebruiker:

- [ ] Voeg toe aan data tabel (Bedrijven/stagebegeleiders)
- [ ] Maak auth account
- [ ] Voor supervisors: Link supervisor_id in metadata
- [ ] Test login
- [ ] Stuur gebruiker het tijdelijke wachtwoord

---

*Bewaar dit bestand als referentie!*
