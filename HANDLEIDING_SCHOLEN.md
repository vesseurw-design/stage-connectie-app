# Handleiding StageConnectie: Inrichting & Gebruik voor Scholen
**Een complete gids voor Beheerders, Stagebegeleiders, Bedrijven en Stagiairs**

---

## 1. Introductie tot StageConnectie
StageConnectie is een modern, gebruiksvriendelijk platform dat de administratie en monitoring van stages volledig digitaliseert. Het vervangt papieren handtekeningenlijsten en handmatige verzuimregistratie door een real-time webomgeving die werkt op computers, tablets en smartphones.

### De vier rollen binnen StageConnectie:
1. **Schoolbeheerders (Admins)**: Richt de schoolomgeving in, beheert gebruikers, importeert bulkgegevens en configureert vakantieperiodes.
2. **Stagebegeleiders (Docenten/Coaches)**: Monitoren hun eigen studenten real-time via een live dashboard met in-app notificaties (wanneer de pagina openstaat) en historische rapportages.
3. **Stagebedrijven (Werkgevers)**: Registreren wekelijks of dagelijks de aanwezigheid van hun stagiairs met één klik (Aanwezig, Afwezig, Ziek of Te Laat).
4. **Stagiairs (Studenten)**: Bekijken hun eigen aanwezigheidshistorie, registreren hun gewerkte uren en melden verzuim via een verplichte stappen-checklist.

---

## 2. Inrichting door de School (Admin Portal)

Als school start u met het inrichten van de database. Dit kan handmatig via het dashboard, of in bulk via de CSV-importfuncties.

> [!IMPORTANT]
> **Inloggen met uw eigen webadres**: Elke school gebruikt StageConnectie via een eigen, uniek webadres (URL). Log altijd in via het specifieke adres dat u heeft ontvangen (bijvoorbeeld: `https://[schoolnaam].stageconnectie.nl/...`).

### Inloggen als Admin
1. Navigeer naar de inlogpagina voor beheerders via het specifieke webadres dat u heeft ontvangen (bijvoorbeeld: **`https://[schoolnaam].stageconnectie.nl/admin-login.html`**).
2. Voer uw admin-e-mailadres en wachtwoord in.
3. Klik op **Inloggen** om naar het **Admin Dashboard** te gaan.

---

### Bulk Inrichting via CSV Import (Aanbevolen)
Voor een snelle start bij het begin van een nieuw schooljaar of periode gebruikt u de CSV-importeur (te openen via de knop **"Importeer CSV"** bovenin het dashboard).

#### Stap 1: Stagiairs Importeren
Met de stagiairs-import kunt u in één keer leerlingen toevoegen én koppelen aan hun stagebedrijf en begeleider.
* **Vereiste CSV-kolommen**: `naam` (of `voornaam` en `achternaam`), `email`, `wachtwoord`.
* **Optionele/Koppelingskolommen**: `klas`, `schooljaar`, `stagebedrijf` (naam van het bedrijf), `stagebedrijf_email`, `begeleider` (naam begeleider), `begeleider_email`, `startdatum`, `einddatum`.

> [!TIP]
> **Magische Auto-Koppeling**: Als een stagebedrijf of begeleider in de leerlingen-CSV staat maar nog niet in het systeem bestaat, maakt StageConnectie deze accounts direct en automatisch aan op basis van de ingevulde e-mailadressen!

#### Stap 2: Stagebedrijven Importeren
Importeer losse stagebedrijven die nog niet gekoppeld zijn aan stagiairs.
* **Vereiste CSV-kolommen**: `bedrijfsnaam`, `email`, `contactpersoon` (de praktijkbegeleider), `telefoonnummer`.
* **Optionele kolommen**: `adres`, `postcode`, `plaats`.

#### Stap 3: Begeleiders Importeren
Importeer docenten of stagecoaches.
* **Vereiste CSV-kolommen**: `naam`, `email`, `telefoonnummer`.
* **Optionele kolommen**: `whatsapp` (vul in: `true` of `false` om WhatsApp-contact direct toe te staan).

> [!IMPORTANT]
> **Uitnodigingen direct of achteraf sturen**:
> * **Direct sturen (Standaard)**: Vink bij het importeren de optie **"Stuur direct uitnodiging/welkomstmail"** aan. Het systeem stuurt de gebruikers dan direct een e-mail om hun account te activeren of inloggegevens te ontvangen.
> * **Achteraf sturen (Handig tijdens vakanties)**: Vink deze optie **uit** tijdens het importeren. De accounts en koppelingen worden aangemaakt in het systeem, maar er wordt nog geen e-mail verzonden. Wanneer de school begint, opent u de pagina **"Importeer CSV"** en klikt u onderin bij de sectie **"Uitnodigingen Achteraf Versturen"** op de knoppen om de e-mails alsnog in bulk te verzenden naar de stagiairs, stagebedrijven of stagebegeleiders.

---

### Handmatige Inrichting & Beheer
Wanneer u tussentijds mutaties wilt doorvoeren, doet u dit via de specifieke beheerpagina's:

#### A. Branches/Vakgebieden beheren (knop **"Branches"**)
Voordat u bedrijven aanmaakt, kunt u branches definiëren (bijv. *Bouw & Infra*, *ICT*, *Zorg & Welzijn*) zodat bedrijven later gefilterd kunnen worden.

#### B. Stagebedrijven beheren (knop **"Stagebedrijven Beheer"**)
1. Klik op **"+ Nieuw Stagebedrijf"**.
2. Vul de bedrijfsnaam en het e-mailadres (voor inloggen) in.
3. Vul de **Praktijkbegeleider** (contactpersoon) en het **verplichte Telefoonnummer** in. *(Let op: dit telefoonnummer is verplicht zodat studenten het bedrijf direct kunnen bellen vanuit het studentenportaal bij verzuim).*
4. Klik op **Opslaan**. *(Opmerking: U hoeft geen wachtwoord in te voeren; het systeem verzendt automatisch een uitnodigingslink via e-mail).*

#### C. Stagebegeleiders beheren (knop **"Begeleiders Beheer"**)
1. Klik op **"+ Nieuwe Begeleider"**.
2. Vul naam, e-mailadres en het **verplichte telefoonnummer** (voor snel contact) in.
3. Vink **"WhatsApp beschikbaar"** aan als werkgevers en leerlingen deze begeleider via WhatsApp mogen benaderen.
4. Klik op **Opslaan**. *(Opmerking: Er is geen wachtwoordveld. De begeleider krijgt automatisch een uitnodigingsmail om zelf een wachtwoord aan te maken).*

#### D. Studenten beheren (knop **"Stagiairs Beheer"**)
1. Klik op **"+ Nieuwe Student"**.
2. Vul naam en e-mailadres in, en optioneel de klas en het schooljaar.
3. **Wachtwoord instellen** (alleen bij nieuwe student): Voer een wachtwoord in van minimaal 6 tekens. *(Let op: voor studenten wordt er geen automatische uitnodigingsmail gestuurd; u dient als admin zelf dit wachtwoord te bepalen en aan de student te communiceren).*
4. Selecteer het **Stagebedrijf** en de **Stagebegeleider** uit de dropdown-lijsten.
5. **Stageperiode instellen**: Vul de **Startdatum stage** en **Einddatum stage** in. *(Let op: na deze einddatum stopt het systeem automatisch met het sturen van herinneringsmails op vrijdagmiddag naar het stagebedrijf).*
6. **Uitschrijfdatum** (optioneel): Vul de datum in waarop de student de opleiding verlaat. De persoonsgegevens worden conform GDPR-wetgeving automatisch 1 jaar na deze datum uit het systeem verwijderd.
7. Vink aan op welke **stagedagen** de student aanwezig moet zijn (bijv. Maandag t/m Donderdag).
8. Klik op **Opslaan**.

---

### Vakanties Beheren (knop **"Vakanties"**)
Om te voorkomen dat bedrijven en begeleiders onnodig meldingen krijgen tijdens schoolvakanties, stelt u vakantieperiodes in:
1. Klik bovenin op de knop **"Vakanties"**.
2. Voer de naam van de vakantie in (bijv. *Kerstvakantie 2026*).
3. Selecteer de **Startdatum** en de **Einddatum**.
4. Klik op **Toevoegen**.
*Gedurende deze datums verwacht het systeem geen aanwezigheidsregistraties.*

---

## 3. Gebruik door Stagebegeleiders (Supervisor Portal)

Stagebegeleiders hebben een live dashboard waarmee ze verzuim direct kunnen opvolgen.

### Inloggen
1. Ga naar het specifieke webadres dat u van de school heeft ontvangen (bijvoorbeeld: **`https://[schoolnaam].stageconnectie.nl/supervisor-login.html`**).
2. Log in met uw e-mailadres en wachtwoord.

> [!NOTE]
> **Eerste keer opstarten**: U ontvangt een e-mail met een uitnodigingslink. Klik op de link in deze e-mail om uw account te activeren en uw eigen wachtwoord in te stellen.

### Het Dashboard
Na inloggen toont de app het real-time dashboard met:
* **Statistieken**: Het totaal aantal studenten onder uw begeleiding, en hoeveel er vandaag aanwezig, afwezig of ziek zijn.
* **Datum & Status Filters**: Bekijk de aanwezigheid van specifieke dagen uit het verleden of filter op leerlingen die vandaag ziek of afwezig zijn.
* **Automatische verversing (Auto-Refresh)**: Het dashboard ververst elke 10 seconden automatisch om de nieuwste aanwezigheidsgegevens op te halen. U kunt ook handmatig op de blauwe "Ververs"-knop klikken.
* **In-App Notificaties (Banners)**: Als u het portaal geopend laat staan in uw browser, toont het systeem real-time een blauwe melding bovenaan het scherm en klinkt er een geluidssignaal zodra een stagebedrijf een aanwezigheid registreert. Let op: er worden geen e-mails of push-notificaties verzonden wanneer de browserpagina is gesloten.

### Studentdetails & Historie
1. Klik op de kaart van een student.
2. Een popup opent met alle contactgegevens en de **complete aanwezigheidshistorie**.
3. Gebruik het **Maand Filter** in de geschiedenis om verzuim over specifieke periodes te analyseren voor voortgangsgesprekken.

---

## 4. Gebruik door Stagebedrijven (Employer Portal)

Het stagebedrijf vult de aanwezigheid in van de stagiairs. Dit kost hen minder dan een minuut per week.

### Inloggen
1. Ga naar het specifieke webadres dat u van de school heeft ontvangen (bijvoorbeeld: **`https://[schoolnaam].stageconnectie.nl/login.html`**).
2. Log in met uw e-mailadres en wachtwoord.

> [!NOTE]
> **Eerste keer opstarten**: U ontvangt een e-mail met een uitnodigingslink. Klik op de link in deze e-mail om uw account te activeren en uw eigen wachtwoord in te stellen.

### Contact met de Begeleider
Bovenaan het portaal ziet het bedrijf de naam van de gekoppelde stagebegeleider. Met de directe **Bellen**-knop en **WhatsApp**-knop (indien ingeschakeld) kan het bedrijf direct contact opnemen bij vragen of incidenten.

### Aanwezigheid Registreren
1. U ziet een weekrooster met de gekoppelde stagiairs en de dagen van de week.
2. Klik op een cel (bijvoorbeeld *Maandag* bij leerling *Jan Jansen*).
3. Kies de status in het menu dat verschijnt:
   * **Aanwezig**
   * **Afwezig**
   * **Ziek**
   * **Te laat** (stel met de slider in hoeveel minuten de student te laat was).
4. Klik rechtsboven op de blauwe knop **"Wijzigingen Opslaan"** om de invoer definitief te synchroniseren met de school.

---

## 5. Gebruik door Studenten (Student Portal)

Studenten kunnen hun eigen stage-uren bijhouden en verzuim direct digitaal melden.

### Inloggen
1. Ga naar het specicieke webadres dat u van de school heeft ontvangen (bijvoorbeeld: **`https://[schoolnaam].stageconnectie.nl/student-login.html`**).
2. Log in met uw e-mailadres en wachtwoord.

### Uren & Aanwezigheid Registreren
* **Urenregistratie**: Studenten kunnen per stagedag klikken op de dag en het exacte aantal gewerkte uren invoeren (bijv. `8 uur`).
* **Week Opslaan**: Klik op **"Week Opslaan"** om de urenstaat in te dienen.
* **Geschiedenis**: Onder het tabblad **"Mijn aanwezigheidsgeschiedenis"** ziet de student een compleet overzicht van alle eerdere registraties.

### Verplichte Verzuimmelding (Compliance Checklist)
Wanneer een student zichzelf op *Afwezig* zet (een student kan zichzelf in het portaal namelijk niet direct op *Ziek* zetten, alleen op *Afwezig*), verschijnt er een pop-up met een verplichte checklist die moet worden afgevinkt voordat de status kan worden opgeslagen:
1. [ ] **Stagebedrijf bellen**: De student moet eerst bellen met het bedrijf. *Er staat een directe groene belknop in de popup naar het telefoonnummer van het stagebedrijf.*
2. [ ] **Begeleider appen**: De student moet een bericht sturen naar de schoolcoach.
3. [ ] **Ouders bellen**: De ouders moeten naar de school bellen om de afwezigheid te bevestigen.

*De knop "Alles gedaan" wordt pas klikbaar als alle drie de stappen zijn aangevinkt.*

---

## 6. Wachtwoordbeheer & Veiligheid

### Wachtwoorden Resetten
* **Privacy & Veiligheid**: Bestaande wachtwoorden zijn te allen tijde versleuteld (encrypted) opgeslagen. Niemand — ook de school-beheerder (admin) niet — kan deze inzien of overschrijven.
* **Begeleiders & Bedrijven**: Zij kunnen bij verlies hun wachtwoord zelfstandig resetten via de link **"Wachtwoord vergeten?"** op hun inlogpagina. Zij ontvangen dan een beveiligde reset-link per e-mail.
* **Stagiairs**: Stagiairs kunnen hun wachtwoord **niet** zelf resetten of wijzigen via de app. Mocht een leerling het wachtwoord vergeten zijn, dan dient de school-beheerder (admin) contact opnemen met de applicatiebeheerder (ontwikkelaar) om dit wachtwoord in het databasebeheer te laten herstellen.

### GDPR & Privacy
* **EU Hosting**: Alle gegevens worden veilig opgeslagen binnen Europese datacenters (GDPR/AVG-compliant).
* **HTTPS**: De verbinding is te allen tijde beveiligd met SSL-encryptie.
* **Wachtwoordbeveiliging**: Wachtwoorden worden via enterprise-grade encryptie (Bcrypt) versleuteld opgeslagen.

---

*Hulp nodig? Neem contact op via **support@stageconnectie.nl**.*
