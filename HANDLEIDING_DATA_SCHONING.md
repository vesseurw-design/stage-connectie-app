# Handleiding: Dataverwijdering & Schoningsbeleid

In het kader van de AVG (GDPR) is het verplicht om persoonsgegevens niet langer te bewaren dan noodzakelijk. Voor **StageConnectie** is het beleid bepaald op: **Verwijdering 1 jaar na de uitschrijfdatum.**

Deze handleiding legt uit hoe je dit nu handmatig kunt doen en hoe we dit in de toekomst kunnen automatiseren.

---

## 1. Handmatige Controle & Verwijdering (Nu)

Op dit moment kun je als Admin zelf periodiek (bijv. één keer per kwartaal) de database opschonen via het Supabase Dashboard.

### Stap 1: Ga naar de Database
1. Log in op [Supabase Dashboard](https://supabase.com/dashboard).
2. Selecteer je EU-project (`vdeipnqyesduiohxvuvu`).
3. Klik in de linker menubalk op **Table Editor** (het tabel-icoontje).
4. Klik op de tabel **Students**.

### Stap 2: Filter op 'Oude' studenten
1. Klik bovenaan op de knop **"Filter"**.
2. Stel het volgende filter in:
   - **Column**: `unenrollment_date`
   - **Operator**: `is less than`
   - **Value**: Vul de datum van exact één jaar geleden in (bijv. als het vandaag 16-01-2026 is, vul je `2025-01-16` in).
3. Klik op **Apply**.

### Stap 3: Verwijder de records
1. Je ziet nu alleen de studenten die langer dan een jaar zijn uitgeschreven.
2. Selecteer deze rijen (vinkje bovenaan).
3. Klik op **"Delete rows"**.

---

## 2. Wat wordt er verwijderd?

Dankzij de database-instellingen (Cascade Delete) gebeurt het volgende automatisch zodra je een student verwijdert:
*   ✅ De studentgegevens uit de tabel `Students` zijn weg.
*   ✅ Alle aanwezigheidsgegevens (Presentie) van deze student in de tabel `Attendance` worden **automatisch** ook verwijderd.
*   ✅ De koppeling met het bedrijf en de begeleider vervalt.

---

## 3. Toekomstige Automatisering (Optioneel)

Als het aantal studenten groeit, kunnen we dit proces volledig automatiseren. We kunnen dan een zogenaamde **"Cron Job"** instellen in Supabase.

**Hoe dat werkt:**
Elke nacht om 03:00 uur draait er dan automatisch een scriptje in de database dat de volgende actie uitvoert:
```sql
DELETE FROM "Students" 
WHERE unenrollment_date < NOW() - INTERVAL '1 year';
```
*Mocht je dit in de toekomst geactiveerd willen hebben, geef me dan een seintje. Voor nu is de handmatige methode veiliger omdat je dan zelf de controle houdt over wat er gewist wordt.*

---

## 💡 Tip voor de Admin
Noteer in je agenda (bijv. elke eerste maandag van het nieuwe schooljaar) een moment om deze "schoonmaak" in Supabase te doen. Zo voldoe je altijd aan de privacywetgeving!
