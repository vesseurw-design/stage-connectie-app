# 🚀 EU Migratie Quick Start Guide

## Overzicht

Je gaat StageConnect migreren van USA/Canada hosting naar 100% EU hosting voor GDPR compliance.

**Tijdsinvestering**: ~2-3 uur  
**Downtime**: ~30 minuten  
**Moeilijkheidsgraad**: Gemiddeld

---

## 📚 Documentatie Overzicht

| Document | Doel | Wanneer gebruiken |
|----------|------|-------------------|
| `SUPABASE_EU_MIGRATION.md` | Database migratie | Stap 1 |
| `VERCEL_EU_DEPLOYMENT.md` | Frontend deployment | Stap 2 |
| `GDPR_COMPLIANCE_VERKLARING.md` | Voor de school | Na migratie |
| `export-database-schema.sql` | Database export | Tijdens stap 1 |
| `import-to-eu-supabase.sql` | Database import | Tijdens stap 1 |

---

## ⚡ Snelle Migratie (Aanbevolen Volgorde)

### Fase 1: Database Migratie (1-2 uur)

1. **Maak nieuw Supabase EU project**
   - Ga naar [supabase.com/dashboard](https://supabase.com/dashboard)
   - New Project → **West Europe (eu-west-1)**
   - Noteer URL en API key

2. **Exporteer huidige data**
   - Open `export-database-schema.sql`
   - Voer uit in huidige Supabase project
   - Sla output op

3. **Importeer in EU project**
   - Open `import-to-eu-supabase.sql`
   - Voer uit in nieuwe EU project
   - Importeer CSV data via Table Editor

4. **Verifieer data**
   ```sql
   SELECT COUNT(*) FROM public."Students";
   SELECT COUNT(*) FROM public."Bedrijven";
   SELECT COUNT(*) FROM public.stagebegeleiders;
   ```

### Fase 2: Code Update (30 minuten)

5. **Update Supabase credentials**
   
   Zoek en vervang in deze bestanden:
   - `public/static/js/admin-auth.js`
   - `public/static/js/supervisor-auth.js`
   - `public/static/js/auth_v2.js`
   - `public/static/js/admin.js`
   - `public/supervisor-portal-v2.html`
   - `public/admin-v2.html`
   - `public/static/js/employer-portal.js`

   **Oud:**
   ```javascript
   const SUPABASE_URL = 'https://ninkkvffhvkxrrxddgrz.supabase.co';
   const SUPABASE_KEY = 'eyJ...oude key...';
   ```

   **Nieuw:**
   ```javascript
   const SUPABASE_URL = 'https://[jouw-nieuwe-ref].supabase.co';
   const SUPABASE_KEY = 'eyJ...nieuwe key...';
   ```

6. **Commit changes**
   ```bash
   git add .
   git commit -m "Migrate to EU Supabase instance"
   git push origin main
   ```

### Fase 3: Vercel Deployment (30 minuten)

7. **Deploy naar Vercel**
   - Ga naar [vercel.com](https://vercel.com)
   - Import GitHub repository
   - Root Directory: `./public`
   - Deploy!

8. **Verifieer Frankfurt region**
   - Settings → Functions → Region = "fra1"

9. **Koppel domain**
   - Settings → Domains → Add `stageconnectie.nl`
   - Update DNS records (zie `VERCEL_EU_DEPLOYMENT.md`)

### Fase 4: Testing (30 minuten)

10. **Test alle functionaliteit**
    - [ ] Admin login werkt
    - [ ] Supervisor login werkt
    - [ ] Employer login werkt
    - [ ] Studenten zichtbaar
    - [ ] Bedrijven zichtbaar
    - [ ] Begeleiders zichtbaar
    - [ ] Attendance invoeren werkt
    - [ ] Attendance zichtbaar in supervisor portal
    - [ ] Attendance zichtbaar in admin portal

11. **Verifieer EU hosting**
    ```bash
    nslookup stageconnectie.nl
    nslookup [jouw-project].supabase.co
    ```

---

## ✅ Checklist

- [ ] Nieuw Supabase EU project aangemaakt
- [ ] Database schema geëxporteerd
- [ ] Database schema geïmporteerd in EU project
- [ ] Data geïmporteerd (Students, Bedrijven, Begeleiders)
- [ ] RLS policies geconfigureerd
- [ ] Supabase credentials updated in code
- [ ] Code gepushed naar GitHub
- [ ] Vercel project aangemaakt
- [ ] Frankfurt region geselecteerd
- [ ] Domain gekoppeld
- [ ] DNS records updated
- [ ] Alle functionaliteit getest
- [ ] EU hosting geverifieerd
- [ ] GDPR document gedeeld met school

---

## 🆘 Hulp Nodig?

**Stap 1 problemen?** → Zie `SUPABASE_EU_MIGRATION.md` sectie "Troubleshooting"

**Stap 2 problemen?** → Zie `VERCEL_EU_DEPLOYMENT.md` sectie "Troubleshooting"

**Andere vragen?** → Check de volledige documentatie

---

## 📊 Na Migratie

1. **Deel GDPR document** met school (`GDPR_COMPLIANCE_VERKLARING.md`)
2. **Monitor performance** via Vercel Analytics
3. **Verwijder oude Netlify site** (na 1 week)
4. **Verwijder oude Supabase project** (na 1 week)

---

## 🎉 Success!

Je StageConnect app is nu:
- ✅ 100% EU hosted (Frankfurt + Ierland)
- ✅ GDPR compliant
- ✅ Sneller voor Nederlandse gebruikers
- ✅ Gratis!

**Geschatte totale tijd**: 2-3 uur  
**Resultaat**: Volledig GDPR-compliant platform geschikt voor schoolgebruik

---

*Veel succes met de migratie! 🚀*
