HANDLEIDING: DATAVERWIJDERING EN SCHONINGSBELEID
StageConnectie - AVG en GDPR Bewaartermijnen (Stagiairgegevens en Stageovereenkomsten)

Versie: 2026
Website: https://stageconnectie.nl


1. WETTELIJKE ACHTERGROND EN BELEID

In het kader van de Algemene Verordening Gegevensbescherming (AVG / GDPR) is het wettelijk verplicht om persoonsgegevens van stagiairs niet langer te bewaren dan noodzakelijk voor het doel waarvoor ze zijn verzameld.

Voor StageConnectie gelden twee strikte bewaar- en schoningsregels:
1. Stageovereenkomsten (PDF-bestanden met o.a. woonadres): StageConnectie fungeert uitsluitend als beveiligd doorgeefluik voor de digitale ondertekening door de 4 partijen (school, stagebedrijf, stagiair en ouder/verzorger). Zodra alle partijen hebben getekend en de schoolbeheerder (Admin) de PDF heeft geprint of opgeslagen voor het leerlingvolgsysteem (LVS), wist de Admin het PDF-bestand direct via het ingebouwde AVG-veiligheidsslot.
2. Stagiair- en aanwezigheidsgegevens: alle persoonsgegevens en aanwezigheidsregistraties van een stagiair worden definitief verwijderd exact 1 jaar na de geregistreerde uitschrijfdatum (unenrollment_date).


2. DIRECT WISSEN VAN ONDERTEKENDE STAGEOVEREENKOMSTEN (AVG-VEILIGHEIDSSLOT)

Omdat een LVS-stageovereenkomst adresgegevens van de leerling kan bevatten, worden deze PDF-bestanden niet permanent in StageConnectie bewaard:
1. Open in het Admin Portaal het overzicht via de knop Stageovereenkomsten (of klik in Stagiairs Beheer achter een stagiair op Overeenkomst).
2. Controleer of alle 4 de partijen hebben getekend (4/4 ondertekend).
3. Klik eerst op Print / Download om de volledig ondertekende PDF af te drukken of op te slaan in het LVS van school.
4. Pas nadat op Print / Download is geklikt, wordt het AVG-veiligheidsslot ontgrendeld en wordt de rode knop PDF definitief wissen (AVG) actief.
5. Klik op PDF definitief wissen (AVG), vink de bevestiging aan dat het document in het LVS van school is opgeslagen en bevestig.
6. Wat wordt er gewist? Het PDF-bestand wordt direct verwijderd uit de Supabase Storage bucket (stageovereenkomsten) en het veld pdf_base64 in de database wordt volledig leeggemaakt. Bij de stagiair blijft uitsluitend de groene status Stageovereenkomst Afgerond & AVG-gearchiveerd en de ondertekenmetadata (wie op welk tijdstip heeft getekend) bewaard.


3. DE UITSCHRIJFDATUM INSTELLEN IN HET ADMIN PORTAAL

Bij het toevoegen of bewerken van een stagiair in het Admin Portaal (onder Stagiairs Beheer) vind je het veld Uitschrijfdatum:
1. Vul hier de datum in waarop de stagiair de opleiding naar verwachting afrondt of verlaat.
2. Deze datum wordt veilig opgeslagen in de centrale database in het veld unenrollment_date.
3. Het systeem gebruikt deze datum als referentiepunt voor de wettelijke bewaartermijn van 1 jaar.


4. HANDMATIGE CONTROLE EN VERWIJDERING VIA SUPABASE

Als beheerder kun je periodiek (bijvoorbeeld jaarlijks bij aanvang van het nieuwe schooljaar) controleren welke stagiairs langer dan 1 jaar zijn uitgeschreven en deze records definitief schonen.

Stap 1: Inloggen op het database dashboard
1. Log in op het Supabase Dashboard (https://supabase.com/dashboard).
2. Selecteer het Europese productieproject van StageConnectie.
3. Klik in het linkermenu op Table Editor en open de tabel Students.

Stap 2: Filteren op verlopen stagiairs
1. Klik bovenaan op de knop Filter.
2. Stel het volgende filter in:
   - Column: unenrollment_date
   - Operator: is less than
   - Value: vul de datum in van exact 1 jaar geleden (bijvoorbeeld: als het vandaag 5 november 2026 is, vul je 2025-11-05 in).
3. Klik op Apply.

Stap 3: De records definitief verwijderen
1. Je ziet nu uitsluitend de stagiairs die langer dan 1 jaar zijn uitgeschreven.
2. Selecteer deze rijen via het selectievakje bovenaan en klik op Delete rows om de records definitief te wissen.


5. AUTOMATISCHE CASCADE VERWIJDERING (WAT WORDT ER GEWIST?)

Dankzij de databaseconfiguratie met Cascade Delete gebeurt het volgende automatisch zodra een stagiairrecord wordt verwijderd:
1. De stagiairgegevens uit de tabel Students worden permanent gewist.
2. Alle gekoppelde aanwezigheidsregistraties, uren en dagverslagen van deze stagiair in de tabel Attendance worden automatisch gelijktijdig gewist.
3. Eventuele gekoppelde records voor stageovereenkomsten en pushmeldingen komen direct te vervallen.
Er blijven dus geen achtergebleven of verweesde persoonsgegevens in de database achter.


6. AUTOMATISCHE SCHONING VIA CRON-JOB (OPTIONEEL)

Om het schoningsproces volledig handenvrij te laten verlopen, kan een geautomatiseerde nachtelijke taak (Cron Job) in Supabase worden gebruikt die elke nacht om 03:00 uur de volgende SQL-opdracht uitvoert:

DELETE FROM "Students"
WHERE unenrollment_date < NOW() - INTERVAL '1 year';

Hierdoor worden verlopen stagiairs en hun aanwezigheidsgegevens elke nacht automatisch conform de wetgeving gewist.


7. AANBEVELING VOOR DE SCHOOLADMINISTRATIE

- Wis ondertekende stageovereenkomst-PDF's direct zodra ze voor het LVS zijn geprint of gedownload via het AVG-veiligheidsslot.
- Zet een vaste jaarlijkse herinnering in de schoolagenda (bijvoorbeeld in de eerste week na de zomervakantie) om de uitschrijfdatums en bewaartermijnen in de database te controleren. Zo voldoet je school te allen tijde aantoonbaar aan de verwerkersovereenkomst en de AVG.
