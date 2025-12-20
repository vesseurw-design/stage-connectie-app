# StageConnect - Supervisor Login Credentials

**Datum:** 20 december 2024  
**Status:** ✅ Alle supervisors gemigreerd naar veilige Supabase Auth

---

## 🔐 Login Informatie

**Login URL:** https://stageconnectie.nl/supervisor-login.html

### Alle Stagebegeleiders

| Naam | Email | Tijdelijk Wachtwoord |
|------|-------|---------------------|
| Dick Everts | djev@youscope.nl | `WelkomDick2024!` |
| Hayat el Ouakill | hou@youscope.nl | `WelkomHayat2024!` |
| Irene Voogd | ime@youscope.nl | `WelkomIrene2024!` |
| Janneke de Ligny | jli@youscope.nl | `WelkomJanneke2024!` |
| Jolanda de Graaff | jgk@youscope.nl | `WelkomJolanda2024!` |
| Karen Smook | ksm@youscope.nl | `WelkomKaren2024!` |
| Manon Huttinga | mhu@youscope.nl | `WelkomManon2024!` |
| Paulien van der Leun | pln@youscope.nl | `WelkomPaulien2024!` |
| Sylvia Brunott | sbx@youscope.nl | `WelkomSylvia2024!` |
| Willemien Vesseur | wvs@youscope.nl | `WelkomWillemien2024!` |

---

## 📧 Instructies voor Supervisors

### Eerste Keer Inloggen

1. Ga naar: **https://stageconnectie.nl/supervisor-login.html**
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
- **Metadata:** role, name, supervisor_id

### Migratie Details
- **Datum:** 20 december 2024
- **Methode:** Direct INSERT in auth.users + identities
- **Oude passwords:** Nog aanwezig in `stagebegeleiders.password` kolom (kan verwijderd worden)

### Volgende Stappen
1. ✅ Test login voor alle supervisors
2. ⏳ Configureer SMTP voor email sending (Gmail/SendGrid)
3. ⏳ Stuur welkomstmail naar alle supervisors
4. ⏳ Verwijder oude `password` kolom uit database
5. ⏳ Update gebruikershandleiding

---

**⚠️ BELANGRIJK:** Bewaar dit document veilig! Het bevat tijdelijke wachtwoorden.
