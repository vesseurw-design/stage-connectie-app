# 👤 Nieuwe Admin Toevoegen

## Via Supabase Dashboard

### Stap 1: Maak User aan
1. Ga naar **Supabase Dashboard** → **Authentication** → **Users**
2. Klik **"Add user"** (of "Invite user")
3. Vul in:
   - **Email**: admin@email.nl
   - **Password**: WelkomAdmin (of eigen wachtwoord)
   - **Auto Confirm User**: ✅ **AAN** (belangrijk!)
4. Klik **"Create user"**

### Stap 2: Voeg Admin Rol toe
1. Ga naar **SQL Editor**
2. Voer uit:

```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
    'role', 'admin',
    'name', 'Admin Naam'  -- Optioneel
)
WHERE email = 'admin@email.nl';  -- ← Vervang met het juiste email
```

3. Klik **"Run"**

### Stap 3: Test
1. Ga naar https://stageconnectie.nl/admin-login.html
2. Login met het nieuwe admin account
3. Check of je toegang hebt tot alle admin functies

---

## ✅ Klaar!

De nieuwe admin kan nu inloggen en alle admin functies gebruiken.

---

## 🔑 Wachtwoord Reset

Als de admin het wachtwoord wil wijzigen:
1. Klik "Wachtwoord vergeten" op de login pagina
2. Voer email in
3. Check email inbox
4. Volg de reset link
5. Stel nieuw wachtwoord in
