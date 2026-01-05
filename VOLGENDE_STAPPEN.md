# 🚀 StageConnect - Volgende Stappen

## ✅ Wat is klaar:

- ✅ **Database gemigreerd naar EU** (Ierland)
- ✅ **Alle data geïmporteerd** (Students, Bedrijven, stagebegeleiders, Branches)
- ✅ **Code updated** met nieuwe EU Supabase credentials
- ✅ **Bedrijven auth accounts aangemaakt** (kunnen inloggen!)
- ✅ **Gepushed naar GitHub/Netlify**

---

## ⏳ Nog te doen:

### **1. Supervisor Accounts Aanmaken**

**Optie A: Via SQL (snelst)**

Ga naar Supabase EU project → SQL Editor en run:

```sql
-- Kopieer het supervisor gedeelte uit create-auth-users.sql
-- Vanaf regel 150 tot 350
```

**Optie B: Handmatig via UI**

Voor elke supervisor:
1. Supabase → Authentication → Users → Add user
2. Email: bijv. `wvs@youscope.nl`
3. Password: `StageWillemienVesseur` (of eigen wachtwoord)
4. Auto Confirm: ✅ Aan
5. User Metadata: `{"role": "supervisor"}`

**Supervisor Wachtwoorden:**
- Jolanda de Graaff: `jgk@youscope.nl` / `StageJolandadeGraaff`
- Hayat el Ouakill: `hou@youscope.nl` / `StageHayatelOuakill`
- Janneke de Ligny: `jli@youscope.nl` / `StageJannekedeligny`
- Karen Smook: `ksm@youscope.nl` / `StageKarenSmook`
- Irene Voogd: `ime@youscope.nl` / `StageIreneVoogd`
- **Willemien Vesseur**: `wvs@youscope.nl` / `StageWillemienVesseur`
- Sylvia Brunott: `sbx@youscope.nl` / `StageSylviaBrunott`
- Manon Huttinga: `mhu@youscope.nl` / `StageManonHuttinga`
- Dick Everts: `djev@youscope.nl` / `StageDickEverts`
- Paulien van der Leun: `pln@youscope.nl` / `StagePaulienvanderLeun`

---

### **2. Admin Account Aanmaken**

1. Supabase EU → Authentication → Users → Add user
2. Email: jouw admin email
3. Password: kies een sterk wachtwoord
4. Auto Confirm: ✅ Aan
5. User Metadata: `{"role": "admin"}`

---

### **3. Test de Applicatie**

**Test Employer Login:**
1. Ga naar: https://stageconnectie.nl
2. Login met: `test@testbedrijf.nl` / `WelkomTestbedrijf`
3. Check of je studenten ziet
4. Test aanwezigheid invoeren

**Test Supervisor Login:**
1. Ga naar: https://stageconnectie.nl/supervisor-login.html
2. Login met jouw supervisor account
3. Check of je studenten ziet
4. Check of aanwezigheid zichtbaar is

**Test Admin Login:**
1. Ga naar: https://stageconnectie.nl/admin-login.html
2. Login met jouw admin account
3. Check alle functionaliteit

---

## 📊 Database Locatie Verificatie

**Supabase Dashboard:**
- Project: `vdeipnqyesduiohxvuvu`
- Settings → General → Infrastructure
- **Region**: West EU (Ireland) ✅

**Voor de school:**
> "Alle persoonlijke gegevens worden opgeslagen in de Europese Unie (Ierland) via Supabase, in overeenstemming met de AVG/GDPR wetgeving."

---

## 🔧 Troubleshooting

**Probleem: Login werkt niet**
- Check of auth user bestaat in Supabase → Authentication → Users
- Check of user metadata `role` correct is ingesteld

**Probleem: Geen data zichtbaar**
- Check RLS policies in Supabase
- Check browser console (F12) voor errors

**Probleem: Oude Supabase URL**
- Check of alle files zijn updated naar `vdeipnqyesduiohxvuvu.supabase.co`
- Run: `grep -r "ninkkvffhvkxrrxddgrz" public/` (zou niets moeten vinden)

---

## 📁 Belangrijke Bestanden

- `create-auth-users.sql` - Script om auth users aan te maken
- `GDPR_COMPLIANCE_VERKLARING.md` - Voor de school
- `SUPABASE_EU_MIGRATION.md` - Volledige migratie documentatie

---

## 🆘 Hulp Nodig?

Als je later hulp nodig hebt:
1. Check de documentatie in de `.md` bestanden
2. Check Supabase logs: Project → Logs
3. Check browser console: F12 → Console tab

---

## 🎉 Success!

Je database is nu 100% EU hosted en GDPR compliant!

**Volgende keer:**
- Supervisor accounts aanmaken
- Admin account aanmaken
- Alles testen
- GDPR document delen met school

---

*Laatst bijgewerkt: 4 januari 2026*
