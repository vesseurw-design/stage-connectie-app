# 📋 TODO voor morgen - Admin Account Aanmaken

## 🎯 Doel
Admin account aanmaken in EU Supabase zodat je kunt inloggen op de admin portal.

---

## ✅ Wat al werkt:
- ✅ Database in EU (Ierland)
- ✅ Bedrijven kunnen inloggen
- ✅ Code is geüpdatet

## ⏳ Wat nog moet:
- ❌ Admin account aanmaken
- ❌ Supervisor accounts aanmaken

---

## 🔧 Methode 1: Via Supabase Dashboard (Probeer dit eerst)

### Stap 1: Maak user aan
1. Ga naar: https://supabase.com/dashboard
2. Klik op project: `vdeipnqyesduiohxvuvu`
3. Ga naar: **Authentication** → **Users**
4. Klik op **"Add user"** dropdown → **"Create new user"**
5. Vul in:
   - Email: jouw admin email
   - Password: kies een sterk wachtwoord
   - ✅ Auto Confirm User: AAN
6. Klik "Create"

### Stap 2: Voeg admin role toe
1. Klik op de nieuwe user in de lijst
2. Zoek naar **"User Metadata"** of **"Raw User Meta Data"**
3. Klik op edit (potlood icoon)
4. Voeg toe: `{"role": "admin"}`
5. Save

---

## 🔧 Methode 2: Via SQL (Als methode 1 niet werkt)

Ga naar SQL Editor en voer uit:

```sql
-- Simpele versie (probeer dit eerst)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@youscope.nl',  -- ← VERVANG
    crypt('AdminWachtwoord123!', gen_salt('bf')),  -- ← VERVANG
    now(),
    '{"role": "admin"}'::jsonb,
    now(),
    now()
);
```

**Als dit een error geeft**, gebruik dan het `create-auth-users.sql` bestand en pas het aan voor admin.

---

## 🔧 Methode 3: Via Supabase CLI (Laatste optie)

Als bovenstaande niet werkt, kunnen we Supabase CLI gebruiken.

---

## 📞 Hulp nodig?

Als je er morgen niet uitkomt:
1. Stuur me een screenshot van de Supabase Authentication → Users pagina
2. Stuur me de exacte error message als je SQL probeert
3. Dan help ik je verder!

---

## ✅ Na admin account:

Dan kun je:
- Inloggen op admin portal
- Supervisor accounts aanmaken (via hetzelfde proces)
- Alles testen!

---

**Succes morgen!** 🚀

*Laatst bijgewerkt: 4 januari 2026, 21:29*
