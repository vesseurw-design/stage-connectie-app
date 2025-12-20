# StageConnect - Employer Login Credentials

**Datum:** 20 december 2024  
**Status:** ✅ Alle 6 bedrijven gemigreerd naar veilige Supabase Auth

---

## 🔐 Login Informatie

**Login URL:** https://stageconnectie.nl/login.html

### Alle Bedrijven

| Bedrijfsnaam | Contactpersoon | Email | Tijdelijk Wachtwoord |
|--------------|----------------|-------|---------------------|
| Perspektief | Madelon Jautze | madelon@perspektiefacademie.nl | `WelkomPerspektief2024!` |
| GSB | Mathijs Broer | info@gsbgrafischeafwerking.nl | `WelkomGSB2024!` |
| Activite Zuidervaart | Rineke Heemskerk | r.heemskerk@activite.nl | `WelkomActiviteZ2024!` |
| Activite Noorderbrink | Petra Ooms | p.ooms@activite.nl | `WelkomActiviteN2024!` |
| Timmerfabriek Koenekoop | Mart Koenekoop | info@timmerfabriekkoenekoop.nl | `WelkomTimmerfabriek2024!` |
| nagelgroothandel Korneliya | Alex van Harskamp | alexvanharskamp@hotmail.com | `WelkomKorneliya2024!` |

---

## 📧 Instructies voor Werkgevers

### Eerste Keer Inloggen

1. Ga naar: **https://stageconnectie.nl/login.html**
2. Vul je email adres in (zie tabel hierboven)
3. Vul je tijdelijke wachtwoord in (zie tabel hierboven)
4. Klik op "Inloggen"

### Eigen Wachtwoord Instellen (Aanbevolen!)

Na eerste login wordt aangeraden om je eigen wachtwoord in te stellen:

1. Klik op "Wachtwoord vergeten?" op de login pagina
2. Vul je email adres in
3. Je ontvangt een email met een reset link
4. Klik op de link en stel je eigen wachtwoord in

**Wachtwoord eisen:**
- Minimaal 8 tekens
- Minimaal 1 hoofdletter
- Minimaal 1 kleine letter
- Minimaal 1 cijfer
- Minimaal 1 speciaal teken (!@#$%^&*)

---

## 🔒 Beveiliging

- ✅ Alle wachtwoorden zijn veilig opgeslagen met bcrypt hashing
- ✅ Geen plain-text wachtwoorden meer in de database
- ✅ GDPR-compliant
- ✅ Password reset functionaliteit beschikbaar
- ✅ Session management via Supabase Auth

---

## 🆘 Problemen?

**Kan niet inloggen?**
- Controleer of je het juiste email adres gebruikt (kleine letters!)
- Controleer of je het wachtwoord correct hebt overgetypt (let op hoofdletters!)
- Probeer de "Wachtwoord vergeten?" functie

**Wachtwoord vergeten?**
1. Klik op "Wachtwoord vergeten?" op de login pagina
2. Vul je email adres in
3. Check je inbox voor de reset link
4. Stel een nieuw wachtwoord in

**Andere problemen?**
Neem contact op met de applicatiebeheerder.

---

## 📝 Notities voor Beheerder

### Database Info
- **Auth Provider:** Supabase Auth
- **Password Hashing:** bcrypt (gen_salt('bf'))
- **Email Confirmed:** Ja (alle users)
- **Metadata:** role, company_name, contact_person

### Volgende Bedrijven Toevoegen

**Via CSV Import:**
1. Voeg bedrijven toe aan CSV bestand
2. Gebruik import script om bedrijven toe te voegen
3. Gebruik auth creation script om auth users te maken

**Handmatig:**
1. Voeg bedrijf toe aan `Bedrijven` tabel
2. Maak auth user aan via Supabase Dashboard of SQL
3. Koppel `auth_user_id`

---

**⚠️ BELANGRIJK:** Bewaar dit document veilig! Het bevat tijdelijke wachtwoorden.
