# 🚀 Edge Function Deployment Guide

## Wat is dit?

Een Edge Function die het mogelijk maakt om veilig auth users aan te maken vanuit de admin portal, zonder de service role key in de frontend te hoeven zetten.

---

## 📋 Stap 1: Installeer Supabase CLI

### macOS:
```bash
brew install supabase/tap/supabase
```

### Andere systemen:
Zie: https://supabase.com/docs/guides/cli/getting-started

---

## 🔑 Stap 2: Login bij Supabase

```bash
supabase login
```

Dit opent een browser window. Login met je Supabase account.

---

## 📦 Stap 3: Link je project

```bash
cd "/Users/willemienvesseur/Stage app/stage-connect-app"
supabase link --project-ref vdeipnqyesduiohxvuvu
```

Als het vraagt om een database password, vind je die in:
- Supabase Dashboard → Project Settings → Database → Connection String

---

## 🚀 Stap 4: Deploy de functie

```bash
supabase functions deploy create-user
```

Dit upload de functie naar Supabase.

---

## ✅ Stap 5: Test de functie

Ga naar Supabase Dashboard → Edge Functions → create-user

Je zou de functie moeten zien staan als "Deployed".

---

## 🔧 Stap 6: Update de frontend code

De frontend code is al klaar! Zodra de functie is gedeployed, werkt het automatisch.

---

## 🧪 Test het

1. Ga naar: https://stageconnectie.nl/admin-users.html
2. Login als admin
3. Probeer een bedrijf/supervisor/admin toe te voegen
4. Het zou nu moeten werken! 🎉

---

## 🐛 Troubleshooting

### "Function not found"
- Check of de functie is gedeployed in Supabase Dashboard
- Wacht 1-2 minuten na deployment

### "Unauthorized"
- Check of je bent ingelogd als admin
- Check of de session nog geldig is

### "CORS error"
- De functie heeft CORS headers, dit zou niet moeten gebeuren
- Als het wel gebeurt, laat het me weten

---

## 📝 Logs bekijken

```bash
supabase functions logs create-user
```

Of in Supabase Dashboard → Edge Functions → create-user → Logs

---

**Klaar!** 🎊
