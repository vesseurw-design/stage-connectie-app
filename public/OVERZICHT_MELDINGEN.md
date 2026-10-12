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


DEEL 2: HERINNERING OM 17:00 UUR VOOR DE STAGIAIR OP STAGEDAGEN

Doel:
Stagiairs worden om 17:00 uur herinnerd om hun gewerkte uren en aanwezigheid van die dag in te vullen als zij dat nog niet hebben gedaan.

Voorwaarden voor de melding:
De melding wordt alleen getoond en verstuurd als aan alle onderstaande voorwaarden is voldaan:
1. Het is 17:00 uur of later op de dag.
2. De dag is een doordeweekse stagedag volgens het rooster van de specifieke stagiair. Schooldagen worden automatisch overgeslagen.
3. Het is geen schoolvakantie volgens de vakantietabel.
4. De registratie of uren voor die specifieke dag zijn nog niet ingevuld of opgeslagen.

Hoe het werkt in het portaal:
Als de stagiair het portaal opent na 17:00 uur op een stagedag, verschijnt er bovenaan een paarse meldingsbalk met de tekst: Het is 17:00 uur geweest. Vergeet niet je aanwezigheid en stage-uren van vandaag in te vullen en op Week Opslaan te klikken.
Als de stagiair de uren invult en op Week Opslaan klikt, verdwijnt de melding meteen.
De stagiair kan de melding ook handmatig sluiten via de knop Sluiten.

Hoe het werkt via e-mail:
De achtergrondfunctie (Edge Function) controleert om 17:00 uur automatisch welke actieve stagiairs op die dag stage hadden maar nog niets hebben ingevuld. Deze stagiairs ontvangen een herinneringsmail met een directe knop naar het portaal.

Behoud van de applicatie:
De layout, inlogpagina's en alle overige werking van het stagiair-portaal zijn volledig intact gelaten.
