# 🚀 Vercel Deployment Guide

## Waarom Vercel?
Netlify heeft de gratis limiet bereikt. Vercel heeft hogere gratis limieten:
- ✅ 100 deployments/dag (vs Netlify 300/maand)
- ✅ 100GB bandwidth/maand
- ✅ Sneller dan Netlify

## Stap 1: Deploy naar Vercel

1. Ga naar: https://vercel.com
2. **Login** met GitHub account
3. Klik **"Add New Project"**
4. Klik **"Import Git Repository"**
5. Selecteer: `vesseurw-design/stage-connectie-app`
6. **Configure Project:**
   - Framework Preset: **Other**
   - Root Directory: `./`
   - Build Command: (leeg laten)
   - Output Directory: `public`
   - Install Command: (leeg laten)
7. Klik **"Deploy"**
8. Wacht ~2 minuten

## Stap 2: Vercel geeft je een URL

Je krijgt een URL zoals: `stage-connectie-app.vercel.app`

**Test deze URL** - de site zou moeten werken!

## Stap 3: Custom Domain toevoegen

1. In Vercel project → **Settings** → **Domains**
2. Klik **"Add Domain"**
3. Voer in: `stageconnectie.nl`
4. Vercel geeft je DNS instructies

## Stap 4: Update DNS (bij je domain provider)

Ga naar je domain provider (waar je `stageconnectie.nl` hebt gekocht):

**Verwijder:**
- Oude Netlify DNS records

**Voeg toe:**
- A record: `76.76.21.21` (Vercel IP)
- CNAME record: `www` → `cname.vercel-dns.com`

Of volg exact de instructies die Vercel geeft.

## Stap 5: Wacht op DNS propagatie

DNS update kan 5 minuten - 24 uur duren (meestal ~10 minuten).

Check status: https://dnschecker.org/#A/stageconnectie.nl

## Stap 6: Test!

Zodra DNS is geüpdatet:
1. Ga naar https://stageconnectie.nl
2. Test alle functionaliteit
3. Probeer bedrijf toevoegen (Edge Function)

---

## ✅ Klaar!

De site draait nu op Vercel met veel hogere limieten!

**Data blijft veilig in Supabase EU (Ierland)** - GDPR compliant! 🇪🇺
