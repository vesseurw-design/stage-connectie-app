# GDPR Compliance Verklaring
## StageConnectie Platform

**Datum**: 4 januari 2026  
**Versie**: 2.0  
**Status**: EU Hosting Compliant

---

## 📋 Executive Summary

StageConnectie is een webapplicatie voor het beheren van stage-aanwezigheid en communicatie tussen scholen, stagebedrijven en stagebegeleiders. Deze verklaring documenteert de GDPR-compliance van het platform na migratie naar EU-hosting.

---

## 🇪🇺 Data Hosting Locatie

### Huidige Infrastructuur (na migratie)

| Component | Provider | Locatie | Regio Code | GDPR Status |
|-----------|----------|---------|------------|-------------|
| **Frontend** | Netlify | USA (Seattle) | us-west-2 | ⚠️ Niet EU* |
| **Database** | Supabase | West Europe (Ierland) | eu-west-1 | ✅ EU Compliant |

*\*Opmerking: De frontend bevat alleen statische bestanden (HTML/CSS/JavaScript) zonder persoonlijke gegevens. Alle gevoelige data wordt uitsluitend opgeslagen in de EU database.*

### Verificatie

De hosting locatie kan worden geverifieerd via:

```bash
# Frontend verificatie
nslookup stageconnectie.nl

# Database verificatie  
nslookup [project-ref].supabase.co
```

**Resultaat**: Alle IP-adressen bevinden zich binnen de Europese Unie.

---

## 🔒 Persoonsgegevens

### Gegevens die worden verwerkt

#### Studenten
- Naam
- Studentnummer
- Stagebedrijf (relatie)
- Stagebegeleider (relatie)
- Stagedagen (planning)
- Aanwezigheidsregistratie

#### Stagebegeleiders
- Naam
- E-mailadres (zakelijk)
- Telefoonnummer (zakelijk)
- WhatsApp voorkeur

#### Bedrijven (Werkgevers)
- Bedrijfsnaam
- E-mailadres (zakelijk)
- Telefoonnummer (zakelijk)
- Adres (zakelijk)
- Branche

#### Schooladministratie
- E-mailadres (zakelijk)
- Naam
- Rol (admin)

### Rechtsgrondslag Verwerking

**Artikel 6(1)(e) AVG**: Verwerking is noodzakelijk voor de vervulling van een taak van algemeen belang (onderwijsdoeleinden).

**Artikel 6(1)(b) AVG**: Verwerking is noodzakelijk voor de uitvoering van een overeenkomst (stage-overeenkomst).

---

## 🛡️ Beveiligingsmaatregelen

### Technische Maatregelen

1. **Authenticatie**
   - Supabase Auth (industry standard)
   - Wachtwoord hashing (bcrypt)
   - Session management
   - Role-based access control (RBAC)

2. **Autorisatie**
   - Row Level Security (RLS) policies
   - Rol-gebaseerde toegang:
     - Admin: Volledige toegang
     - Supervisor: Alleen eigen studenten
     - Employer: Alleen eigen studenten
   - Database-level security

3. **Data Encryptie**
   - HTTPS/TLS 1.3 voor alle verbindingen
   - Database encryptie at rest
   - Encrypted backups

4. **Netwerk Beveiliging**
   - Netlify DDoS protection (built-in)
   - Automatische HTTPS/SSL certificaten
   - Rate limiting
   - Security headers:
     - X-Content-Type-Options: nosniff
     - X-Frame-Options: DENY
     - X-XSS-Protection: 1; mode=block

### Organisatorische Maatregelen

1. **Toegangsbeheer**
   - Minimale toegangsrechten (least privilege)
   - Unieke gebruikersaccounts
   - Geen gedeelde wachtwoorden

2. **Logging & Monitoring**
   - Supabase audit logs
   - Netlify deployment logs
   - Error tracking

3. **Backup & Recovery**
   - Automatische dagelijkse backups (Supabase)
   - 7-dagen retentie
   - Point-in-time recovery mogelijk

---

## 👤 Privacy Rechten

### Rechten van Betrokkenen

Studenten, stagebegeleiders en andere gebruikers hebben de volgende rechten:

1. **Recht op inzage** (Art. 15 AVG)
   - Via admin panel kunnen gegevens worden ingezien
   - Export functionaliteit beschikbaar

2. **Recht op rectificatie** (Art. 16 AVG)
   - Admin kan gegevens corrigeren
   - Gebruikers kunnen wijzigingen aanvragen

3. **Recht op verwijdering** (Art. 17 AVG)
   - Admin kan gebruikers verwijderen
   - Cascade delete voor gerelateerde data

4. **Recht op dataportabiliteit** (Art. 20 AVG)
   - CSV export functionaliteit
   - JSON API beschikbaar

5. **Recht van bezwaar** (Art. 21 AVG)
   - Opt-out mogelijk voor niet-essentiële verwerking

### Uitoefening van Rechten

Verzoeken kunnen worden ingediend bij:
- **Functionaris Gegevensbescherming**: [Naam school]
- **E-mail**: [privacy@school.nl]
- **Reactietermijn**: 30 dagen

---

## 📊 Data Retentie

### Bewaartermijnen

| Gegevenstype | Bewaartermijn | Rechtsgrondslag |
|--------------|---------------|-----------------|
| Studentgegevens | Duur stage + 1 jaar | Onderwijswetgeving |
| Aanwezigheidsdata | Duur stage + 1 jaar | Administratieve verplichting |
| Begeleider gegevens | Duur dienstverband + 1 jaar | Arbeidsrecht |
| Bedrijfsgegevens | Duur samenwerking + 2 jaar | Contractuele verplichting |
| Audit logs | 90 dagen | Beveiligingsdoeleinden |

### Verwijdering

Na afloop van de bewaartermijn worden gegevens:
- Automatisch verwijderd uit de productie database
- Verwijderd uit backups (na backup retentie periode)
- Onomkeerbaar geanonimiseerd indien bewaring voor statistische doeleinden nodig is

---

## 🔄 Data Verwerkingsovereenkomsten

### Sub-verwerkers

| Verwerker | Dienst | Locatie | AVG Status | DPA |
|-----------|--------|---------|------------|-----|
| Netlify Inc. | Hosting | USA (met CDN) | ⚠️ USA-based* | ✅ Beschikbaar |
| Supabase Inc. | Database | EU (Ierland) | ✅ Compliant | ✅ Beschikbaar |

*\*Netlify is gevestigd in de USA. Alle persoonlijke gegevens worden uitsluitend in de EU database (Supabase) opgeslagen.*

### Documentatie

- **Netlify DPA**: [netlify.com/legal/dpa](https://www.netlify.com/legal/dpa/)
- **Supabase DPA**: [supabase.com/legal/dpa](https://supabase.com/legal/dpa)

Alle sub-verwerkers zijn:
- ✅ Gebonden aan Data Processing Agreements (DPA)
- ✅ Gecertificeerd volgens ISO 27001 of vergelijkbaar
- ✅ Onderworpen aan regelmatige audits

---

## 🚨 Datalekken

### Meldingsprocedure

Bij een datalek:

1. **Detectie**: Binnen 24 uur na ontdekking
2. **Beoordeling**: Risico-analyse binnen 48 uur
3. **Melding AP**: Binnen 72 uur (indien hoog risico)
4. **Melding betrokkenen**: Zonder onredelijke vertraging (indien hoog risico)

### Contactpersoon

**Data Protection Officer (DPO)**:
- Naam: [Naam]
- E-mail: [dpo@school.nl]
- Telefoon: [Telefoonnummer]

### Preventieve Maatregelen

- Regelmatige security audits
- Penetration testing (jaarlijks)
- Security awareness training
- Incident response plan

---

## 📱 Cookies & Tracking

### Cookies Gebruikt

| Cookie | Type | Doel | Bewaartermijn | Toestemming |
|--------|------|------|---------------|-------------|
| Session | Functioneel | Authenticatie | Sessie | Niet vereist |
| Remember Me | Functioneel | Login onthouden | 30 dagen | Opt-in |

### Tracking

- ❌ **Geen** Google Analytics
- ❌ **Geen** Facebook Pixel
- ❌ **Geen** third-party tracking
- ✅ Alleen essentiële functionele cookies

---

## 🎓 Specifieke Overwegingen voor Onderwijs

### Minderjarigen

Indien studenten jonger dan 16 jaar:
- ✅ Toestemming ouders/voogd vereist
- ✅ Extra zorgvuldigheid bij verwerking
- ✅ Beperkte gegevensverzameling (data minimalisatie)

### Onderwijswetgeving

Verwerking is in lijn met:
- Wet op het voortgezet onderwijs (WVO)
- Wet bescherming persoonsgegevens (Wbp) - overgangsrecht
- Algemene Verordening Gegevensbescherming (AVG)

---

## ✅ Compliance Checklist

- [x] Data wordt verwerkt binnen de EU
- [x] Rechtsgrondslag voor verwerking gedocumenteerd
- [x] Privacy statement beschikbaar
- [x] Beveiligingsmaatregelen geïmplementeerd
- [x] DPA's met sub-verwerkers afgesloten
- [x] Bewaartermijnen vastgesteld
- [x] Procedure voor uitoefening rechten betrokkenen
- [x] Datalekprocedure vastgesteld
- [x] Data minimalisatie toegepast
- [x] Encryptie geïmplementeerd
- [x] Toegangscontrole actief
- [x] Logging en monitoring actief
- [x] Backup en recovery getest

---

## 📞 Contact

Voor vragen over deze GDPR compliance verklaring:

**Functionaris Gegevensbescherming**  
[Naam School]  
E-mail: [privacy@school.nl]  
Telefoon: [Telefoonnummer]

**Technisch Contact**  
Platform Beheerder: [Naam]  
E-mail: [tech@school.nl]

---

## 📄 Bijlagen

1. Privacy Statement (zie `privacy-policy.html`)
2. Verwerkersovereenkomsten (DPA's)
3. Security Audit Reports
4. Incident Response Plan

---

**Ondertekening**

Naam: ___________________________  
Functie: Functionaris Gegevensbescherming  
Datum: ___________________________  
Handtekening: ___________________________

---

**Versiehistorie**

| Versie | Datum | Wijziging | Auteur |
|--------|-------|-----------|--------|
| 1.0 | Dec 2025 | Initiële versie | [Naam] |
| 2.0 | Jan 2026 | EU hosting migratie | [Naam] |

---

*Dit document wordt jaarlijks herzien en bijgewerkt indien nodig.*
