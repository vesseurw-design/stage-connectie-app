# Supabase EU Migratie Stappenplan

## 🎯 Doel
Migreer de StageConnect database van Canada naar EU (West Europe) voor GDPR compliance.

## 📋 Voorbereiding

### Stap 1: Maak een nieuw Supabase project aan in EU

1. Ga naar [supabase.com/dashboard](https://supabase.com/dashboard)
2. Klik op **"New Project"**
3. Vul in:
   - **Name**: `StageConnect-EU`
   - **Database Password**: Kies een sterk wachtwoord (bewaar dit veilig!)
   - **Region**: **West Europe (eu-west-1)** ⚠️ BELANGRIJK!
   - **Pricing Plan**: Free tier
4. Klik **"Create new project"**
5. Wacht tot het project is aangemaakt (~2 minuten)

### Stap 2: Noteer de nieuwe credentials

Ga naar **Settings** → **API** en noteer:
- **Project URL**: `https://[your-project-ref].supabase.co`
- **anon/public key**: `eyJ...` (lange string)

Bewaar deze veilig - je hebt ze straks nodig!

---

## 🗄️ Database Schema Export

### Stap 3: Exporteer het huidige schema

1. Ga naar je **huidige** Supabase project (Canada)
2. Ga naar **SQL Editor**
3. Voer het volgende script uit om het schema te exporteren:

```sql
-- Dit genereert CREATE TABLE statements voor alle tabellen
SELECT 
    'CREATE TABLE IF NOT EXISTS public."' || tablename || '" (' ||
    string_agg(
        column_name || ' ' || data_type || 
        CASE WHEN character_maximum_length IS NOT NULL 
            THEN '(' || character_maximum_length || ')' 
            ELSE '' 
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
        ', '
    ) || ');'
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('Students', 'Bedrijven', 'Attendance', 'stagebegeleiders', 'Branches', 'ActiveBranches')
GROUP BY tablename;
```

4. Kopieer de output en bewaar in een bestand

### Stap 4: Gebruik het meegeleverde export script

In plaats van handmatig exporteren, gebruik het `export-database-schema.sql` script:

1. Open **SQL Editor** in je huidige Supabase project
2. Voer het script uit (zie `export-database-schema.sql` bestand)
3. Kopieer alle CREATE TABLE statements

---

## 📊 Data Export

### Stap 5: Exporteer de data

Voor elke tabel, voer uit in SQL Editor:

```sql
-- Students
COPY (SELECT * FROM public."Students") TO STDOUT WITH CSV HEADER;

-- Bedrijven
COPY (SELECT * FROM public."Bedrijven") TO STDOUT WITH CSV HEADER;

-- stagebegeleiders
COPY (SELECT * FROM public.stagebegeleiders) TO STDOUT WITH CSV HEADER;

-- Branches (als je deze hebt)
COPY (SELECT * FROM public."Branches") TO STDOUT WITH CSV HEADER;
```

**Let op**: Attendance data hoef je NIET te exporteren (we starten fresh vanaf 1 januari)

---

## 🚀 Import in EU Project

### Stap 6: Importeer schema in nieuw EU project

1. Ga naar je **nieuwe** EU Supabase project
2. Ga naar **SQL Editor**
3. Voer het `import-to-eu-supabase.sql` script uit
4. Controleer of alle tabellen zijn aangemaakt

### Stap 7: Importeer data

1. Ga naar **Table Editor**
2. Voor elke tabel:
   - Klik op de tabel
   - Klik **"Insert"** → **"Import data from CSV"**
   - Upload het CSV bestand
   - Klik **"Import"**

### Stap 8: Configureer RLS Policies

1. Voer het `setup-rls-policies-eu.sql` script uit in SQL Editor
2. Dit configureert alle Row Level Security policies

---

## 🔧 Update Application Code

### Stap 9: Update Supabase credentials in code

Update de volgende bestanden met de nieuwe EU credentials:

**Bestanden om te updaten:**
- `public/static/js/admin-auth.js`
- `public/static/js/supervisor-auth.js`
- `public/static/js/auth_v2.js` (employer)
- `public/static/js/admin.js`
- `public/supervisor-portal-v2.html`
- `public/admin-v2.html`

**Vervang:**
```javascript
const SUPABASE_URL = 'https://ninkkvffhvkxrrxddgrz.supabase.co';
const SUPABASE_KEY = 'eyJ...oude key...';
```

**Door:**
```javascript
const SUPABASE_URL = 'https://[jouw-nieuwe-project].supabase.co';
const SUPABASE_KEY = 'eyJ...nieuwe key...';
```

---

## ✅ Verificatie

### Stap 10: Test de migratie

1. **Test login** voor alle rollen:
   - Admin login
   - Supervisor login
   - Employer login

2. **Test data**:
   - Controleer of studenten zichtbaar zijn
   - Controleer of bedrijven zichtbaar zijn
   - Controleer of begeleiders zichtbaar zijn

3. **Test attendance**:
   - Voer nieuwe attendance in via employer portal
   - Controleer of het zichtbaar is in supervisor portal
   - Controleer of het zichtbaar is in admin portal

---

## 🗑️ Cleanup (optioneel)

### Stap 11: Oude project verwijderen

**Wacht minimaal 1 week** voordat je het oude project verwijdert!

1. Ga naar oude Supabase project
2. Settings → General
3. Scroll naar beneden
4. "Delete Project"

---

## 📍 Verificatie van EU Hosting

Na migratie, verifieer de locatie:

```bash
nslookup [jouw-nieuwe-project].supabase.co
```

Het IP-adres zou in Europa moeten zijn (niet Canada/USA).

---

## 🆘 Troubleshooting

**Probleem**: "Permission denied" errors
- **Oplossing**: Controleer RLS policies met `setup-rls-policies-eu.sql`

**Probleem**: Login werkt niet
- **Oplossing**: Controleer of de nieuwe Supabase URL en KEY correct zijn ingevuld

**Probleem**: Data niet zichtbaar
- **Oplossing**: Controleer of data correct is geïmporteerd in Table Editor

---

## 📞 Support

Bij problemen, check:
1. Supabase logs: Project → Logs
2. Browser console: F12 → Console tab
3. Network tab: F12 → Network tab

