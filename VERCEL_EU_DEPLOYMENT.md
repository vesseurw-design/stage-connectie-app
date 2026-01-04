# Vercel EU Deployment Stappenplan

## 🎯 Doel
Deploy StageConnect naar Vercel met Frankfurt (EU) regio voor GDPR compliance.

## 📋 Voorbereiding

### Stap 1: Vercel Account Setup

1. Ga naar [vercel.com](https://vercel.com)
2. **Log in** met je GitHub account (of maak een nieuw account)
3. Kies **Hobby (Free)** plan

---

## 🚀 Project Deployment

### Stap 2: Connect GitHub Repository

1. Klik op **"Add New..."** → **"Project"**
2. Selecteer je **stage-connect-app** repository
3. Klik **"Import"**

### Stap 3: Configure Project Settings

**Framework Preset**: Other (geen framework)

**Root Directory**: `./public`

**Build Command**: Laat leeg (geen build nodig)

**Output Directory**: `./` (current directory)

**Install Command**: Laat leeg

### Stap 4: Environment Variables (BELANGRIJK!)

⚠️ **NIET NODIG** - Je Supabase credentials staan al in de JavaScript bestanden.

Maar voor extra beveiliging kun je later overwegen om deze naar environment variables te verplaatsen.

### Stap 5: Deploy Settings

Klik op **"Deploy"**

Vercel zal automatisch deployen naar de **dichtstbijzijnde regio** (meestal Frankfurt voor EU gebruikers).

---

## 🇪🇺 EU Region Verificatie

### Stap 6: Verifieer Frankfurt Deployment

Na deployment:

1. Ga naar je project dashboard
2. Klik op **"Settings"** → **"Functions"**
3. Onder **"Function Region"** zou je **"fra1" (Frankfurt)** moeten zien

**Als het NIET Frankfurt is:**

1. Ga naar **Settings** → **"Functions"**
2. Scroll naar **"Function Region"**
3. Selecteer **"Frankfurt, Germany (fra1)"**
4. Klik **"Save"**
5. Trigger een nieuwe deployment (push een kleine wijziging naar GitHub)

### Stap 7: Verifieer met command line

```bash
nslookup jouw-app.vercel.app
```

Het IP-adres zou in Europa moeten zijn.

---

## 🌐 Custom Domain Setup

### Stap 8: Koppel stageconnectie.nl aan Vercel

1. Ga naar **Settings** → **"Domains"**
2. Klik **"Add Domain"**
3. Voer in: `stageconnectie.nl`
4. Klik **"Add"**

### Stap 9: Update DNS Records

Ga naar je domain provider (waar je stageconnectie.nl hebt gekocht):

**Verwijder oude Netlify records:**
- Verwijder alle CNAME records naar Netlify

**Voeg Vercel records toe:**

**A Record:**
- Type: `A`
- Name: `@`
- Value: `76.76.21.21`

**CNAME Record:**
- Type: `CNAME`
- Name: `www`
- Value: `cname.vercel-dns.com`

### Stap 10: Wacht op DNS Propagatie

- Dit kan **5 minuten tot 48 uur** duren
- Vercel toont een status indicator
- Je krijgt een ✅ groen vinkje wanneer het klaar is

---

## 🔧 Deployment Configuration

### Stap 11: Configure vercel.json (optioneel)

Maak een `vercel.json` bestand in de root van je project:

```json
{
  "regions": ["fra1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

Dit zorgt voor:
- ✅ Frankfurt region enforcement
- ✅ Security headers
- ✅ Cache control

### Stap 12: Commit en Push

```bash
git add vercel.json
git commit -m "Add Vercel configuration for EU deployment"
git push origin main
```

Vercel zal automatisch opnieuw deployen.

---

## ✅ Verificatie

### Stap 13: Test de Deployment

1. **Ga naar je site**: `https://stageconnectie.nl`
2. **Test alle functionaliteit**:
   - Admin login
   - Supervisor login
   - Employer login
   - Attendance invoeren
   - Data bekijken

3. **Check browser console** (F12):
   - Geen errors
   - Supabase verbinding werkt

4. **Verifieer EU hosting**:
   ```bash
   curl -I https://stageconnectie.nl
   ```
   Check de `x-vercel-id` header voor regio info

---

## 🗑️ Netlify Cleanup

### Stap 14: Verwijder Netlify Site (optioneel)

**Wacht minimaal 1 week** voordat je Netlify verwijdert!

1. Ga naar [app.netlify.com](https://app.netlify.com)
2. Klik op je site
3. **Settings** → **General**
4. Scroll naar beneden
5. **"Delete site"**

---

## 📊 Performance Monitoring

### Stap 15: Monitor Performance

Vercel biedt gratis analytics:

1. Ga naar je project dashboard
2. Klik op **"Analytics"** tab
3. Bekijk:
   - Page load times
   - Visitor locations
   - Error rates

---

## 🆘 Troubleshooting

**Probleem**: Site laadt niet
- **Oplossing**: Check DNS settings, wacht op propagatie

**Probleem**: 404 errors
- **Oplossing**: Controleer Root Directory setting (`./public`)

**Probleem**: Supabase verbinding werkt niet
- **Oplossing**: Controleer of nieuwe EU credentials zijn ingevuld

**Probleem**: Deployment faalt
- **Oplossing**: Check Vercel deployment logs in dashboard

---

## 📞 Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Community**: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)

---

## 🎉 Klaar!

Je StageConnect app draait nu op:
- ✅ Vercel (Frankfurt, Germany) 🇩🇪
- ✅ Supabase (West Europe, Ireland) 🇮🇪
- ✅ 100% EU hosted
- ✅ GDPR compliant
- ✅ Gratis!
