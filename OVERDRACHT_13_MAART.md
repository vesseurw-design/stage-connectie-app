
# Overdracht StageConnectie - 13 Maart 2026 ✅

## ✅ Wat we vandaag hebben bereikt

1. **Leerlingen inlogaccounts aangemaakt (batch 1 — 13 leerlingen)**
   - Auth-accounts aangemaakt in Supabase voor de eerste groep leerlingen.
   - Wachtwoord = geboortedatum (6 cijfers, bijv. `280509`).
   - E-mailadressen gekoppeld in de `Students` tabel zodat het portal de leerling kan vinden na inloggen.
   - Bug opgelost: `ON CONFLICT (email)` werkt niet in `auth.users` → opgelost met `IF NOT EXISTS`.
   - Bug opgelost: de `Students` tabel had geen e-mailadressen → per leerling bijgewerkt via `UPDATE ... WHERE name ILIKE`.

2. **Leerlingen inlogaccounts aangemaakt (batch 2 — 30 leerlingen)**
   - Zelfde procedure herhaald voor de tweede groep van 30 leerlingen.
   - Totaal: **43 leerlingen** kunnen nu inloggen.

3. **Overzichtslijst inloggegevens gemaakt**
   - Alle 43 leerlingen staan in `leerling_inloggegevens.md` (in de Antigravity artifacts map).
   - Gesorteerd op naam, met e-mailadres en wachtwoord.

## 🔐 Inloggen leerlingen

- **URL:** [stageconnectie.nl/student-login.html](https://stageconnectie.nl/student-login.html)
- **E-mail:** youscope-adres (bijv. `41752@youscope.nl`)
- **Wachtwoord:** geboortedatum als 6 cijfers (bijv. `280509` = 28 mei 2009)

## 🚀 Volgende stappen voor de volgende sessie

- [ ] Leerlingen koppelen aan hun stagebedrijf (`company_id` in `Students` tabel)
- [ ] Leerlingen koppelen aan hun stagebegeleider (`supervisor_id` in `Students` tabel)
- [ ] Eventuele extra leerlingen toevoegen (zelfde procedure als vandaag)
- [ ] Testen of leerlingen aanwezigheid correct kunnen opslaan

## 📁 Relevante bestanden

| Bestand | Inhoud |
|---------|--------|
| `leerling_inloggegevens.md` | Volledige lijst met inloggegevens alle 43 leerlingen |
| `NIEUWE_GEBRUIKERS_AANMAKEN.md` | Handleiding voor het aanmaken van nieuwe gebruikers |

*Goed gedaan vandaag! 43 leerlingen staan klaar.* 🎉
