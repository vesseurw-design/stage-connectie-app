# StageConnect - GDPR & Beveiligingsplan

**Datum:** 19 December 2024  
**Doel:** App volledig AVG (GDPR) compliant maken + veilige wachtwoordbeveiliging

---

## 🔐 KRITIEKE BEVEILIGINGSPROBLEMEN (NU OPLOSSEN!)

### ❌ Probleem 1: Wachtwoorden in Plain Text
**Huidige situatie:**
- Wachtwoorden worden ONVERSLEUTELD opgeslagen in de database
- `supervisor-auth.js` vergelijkt wachtwoorden direct: `.eq('password', password)`
- Dit is een **ERNSTIG** beveiligingsrisico!

**Oplossing:**
- Gebruik Supabase Auth voor wachtwoordbeheer (automatische bcrypt hashing)
- Verwijder `password` kolom uit `Stagebegeleiders` en `Bedrijven` tabellen
- Migreer naar Supabase Auth Users tabel

### ❌ Probleem 2: Hardcoded Demo Wachtwoorden
**Locaties:**
- `supervisor-auth.js`: `if (password === 'demo123')`
- `auth_v2.js`: `if (a === "demo123")`
- `admin-auth.js`: `if (n === "demo123")`

**Oplossing:**
- Verwijder alle hardcoded wachtwoorden
- Gebruik alleen Supabase Auth

### ❌ Probleem 3: Geen Privacy Policy / Cookie Consent
**Huidige situatie:**
- Geen privacy policy pagina
- Geen cookie consent banner
- Geen gebruikerstoestemming voor data verwerking

---

## 📋 IMPLEMENTATIE STAPPEN

### FASE 1: Wachtwoordbeveiliging 🔴 HOOGSTE PRIORITEIT

#### Stap 1.1: Supabase Auth Configuratie
**Actie:** Configureer Supabase Auth voor alle gebruikerstypen

```sql
-- 1. Schakel Email Auth in (Supabase Dashboard → Authentication → Providers)
-- 2. Configureer Email Templates (optioneel)
-- 3. Stel Password Policy in:
--    - Minimum 8 karakters
--    - Minimaal 1 hoofdletter
--    - Minimaal 1 cijfer
```

#### Stap 1.2: Migreer Gebruikers naar Supabase Auth
**Actie:** Maak SQL script om bestaande gebruikers te migreren

```sql
-- Migratie Script (VOER UIT IN SUPABASE SQL EDITOR)

-- STAP 1: Maak auth users voor alle stagebegeleiders
DO $$
DECLARE
    supervisor_record RECORD;
    new_user_id UUID;
BEGIN
    FOR supervisor_record IN 
        SELECT id, email, name FROM public."Stagebegeleiders"
    LOOP
        -- Maak auth user (wachtwoord moet door gebruiker worden gereset)
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
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            supervisor_record.email,
            crypt('TEMP_PASSWORD_CHANGE_ME', gen_salt('bf')), -- Tijdelijk wachtwoord
            NOW(),
            '{"provider":"email","providers":["email"],"role":"supervisor"}',
            jsonb_build_object('name', supervisor_record.name, 'supervisor_id', supervisor_record.id),
            NOW(),
            NOW(),
            '',
            ''
        ) RETURNING id INTO new_user_id;
        
        -- Update Stagebegeleiders tabel met auth_user_id
        ALTER TABLE public."Stagebegeleiders" ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);
        UPDATE public."Stagebegeleiders" SET auth_user_id = new_user_id WHERE id = supervisor_record.id;
    END LOOP;
END $$;

-- STAP 2: Herhaal voor Bedrijven (employers)
-- (Vergelijkbaar proces)

-- STAP 3: Verwijder password kolommen (NA MIGRATIE!)
-- ALTER TABLE public."Stagebegeleiders" DROP COLUMN IF EXISTS password;
-- ALTER TABLE public."Bedrijven" DROP COLUMN IF EXISTS password;
```

#### Stap 1.3: Update Authenticatie Code
**Actie:** Vervang custom auth door Supabase Auth

**Bestanden om te updaten:**
1. `public/static/js/supervisor-auth.js`
2. `public/static/js/auth_v2.js` (employer login)
3. `public/static/js/admin-auth.js`

**Nieuwe authenticatie flow:**
```javascript
// Voorbeeld: supervisor-auth.js
const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
});

if (error) throw error;

// Haal supervisor data op via auth user metadata
const { data: { user } } = await supabase.auth.getUser();
const supervisorId = user.user_metadata.supervisor_id;
```

#### Stap 1.4: Wachtwoord Reset Functionaliteit
**Actie:** Voeg "Wachtwoord Vergeten" toe aan alle login pagina's

```html
<!-- Toevoegen aan supervisor-login.html, admin-login.html, etc. -->
<a href="#" id="forgot-password" class="text-sm text-blue-600 hover:text-blue-700">
    Wachtwoord vergeten?
</a>
```

```javascript
// Password reset handler
document.getElementById('forgot-password').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = prompt('Voer je email adres in:');
    if (email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password.html'
        });
        if (!error) {
            alert('Controleer je email voor reset instructies');
        }
    }
});
```

#### Stap 1.5: Admin Panel - Wachtwoord Beheer
**Actie:** Update admin panel om wachtwoorden te kunnen resetten

**In `admin-supervisors.html`:**
- Verwijder wachtwoord input bij bewerken
- Voeg "Reset Wachtwoord" knop toe
- Stuur password reset email via Supabase

---

### FASE 2: GDPR Compliance 🟡 HOGE PRIORITEIT

#### Stap 2.1: Privacy Policy Pagina
**Actie:** Maak uitgebreide privacy policy

**Bestand:** `public/privacy-policy.html`

**Inhoud moet bevatten:**
1. **Verwerkingsverantwoordelijke:** Groene Hart Pro College
2. **Welke data verzamelen we:**
   - Naam, email, telefoonnummer
   - Aanwezigheidsdata
   - Login timestamps
3. **Doel van verwerking:**
   - Stagevoortgang monitoring
   - Communicatie tussen school, student, werkgever
4. **Rechtsgrond:** Gerechtvaardigd belang (onderwijsdoeleinden)
5. **Bewaartermijn:** Tot einde schooljaar + 1 jaar
6. **Rechten van betrokkenen:**
   - Inzage
   - Rectificatie
   - Verwijdering
   - Bezwaar
7. **Beveiliging:** Encryptie, toegangscontrole
8. **Contactgegevens:** Functionaris Gegevensbescherming

#### Stap 2.2: Cookie Consent Banner
**Actie:** Implementeer cookie consent volgens ePrivacy richtlijn

**Bestand:** `public/static/js/cookie-consent.js`

```javascript
// Cookie Consent Manager
class CookieConsent {
    constructor() {
        this.consentGiven = localStorage.getItem('sc_cookie_consent');
        if (!this.consentGiven) {
            this.showBanner();
        }
    }

    showBanner() {
        const banner = document.createElement('div');
        banner.id = 'cookie-consent-banner';
        banner.innerHTML = `
            <div class="cookie-banner">
                <p>
                    Deze website gebruikt alleen functionele cookies die noodzakelijk zijn 
                    voor de werking van de applicatie. We gebruiken geen tracking cookies.
                    <a href="privacy-policy.html">Lees ons privacybeleid</a>
                </p>
                <button id="accept-cookies">Accepteren</button>
            </div>
        `;
        document.body.appendChild(banner);

        document.getElementById('accept-cookies').addEventListener('click', () => {
            this.acceptCookies();
        });
    }

    acceptCookies() {
        localStorage.setItem('sc_cookie_consent', 'true');
        document.getElementById('cookie-consent-banner').remove();
    }
}

// Initialiseer bij page load
document.addEventListener('DOMContentLoaded', () => {
    new CookieConsent();
});
```

#### Stap 2.3: Data Minimalisatie
**Actie:** Verwijder onnodige data verzameling

**Controleer:**
- [ ] Verzamelen we alleen noodzakelijke data?
- [ ] Kunnen we telefoonnummers optioneel maken?
- [ ] Bewaren we data niet langer dan nodig?

#### Stap 2.4: Gebruikersrechten Implementatie
**Actie:** Maak functionaliteit voor GDPR rechten

**Toevoegen aan admin panel:**
1. **Data Export:** Download alle data van een gebruiker (JSON)
2. **Data Verwijdering:** Verwijder alle data van een gebruiker
3. **Data Rectificatie:** Bewerk gebruikersgegevens

```javascript
// Data Export Functie
async function exportUserData(userId) {
    const { data: student } = await supabase
        .from('Students')
        .select('*')
        .eq('id', userId)
        .single();
    
    const { data: attendance } = await supabase
        .from('Attendance')
        .select('*')
        .eq('student_id', userId);
    
    const exportData = {
        student: student,
        attendance: attendance,
        exportDate: new Date().toISOString()
    };
    
    // Download als JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], 
        { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user_data_${userId}.json`;
    a.click();
}
```

#### Stap 2.5: Verwerkersovereenkomst Supabase
**Actie:** Controleer DPA (Data Processing Agreement)

**Stappen:**
1. Ga naar Supabase Dashboard → Organization Settings
2. Download/bekijk DPA
3. Bewaar kopie voor compliance documentatie

---

### FASE 3: Aanvullende Beveiliging 🟢 MEDIUM PRIORITEIT

#### Stap 3.1: Row Level Security (RLS) Verbeteren
**Actie:** Maak RLS policies meer restrictief

```sql
-- Huidige policy: Allow anonymous read (TE BREED!)
-- Nieuwe policy: Alleen eigen data + gerelateerde data

-- Students: Alleen zichtbaar voor eigen supervisor en employer
CREATE POLICY "Students visible to related users"
ON public."Students"
FOR SELECT
USING (
    auth.uid() IN (
        SELECT auth_user_id FROM public."Stagebegeleiders" WHERE id = supervisor_id
    )
    OR
    auth.uid() IN (
        SELECT auth_user_id FROM public."Bedrijven" WHERE id = company_id
    )
);

-- Attendance: Alleen zichtbaar voor gerelateerde partijen
CREATE POLICY "Attendance visible to related users"
ON public."Attendance"
FOR SELECT
USING (
    student_id IN (
        SELECT id FROM public."Students" 
        WHERE supervisor_id IN (
            SELECT id FROM public."Stagebegeleiders" WHERE auth_user_id = auth.uid()
        )
        OR company_id IN (
            SELECT id FROM public."Bedrijven" WHERE auth_user_id = auth.uid()
        )
    )
);
```

#### Stap 3.2: Audit Logging
**Actie:** Log belangrijke acties voor compliance

```sql
-- Audit Log Tabel
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger voor automatische logging
CREATE OR REPLACE FUNCTION log_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        row_to_json(OLD),
        row_to_json(NEW)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Stap 3.3: Rate Limiting
**Actie:** Voorkom brute force attacks

**Implementatie via Supabase:**
- Configureer in Supabase Dashboard → Authentication → Rate Limits
- Stel in: Max 5 login pogingen per 15 minuten

#### Stap 3.4: Session Management
**Actie:** Verbeter session beveiliging

```javascript
// Auto-logout na inactiviteit
let inactivityTimer;
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minuten

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        // Auto logout
        supabase.auth.signOut();
        window.location.href = 'login.html';
    }, INACTIVITY_TIMEOUT);
}

// Reset timer bij user activiteit
['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, resetInactivityTimer, true);
});
```

---

## ✅ CHECKLIST

### Beveiliging
- [ ] Wachtwoorden gemigreerd naar Supabase Auth (bcrypt hashing)
- [ ] Hardcoded demo wachtwoorden verwijderd
- [ ] Wachtwoord reset functionaliteit toegevoegd
- [ ] RLS policies aangescherpt
- [ ] Rate limiting geconfigureerd
- [ ] Session timeout geïmplementeerd
- [ ] Audit logging toegevoegd

### GDPR
- [ ] Privacy Policy pagina gemaakt
- [ ] Cookie consent banner geïmplementeerd
- [ ] Data minimalisatie gecontroleerd
- [ ] Data export functionaliteit (recht op inzage)
- [ ] Data verwijdering functionaliteit (recht op vergetelheid)
- [ ] DPA met Supabase gecontroleerd
- [ ] Bewaartermijnen gedocumenteerd
- [ ] Contactgegevens FG toegevoegd

### Documentatie
- [ ] Gebruikershandleiding bijgewerkt met privacy info
- [ ] Admin handleiding voor GDPR verzoeken
- [ ] Incident response plan gemaakt

---

## 🚨 BELANGRIJKE WAARSCHUWINGEN

### ⚠️ Migratie Risico's
**LET OP:** Bij migratie naar Supabase Auth:
1. **Backup eerst alle data!**
2. Test migratie eerst in development omgeving
3. Communiceer met gebruikers over wachtwoord reset
4. Plan downtime (max 1 uur)

### ⚠️ Compliance Deadline
**GDPR is verplicht!** Bij niet-naleving:
- Boetes tot €20 miljoen of 4% jaaromzet
- Reputatieschade
- Mogelijk verbod op data verwerking

---

## 📞 VOLGENDE STAPPEN

1. **NU:** Backup maken van database
2. **Vandaag:** Fase 1 starten (wachtwoordbeveiliging)
3. **Deze week:** Fase 2 afronden (GDPR compliance)
4. **Volgende week:** Fase 3 implementeren (extra beveiliging)

**Wil je dat ik begin met de implementatie? Ik kan starten met:**
- Privacy Policy pagina maken
- Cookie consent banner implementeren
- Supabase Auth migratie script maken
- Wachtwoord reset functionaliteit toevoegen

**Laat me weten waar je mee wilt beginnen!** 🚀
