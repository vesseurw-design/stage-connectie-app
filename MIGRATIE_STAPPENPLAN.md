# 🚀 Supabase Auth Migratie - Stap voor Stap Handleiding

**Datum:** 19 December 2024  
**Geschatte tijd:** 30-45 minuten  
**Moeilijkheidsgraad:** Gemiddeld

---

## ⚠️ VOORDAT JE BEGINT

### Checklist:
- [ ] Je hebt toegang tot Supabase Dashboard
- [ ] Je hebt minimaal 30 minuten ononderbroken tijd
- [ ] Je hebt een backup gemaakt (zie Stap 1)
- [ ] Je hebt de gebruikers geïnformeerd over wachtwoord reset
- [ ] Je hebt een testaccount klaar om te testen

### Wat gaat er gebeuren:
1. ✅ Database backup maken
2. ✅ Auth kolommen toevoegen aan tabellen
3. ✅ Auth users aanmaken voor alle bestaande gebruikers
4. ✅ Authenticatie code updaten
5. ✅ Oude wachtwoord kolommen verwijderen
6. ✅ Testen en deployen

---

## STAP 1: Database Backup (5 minuten) 🔴 VERPLICHT

### Wat ga je doen:
Een volledige backup maken van alle belangrijke tabellen.

### Acties:

1. **Open Supabase Dashboard:**
   - Ga naar: https://supabase.com/dashboard
   - Selecteer je project: `ninkkvffhvkxrrxddgrz`

2. **Ga naar SQL Editor:**
   - Klik op **"SQL Editor"** in het linker menu
   - Klik op **"New query"**

3. **Voer backup script uit:**
   - Open bestand: `backup-database.sql`
   - Kopieer ALLE inhoud
   - Plak in SQL Editor
   - Klik op **"Run"** (of druk Cmd+Enter)

4. **Controleer resultaat:**
   ```
   Je moet een tabel zien met ongeveer:
   
   tabel               | aantal
   --------------------|-------
   Stagebegeleiders    | X
   Bedrijven           | X
   Students            | X
   Attendance          | X
   ```

5. **Screenshot maken:**
   - Maak een screenshot van dit resultaat
   - Bewaar dit veilig!

### ✅ Klaar? Vink af: [ ]

**⚠️ GA NIET VERDER ALS DE BACKUP NIET SUCCESVOL IS!**

---

## STAP 2: Auth Kolommen Toevoegen (5 minuten)

### Wat ga je doen:
Kolommen toevoegen aan de database om auth users te kunnen koppelen.

### Acties:

1. **Nieuwe query maken:**
   - Klik op **"New query"** in SQL Editor

2. **Voer script uit:**
   - Open bestand: `step2-add-auth-columns.sql`
   - Kopieer ALLE inhoud
   - Plak in SQL Editor
   - Klik op **"Run"**

3. **Controleer resultaat:**
   ```
   Je moet zien:
   
   column_name    | data_type
   ---------------|----------
   auth_user_id   | uuid
   ```

### ✅ Klaar? Vink af: [ ]

---

## STAP 3: Supabase Auth Configureren (5 minuten)

### Wat ga je doen:
Email authenticatie inschakelen en wachtwoord policy instellen.

### Acties:

1. **Ga naar Authentication:**
   - Klik op **"Authentication"** in linker menu
   - Klik op **"Providers"**

2. **Schakel Email Auth in:**
   - Zoek **"Email"** in de lijst
   - Zorg dat deze **enabled** is (groen)
   - Als niet: klik erop en schakel in

3. **Configureer Password Policy:**
   - Klik op **"Policies"** tab (naast Providers)
   - Stel in:
     - ✅ Minimum password length: **8**
     - ✅ Require uppercase: **Ja**
     - ✅ Require lowercase: **Ja**
     - ✅ Require numbers: **Ja**
     - ✅ Require special characters: **Nee** (optioneel)

4. **Sla op:**
   - Klik op **"Save"**

### ✅ Klaar? Vink af: [ ]

---

## STAP 4: Auth Users Aanmaken - Stagebegeleiders (10 minuten)

### Wat ga je doen:
Voor elke stagebegeleider een Supabase Auth account aanmaken.

### ⚠️ BELANGRIJK:
- Alle gebruikers krijgen tijdelijk wachtwoord: `TempPass2024!`
- Ze MOETEN hun wachtwoord resetten via "Wachtwoord Vergeten"
- Communiceer dit naar de gebruikers!

### Acties:

1. **Nieuwe query maken:**
   - Klik op **"New query"** in SQL Editor

2. **Voer script uit:**
   - Open bestand: `step3-create-supervisor-auth-users.sql`
   - Kopieer ALLE inhoud
   - Plak in SQL Editor
   - Klik op **"Run"**

3. **Controleer output:**
   ```
   Je moet berichten zien zoals:
   
   NOTICE: Auth user aangemaakt voor: naam@email.nl (ID: xxx-xxx-xxx)
   NOTICE: Auth user aangemaakt voor: naam2@email.nl (ID: yyy-yyy-yyy)
   ...
   
   En een verificatie tabel:
   totaal | met_auth | zonder_auth
   -------|----------|------------
   5      | 5        | 0
   ```

4. **Controleer "zonder_auth":**
   - Dit moet **0** zijn!
   - Als niet: voer script nogmaals uit

### ✅ Klaar? Vink af: [ ]

---

## STAP 5: Auth Users Aanmaken - Werkgevers (10 minuten)

### Wat ga je doen:
Voor elk bedrijf een Supabase Auth account aanmaken.

### Acties:

1. **Nieuwe query maken:**
   - Klik op **"New query"** in SQL Editor

2. **Voer script uit:**
   - Open bestand: `step3b-create-employer-auth-users.sql`
   - Kopieer ALLE inhoud
   - Plak in SQL Editor
   - Klik op **"Run"**

3. **Controleer output:**
   ```
   NOTICE: Auth user aangemaakt voor: bedrijf@email.nl (ID: xxx-xxx-xxx)
   ...
   
   totaal | met_auth | zonder_auth
   -------|----------|------------
   10     | 10       | 0
   ```

4. **Controleer "zonder_auth":**
   - Dit moet **0** zijn!

### ✅ Klaar? Vink af: [ ]

---

## STAP 6: Verificatie in Supabase Dashboard (5 minuten)

### Wat ga je doen:
Controleren of alle auth users correct zijn aangemaakt.

### Acties:

1. **Ga naar Authentication:**
   - Klik op **"Authentication"** in linker menu
   - Klik op **"Users"**

2. **Controleer de lijst:**
   - Je moet ALLE stagebegeleiders en werkgevers zien
   - Elke gebruiker heeft:
     - ✅ Email adres
     - ✅ "Confirmed" status (groen vinkje)
     - ✅ Metadata met rol (supervisor/employer)

3. **Tel de gebruikers:**
   - Aantal users = aantal stagebegeleiders + aantal bedrijven
   - Klopt dit? ✅

### ✅ Klaar? Vink af: [ ]

---

## STAP 7: Update Authenticatie Code (15 minuten)

### Wat ga je doen:
De JavaScript authenticatie code updaten om Supabase Auth te gebruiken.

### Ik heb de code al klaar - je hoeft alleen te kopiëren!

Wacht op mijn volgende bericht voor de nieuwe authenticatie code...

---

## STAP 8: Test de Nieuwe Authenticatie (10 minuten)

### Wat ga je doen:
Testen of inloggen werkt met de nieuwe auth.

### Acties:

1. **Test Supervisor Login:**
   - Ga naar: `supervisor-login.html`
   - Probeer in te loggen met:
     - Email: [een stagebegeleider email]
     - Wachtwoord: `TempPass2024!`
   - Verwacht: Succesvol ingelogd!

2. **Test Password Reset:**
   - Klik op "Wachtwoord vergeten?"
   - Voer email in
   - Controleer inbox
   - Klik op reset link
   - Stel nieuw wachtwoord in
   - Log in met nieuwe wachtwoord

3. **Test Employer Login:**
   - Herhaal voor werkgever login

### ✅ Klaar? Vink af: [ ]

---

## STAP 9: Verwijder Oude Password Kolommen (5 minuten) 🔴 PAS NA TESTEN!

### ⚠️ DOE DIT ALLEEN ALS ALLES WERKT!

### Acties:

1. **Nieuwe query maken:**
   - SQL Editor → New query

2. **Voer uit:**
   ```sql
   -- Verwijder password kolom van Stagebegeleiders
   ALTER TABLE public."Stagebegeleiders" 
   DROP COLUMN IF EXISTS password;
   
   -- Verwijder password kolom van Bedrijven
   ALTER TABLE public."Bedrijven" 
   DROP COLUMN IF EXISTS password;
   
   -- Verificatie
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name IN ('Stagebegeleiders', 'Bedrijven')
   AND column_name = 'password';
   ```

3. **Controleer:**
   - Query moet **0 rows** returnen
   - Password kolommen zijn weg! ✅

### ✅ Klaar? Vink af: [ ]

---

## STAP 10: Communiceer met Gebruikers (10 minuten)

### Wat ga je doen:
Gebruikers informeren over de wachtwoord reset.

### Email Template:

```
Onderwerp: Belangrijk: Wachtwoord Reset Vereist - StageConnect

Beste [Naam],

We hebben de beveiliging van StageConnect verbeterd! 

Wat betekent dit voor jou?
- Je moet je wachtwoord resetten bij je volgende login
- Ga naar de login pagina
- Klik op "Wachtwoord vergeten?"
- Volg de instructies in de email die je ontvangt

Tijdelijk wachtwoord (alleen voor eerste login):
TempPass2024!

Na je eerste login MOET je een nieuw wachtwoord instellen.

Vragen? Neem contact op via [email]

Met vriendelijke groet,
[Naam]
```

### ✅ Email verstuurd? Vink af: [ ]

---

## STAP 11: Deploy naar Productie (5 minuten)

### Acties:

1. **Commit changes:**
   ```bash
   git add .
   git commit -m "feat: Migrate to Supabase Auth for secure password management"
   git push
   ```

2. **Vercel deploy:**
   - Vercel detecteert automatisch de push
   - Wacht op deployment (1-2 minuten)
   - Test op productie URL

### ✅ Klaar? Vink af: [ ]

---

## ✅ VOLTOOID!

### Wat heb je bereikt:
- ✅ Wachtwoorden zijn nu veilig opgeslagen (bcrypt hashing)
- ✅ Geen hardcoded demo wachtwoorden meer
- ✅ Gebruikers kunnen hun eigen wachtwoord resetten
- ✅ AVG-compliant wachtwoordbeheer
- ✅ Professionele authenticatie via Supabase Auth

### Volgende stappen:
- [ ] Monitor eerste logins van gebruikers
- [ ] Help gebruikers die problemen hebben met reset
- [ ] Verwijder backup tabellen na 1 week (als alles goed werkt)

---

## 🆘 Problemen?

### "Error: duplicate key value violates unique constraint"
**Oplossing:** Email bestaat al in auth.users. Skip deze gebruiker of verwijder oude auth user eerst.

### "Error: permission denied for table auth.users"
**Oplossing:** Je hebt admin rechten nodig. Gebruik Supabase Dashboard → SQL Editor (heeft admin rechten).

### "Gebruiker kan niet inloggen"
**Oplossing:** 
1. Check of auth_user_id correct is gekoppeld
2. Check of email confirmed is (moet groen vinkje hebben)
3. Test met tijdelijk wachtwoord: `TempPass2024!`

### "Password reset email komt niet aan"
**Oplossing:**
1. Check spam folder
2. Check Supabase → Authentication → Email Templates
3. Verificeer SMTP configuratie

---

## 📞 Hulp Nodig?

**Vraag hulp via Antigravity als je vastloopt!**

Veel succes! 🚀
