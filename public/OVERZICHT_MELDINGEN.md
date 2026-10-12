OVERZICHT VAN DE MELDINGEN IN STAGECONNECTIE

Dit document bevat de documentatie en afspraken over de twee meldingen die zijn toegevoegd aan StageConnectie.

DEEL 1: MELDING VOOR DE STAGEBEGELEIDER BIJ REGISTRATIE

Doel:
De stagebegeleider ontvangt een duidelijke melding zodra een stagiair of stagebedrijf de aanwezigheidsregistratie of uren invult of bijwerkt.

Hoe het werkt:
In het begeleidersportaal is een actieve luisteraar ingericht via Supabase Realtime en een periodieke controle.
Zodra een stagiair of bedrijf een registratie opslaat of wijzigt, verschijnt er bovenaan in het begeleidersportaal een nette meldingsbalk.
In de melding staat duidelijk vermeld welke stagiair het betreft en welke status of uren zijn ingevuld.
De stagebegeleider kan op de knop Bekijk week klikken om direct naar de betreffende registratie te gaan.
Eigen wijzigingen door de begeleider zelf worden automatisch genegeerd zodat er geen dubbele meldingen ontstaan.

Behoud van de applicatie:
Er zijn geen wijzigingen gemaakt aan het inlogsysteem, de authenticatie, de layout van pagina's of andere functies.


DEEL 2: PUSHBERICHT OM 17:00 UUR VOOR DE STAGIAIR OP STAGEDAGEN (WEB PUSH)

Doel:
Stagiairs ontvangen om 17:00 uur een officieel pushbericht op hun telefoon als zij hun stage-uren van die dag nog niet hebben ingevuld.
Er worden GEEN e-mails meer naar stagiairs gestuurd en er is GEEN storende paarse meldingsbalk meer in de app zelf.

Kenmerken van de Web Push oplossing:
1. 100% Gratis: Werkt via de gratis Web Push standaard van Apple en Google.
2. Geen telefoonnummers: Er is geen 06-nummer of sms voor nodig; de anonieme browser-sleutel (VAPID) wordt veilig opgeslagen bij het studentenprofiel.
3. Pop-up op het vergrendelscherm: De melding licht op zoals bij een WhatsApp-bericht of Nu.nl-melding: 'Herinnering stage-uren: Hoi [Naam], vergeet niet je stage-uren van vandaag in te vullen!'. Bij aantikken opent het portaal direct.

Voorwaarden voor het versturen van het pushbericht:
1. Het is 17:00 uur op een stagedag.
2. De dag is een ingeroosterde stagedag van de leerling (schooldagen worden overgeslagen).
3. Het is geen schoolvakantie.
4. De registratie of uren voor die dag zijn om 17:00 uur nog niet ingevuld.
5. De leerling heeft toestemming gegeven voor meldingen op zijn/haar telefoon.

Hoe de toestemming wordt gevraagd:
- Gekoppeld aan de Gebruikersvoorwaarden (eerste inlog):
  In de gebruikersovereenkomst is artikel 5 toegevoegd ('Herinneringen op stagedagen'). Zodra de leerling op 'Akkoord & Doorgaan' klikt, verschijnt direct de officiële pop-up van de telefoon: 'StageConnectie wil je meldingen sturen: Toestaan / Weigeren'.
- Leerlingen die al eerder akkoord waren gegaan krijgen in het portaal een discrete knop om pushmeldingen met één klik in te schakelen.

Behoud van de applicatie:
De layout, inlogpagina's en alle overige werking van het portaal zijn volledig intact gelaten.
