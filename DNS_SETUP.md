# DNS Setup Guide - stageconnectie.nl

**Domeinnaam:** stageconnectie.nl  
**Registrar:** TransIP  
**Hosting:** Vercel  
**Datum:** 13 December 2024

---

## Stap 1: TransIP DNS Configuratie

### Inloggen
1. Ga naar [transip.nl](https://www.transip.nl)
2. Log in met je account
3. Ga naar **Mijn TransIP** → **Domeinen**
4. Klik op **stageconnectie.nl**

### DNS Records Toevoegen

Klik op **DNS** in het menu en voeg deze records toe:

#### Record 1: Root Domain (A Record)
```
Type:    A
Naam:    @ (of laat leeg)
Waarde:  76.76.21.21
TTL:     300
```

**Wat doet dit?**  
Dit wijst `stageconnectie.nl` naar Vercel's servers.

---

#### Record 2: WWW Subdomain (CNAME Record)
```
Type:    CNAME
Naam:    www
Waarde:  cname.vercel-dns.com
TTL:     300
```

**Wat doet dit?**  
Dit wijst `www.stageconnectie.nl` ook naar Vercel.

---

### Opslaan
1. Klik op **Opslaan** of **DNS records opslaan**
2. Je ziet een bevestiging: "DNS records succesvol opgeslagen"

---

## Stap 2: Vercel Domain Configuratie

### Domain Toevoegen
1. Ga naar [vercel.com](https://vercel.com)
2. Log in
3. Selecteer je project: **stage-connectie-app**
4. Ga naar **Settings** → **Domains**

### Voeg Beide Domains Toe

#### Hoofddomein
1. Klik op **Add**
2. Voer in: `stageconnectie.nl`
3. Klik op **Add**

#### WWW Subdomain
1. Klik op **Add**
2. Voer in: `www.stageconnectie.nl`
3. Klik op **Add**

---

## Stap 3: Verificatie en Wachten

### DNS Propagatie
- **Tijd:** 10-30 minuten (soms tot 2 uur)
- **Status:** Check in Vercel bij Settings → Domains

### Status Indicatoren

**Tijdens configuratie:**
```
stageconnectie.nl          ⏳ Pending
www.stageconnectie.nl      ⏳ Pending
```

**Als het werkt:**
```
stageconnectie.nl          ✅ Valid Configuration
www.stageconnectie.nl      ✅ Valid Configuration
```

**Bij problemen:**
```
stageconnectie.nl          ❌ Invalid Configuration
```

---

## Stap 4: SSL Certificaat

### Automatische Provisioning
Vercel regelt automatisch een **gratis SSL certificaat** via Let's Encrypt.

**Wanneer?**
- Zodra DNS correct is geconfigureerd
- Duurt 5-10 minuten extra
- Geen actie vereist van jou

**Status Check:**
In Vercel zie je:
```
🔒 SSL Certificate: Active
```

---

## Stap 5: Testen

### Wacht 30 Minuten
Na het configureren, wacht minimaal 30 minuten voor DNS propagatie.

### Test de URLs

Open een **incognito venster** (om cache te vermijden):

1. **Hoofddomein:**
   - Ga naar: `https://stageconnectie.nl`
   - ✅ Moet je app tonen

2. **WWW Subdomain:**
   - Ga naar: `https://www.stageconnectie.nl`
   - ✅ Moet je app tonen

3. **HTTP Redirect:**
   - Ga naar: `http://stageconnectie.nl`
   - ✅ Moet automatisch redirecten naar `https://stageconnectie.nl`

4. **Oude Vercel URL:**
   - Ga naar: `https://stage-connectie-app-3.vercel.app`
   - ✅ Moet nog steeds werken (blijft actief)

---

## Troubleshooting

### ❌ "Invalid Configuration" in Vercel

**Oorzaak:** DNS is nog niet gepropageerd of verkeerd geconfigureerd

**Oplossing:**
1. Wacht nog 10-20 minuten
2. Check DNS records in TransIP (zie Stap 1)
3. Gebruik [dnschecker.org](https://dnschecker.org):
   - Voer in: `stageconnectie.nl`
   - Check of het wijst naar `76.76.21.21`

---

### 🌐 "This site can't be reached"

**Oorzaak:** DNS is nog niet actief

**Oplossing:**
1. Wacht 30-60 minuten
2. Clear browser cache (`Cmd + Shift + Delete`)
3. Test in incognito mode
4. Test met [dnschecker.org](https://dnschecker.org)

---

### 🔒 SSL Certificaat niet actief

**Oorzaak:** DNS moet eerst werken voordat SSL kan worden uitgegeven

**Oplossing:**
1. Wacht tot DNS status ✅ is in Vercel
2. Wacht nog 5-10 minuten extra
3. Vercel regelt SSL automatisch
4. Refresh de Vercel Domains pagina

---

### 🔄 DNS Check Tool

Gebruik deze tool om te controleren of DNS wereldwijd is gepropageerd:

1. Ga naar [dnschecker.org](https://dnschecker.org)
2. Voer in: `stageconnectie.nl`
3. Selecteer type: **A**
4. Klik op **Search**
5. Je moet `76.76.21.21` zien bij meerdere locaties

Voor CNAME:
1. Voer in: `www.stageconnectie.nl`
2. Selecteer type: **CNAME**
3. Je moet `cname.vercel-dns.com` zien

---

## Verwachte Tijdlijn

| Stap | Tijd | Status |
|------|------|--------|
| DNS records toevoegen in TransIP | 2 min | ✅ Direct |
| Domain toevoegen in Vercel | 2 min | ✅ Direct |
| DNS propagatie start | 0-5 min | ⏳ Wachten |
| DNS wereldwijd actief | 10-30 min | ⏳ Wachten |
| Vercel detecteert DNS | 30-60 min | ⏳ Wachten |
| SSL certificaat uitgegeven | 35-70 min | ⏳ Wachten |
| **Website volledig live** | **40-90 min** | ✅ **Klaar!** |

---

## Primary Domain Instellen (Optioneel)

Als je wilt dat alle URLs automatisch redirecten naar `stageconnectie.nl`:

1. Ga naar Vercel → Settings → Domains
2. Klik op de **3 puntjes** naast `stageconnectie.nl`
3. Selecteer **Set as Primary Domain**
4. Alle andere URLs redirecten nu automatisch:
   - `www.stageconnectie.nl` → `stageconnectie.nl`
   - `stage-connectie-app-3.vercel.app` → `stageconnectie.nl`

---

## Checklist

Vink af wanneer klaar:

- [ ] DNS A record toegevoegd in TransIP (`@` → `76.76.21.21`)
- [ ] DNS CNAME record toegevoegd in TransIP (`www` → `cname.vercel-dns.com`)
- [ ] DNS records opgeslagen in TransIP
- [ ] `stageconnectie.nl` toegevoegd in Vercel
- [ ] `www.stageconnectie.nl` toegevoegd in Vercel
- [ ] 30 minuten gewacht voor DNS propagatie
- [ ] DNS check gedaan op dnschecker.org
- [ ] Vercel toont ✅ Valid Configuration
- [ ] SSL certificaat is actief (🔒)
- [ ] `https://stageconnectie.nl` werkt in browser
- [ ] `https://www.stageconnectie.nl` werkt in browser
- [ ] HTTP redirect werkt (http → https)
- [ ] Primary domain ingesteld (optioneel)

---

## Support

Bij problemen:
- **Vercel Status:** [vercel-status.com](https://www.vercel-status.com)
- **TransIP Support:** [transip.nl/support](https://www.transip.nl/support)
- **DNS Check:** [dnschecker.org](https://dnschecker.org)

---

**Succes!** 🚀

*Na deze setup is je app beschikbaar op https://stageconnectie.nl*
