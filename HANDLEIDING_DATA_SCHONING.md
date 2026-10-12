HANDLEIDING: DATAVERWIJDERING EN SCHONINGSBELEID
StageConnectie - AVG en GDPR Bewaartermijnen

Versie: 2026
Website: https://stageconnectie.nl


1. WETTELIJKE ACHTERGROND EN BELEID

In het kader van de Algemene Verordening Gegevensbescherming (AVG / GDPR) is het wettelijk verplicht om persoonsgegevens van stagiairs niet langer te bewaren dan noodzakelijk voor het doel waarvoor ze zijn verzameld.

Voor StageConnectie geldt het volgende beleid:
Alle persoonsgegevens en aanwezigheidsregistraties van een stagiair worden definitief verwijderd exact 1 jaar na de geregistreerde uitschrijfdatum (unenrollment date).


2. DE UITSCHRIJFDATUM INSTELLEN IN HET ADMIN PORTAAL

Bij het toevoegen of bewerken van een stagiair in het Admin Portaal (onder Stagiairs Beheer) vind je het veld Uitschrijfdatum:
1. Vul hier de datum in waarop de stagiair de opleiding naar verwachting afrondt of verlaat.
2. Deze datum wordt veilig opgeslagen in de centrale database in het veld unenrollment_date.
3. Het systeem gebruikt deze datum als referentiepunt voor de wettelijke bewaartermijn.


3. HANDMATIGE CONTROLE EN VERWIJDERING VIA SUPABASE

Als beheerder kun je periodiek (bijvoorbeeld jaarlijks bij aanvang van het nieuwe schooljaar) controleren welke stagiairs langer dan 1 jaar zijn uitgeschreven en deze records definitief schonen.

Stap 1: Inloggen op het database dashboard
1. Log in op het Supabase Dashboard (https://supabase.com/dashboard).
2. Selecteer het Europese productieproject van StageConnectie.
3. Klik in het linkermenu op Table Editor.
4. Klik op de tabel Students.

Stap 2: Filteren op verlopen stagiairs
1. Klik bovenaan op de knop Filter.
2. Stel het volgende filter in:
   Column: unenrollment_date
   Operator: is less than
   Value: vul de datum in van exact 1 jaar geleden (bijvoorbeeld: als het vandaag 12 oktober 2026 is, vul je 2025-10-12 in).
3. Klik op Apply.

Stap 3: De records definitief verwijderen
1. Je ziet nu uitsluitend de stagiairs die langer dan 1 jaar zijn uitgeschreven.
2. Selecteer deze rijen via het selectievakje bovenaan.
3. Klik op Delete rows om de records definitief te wissen.


4. AUTOMATISCHE CASCADE VERWIJDERING (WAT WORDT ER GEWIST?)

Dankzij de databaseconfiguratie met Cascade Delete gebeurt het volgende automatisch zodra een stagiairrecord wordt verwijderd:
1. De stagiairgegevens uit de tabel Students worden permanent gewist.
2. Alle gekoppelde aanwezigheidsregistraties, uren en dagverslagen van deze stagiair in de tabel Attendance worden automatisch gelijktijdig gewist.
3. Alle koppelingen met stagebedrijven en stagebegeleiders komen direct te vervallen.
Er blijven dus geen achtergebleven of verweesde persoonsgegevens in de database achter.


5. AUTOMATISCHE SCHONING VIA CRON-JOB (OPTIONEEL)

Om het schoningsproces volledig handenvrij te laten verlopen, kan een geautomatiseerde nachtelijke taak (een Cron Job of Scheduled Edge Function) worden geactiveerd in Supabase.

Werking van het geautomatiseerde script:
Elke nacht om 03:00 uur voert de database automatisch de volgende SQL-opdracht uit:

DELETE FROM "Students" 
WHERE unenrollment_date < NOW() - INTERVAL '1 year';

Hierdoor worden verlopen stagiairs en hun aanwezigheidsgegevens elke nacht automatisch conform de wetgeving gewist, zonder dat handmatige tussenkomst vereist is.


6. AANBEVELING VOOR DE SCHOOLADMINISTRATIE

Zet een vaste jaarlijkse herinnering in de schoolagenda (bijvoorbeeld in de eerste week na de zomervakantie) om de bewaartermijnen in de database te controleren. Zo voldoet je school te allen tijde aantoonbaar aan de privacywetgeving.
