# Supabase Instellingen voor Stage Connect

## Overzicht
Dit document biedt stap-voor-stap instructies om de Supabase database in te stellen voor de Stage Connect hybride architectuur.

## Architectuur
- **Supabase (Cloud)**: Werkgevers, Werkgever Contacten, Begeleider Contacten
- **localStorage (Browser)**: Stages, Leerlingen, Aanwezigheid, Berichten

## Stap 1: Open Supabase Dashboard

1. Ga naar [https://app.supabase.com](https://app.supabase.com)
2. Log in met uw Supabase account
3. Selecteer uw project: `stageconnectie-app`

## Stap 2: Maak de Tabellen aan

Ga naar de **SQL Editor** en voer het volgende SQL script uit:

```sql
-- Werkgevers tabel aanmaken
CREATE TABLE IF NOT EXISTS employers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Werkgever contacten tabel aanmaken
CREATE TABLE IF NOT EXISTS employer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  access_code TEXT NOT NULL,
  assigned_internships TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Begeleider contacten tabel aanmaken
CREATE TABLE IF NOT EXISTS supervisor_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  access_code TEXT NOT NULL,
  assigned_students TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Indexen aanmaken voor prestaties
CREATE INDEX IF NOT EXISTS idx_employer_contacts_email ON employer_contacts(email);
CREATE INDEX IF NOT EXISTS idx_employer_contacts_employer_id ON employer_contacts(employer_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_contacts_email ON supervisor_contacts(email);
```

## Stap 3: Voorbeeldgegevens toevoegen (Optioneel)

Om de applicatie te testen, kunt u voorbeeldgegevens toevoegen:

```sql
-- Voorbeeldwerkgevers toevoegen
INSERT INTO employers (company_name, phone_number) VALUES
  ('Techno Solutions', '030-1234567'),
  ('Design Studio', '020-9876543')
ON CONFLICT DO NOTHING;

-- Voorbeeldwerkgever contacten toevoegen
INSERT INTO employer_contacts (employer_id, name, email, access_code, assigned_internships) VALUES
  ((SELECT id FROM employers WHERE company_name = 'Techno Solutions' LIMIT 1), 'Jan Jansen', 'jan@technosolutions.nl', 'SECRET123', ARRAY[]::text[]),
  ((SELECT id FROM employers WHERE company_name = 'Design Studio' LIMIT 1), 'Marie Dupont', 'marie@designstudio.nl', 'SECRET456', ARRAY[]::text[])
ON CONFLICT (email) DO NOTHING;

-- Voorbeeldbegeleiders toevoegen
INSERT INTO supervisor_contacts (name, email, phone_number, access_code, assigned_students) VALUES
  ('Drs. Peter van Dijk', 'peter.vandijk@ghpc.nl', '030-5555555', 'SUPERVISOR1', ARRAY[]::text[]),
  ('Ir. Sarah de Wit', 'sarah.dewit@ghpc.nl', '030-6666666', 'SUPERVISOR2', ARRAY[]::text[])
ON CONFLICT (email) DO NOTHING;
```

## Stap 4: Row Level Security (RLS) inschakelen - Optioneel

Voor productie kunt u RLS inschakelen. Aangezien we de anon key gebruiken, moeten we openbare leestoegang toestaan:

```sql
ALTER TABLE employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor_contacts ENABLE ROW LEVEL SECURITY;

-- Beleidsregels maken voor publieke leestoegang
CREATE POLICY "Leestoegang voor alle gebruikers inschakelen" ON employers
  FOR SELECT USING (true);

CREATE POLICY "Leestoegang voor alle gebruikers inschakelen" ON employer_contacts
  FOR SELECT USING (true);

CREATE POLICY "Leestoegang voor alle gebruikers inschakelen" ON supervisor_contacts
  FOR SELECT USING (true);
```

## Stap 5: Controleer omgevingsvariabelen

Zorg ervoor dat uw `.env.local` bestand de juiste Supabase-referenties bevat:

```
REACT_APP_SUPABASE_URL=https://ninkkvffhvkxrrxddgrz.supabase.co
REACT_APP_SUPABASE_ANON_KEY=uw-anon-key-hier
```

## Stap 6: Test de Verbinding

1. Start de ontwikkelingserver: `npm start`
2. Open de browserconsole (F12)
3. Zoek naar het bericht: `✅ Supabase verbinding succesvol`
4. Log in met een van de testaccounts (bijvoorbeeld jan@technosolutions.nl / SECRET123)

## Probleemoplossing

### Probleem: "Supabase verbinding mislukt"
- Controleer of de Supabase URL en ANON_KEY correct zijn in .env.local
- Controleer of de tabellen bestaan in Supabase
- Controleer de browserconsole op gedetailleerde foutmeldingen

### Probleem: "E-mail niet gevonden" bij inloggen
- Controleer of uw test-e-mailadres bestaat in de employer_contacts of supervisor_contacts tabel
- Zorg ervoor dat de access_code exact overeenkomt

### Probleem: Gegevens laden niet van Supabase
- Controleer of Supabase is ingeschakeld in de browserconsole
- Controleer het Network-tabblad in DevTools om te zien of API-aanroepen worden gedaan
- Controleer het Supabase-dashboard op eventuele toegangsfouten

## Volgende stappen

Zodra de tabellen zijn aangemaakt en geverifieerd:
1. Voeg uw daadwerkelijke werkgever- en begeleidergegevens toe aan Supabase
2. Test alle drie de inlogstromen (werkgever, begeleider)
3. Implementeer op Vercel
4. Monitor de logs op eventuele fouten

## Gegevensmigratie van localStorage

De app behoudt volledige localStorage-functionaliteit als terugvaloptie. Wanneer u permanent naar Supabase wilt migreren:
1. Exporteer uw huidige gegevens uit localStorage
2. Voeg deze in Supabase-tabellen in
3. Update de inlogfuncties zodat Supabase-gegevens nodig zijn

Voor nu maakt de hybride benadering het mogelijk dat beide gegevensbronnen naast elkaar bestaan.
