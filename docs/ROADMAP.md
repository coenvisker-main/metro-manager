# Roadmap Metro Manager

Samengevoegd uit de code review van september 2026 en de backlog van de lokale sessie
(`je-bent-een-senior-validated-allen.md`, branch `claude/ecstatic-williams-7cbd73`).

Legenda: ✅ klaar · 🔜 volgende · ⏳ gepland · ❓ nog uitzoeken

## Besluiten

| Onderwerp        | Besluit                                                                                                                                                                                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codebasis        | De code van de oude `main` (realistische kaart met 71 stations, game over) is de basis. De lokale branch `claude/ecstatic-williams-7cbd73` bouwde voort op de oudere v2-backup en dient als referentie voor fixes. `master` is verwijderd; de geschiedenis ervan zit in die branch. |
| Techniek         | Vite + TypeScript + Vitest + Tailwind 4 (lokaal gebouwd), deploy via GitHub Pages.                                                                                                                                                                                                  |
| Werkwijze        | `main` is de enige bron van waarheid. Zie CLAUDE.md.                                                                                                                                                                                                                                |
| Netwerk          | Realistisch RET-netwerk blijft het uitgangspunt.                                                                                                                                                                                                                                    |
| Onbediende zones | Een geopende zone zonder metro kost terecht tevredenheid. Bewust gedrag, geen bug.                                                                                                                                                                                                  |
| Winnen           | Hoofdmodus wordt de campagne "RET door de jaren". "Dienstdag" en "Mijlpalen" komen later als extra spelmodi.                                                                                                                                                                        |
| Doelgroep        | Begint als hobby- en leerproject; bij enthousiasme mogelijk een release samen met RET marketing en communicatie.                                                                                                                                                                    |

## ✅ Fase 0: één bron van waarheid

- Drie uit elkaar gelopen versies (GitHub `main`, GitHub `master`, lokale map) samengevoegd op `main`.
- `Metro_Manager_v2_Backup.html` verwijderd; git is de backup.

## ✅ Fase 1: fundament

- Code geport naar TypeScript-modules. De simulatie is aantoonbaar identiek aan het origineel
  (zelfde seed en canvasmaat geven bit-voor-bit dezelfde spelstaat na 4 minuten speltijd).
- Simulatie los van DOM, klok en toeval, zodat hij in tests draait (`tests/helpers.ts`).
- Tailwind en het lettertype Inter lokaal in de build: geen CDN, werkt offline, geen Google Fonts (AVG).
- Debugmenu alleen in dev-modus (`npm run dev`).
- Tests: netwerkdata, simulatie, spelersacties, en de bekende bugs als `it.fails` in `tests/known-bugs.test.ts`.
- CI (lint, format, typecheck, tests, build) en automatische deploy naar GitHub Pages.
- Speelbare versie zonder installatie: CI levert bij elke run een los `metro-manager.html` (werklaptop zonder adminrechten).

## 🔜 Fase 2: simulatiekern herbouwen

Doel: alle tests in `tests/known-bugs.test.ts` groen, zonder de spelbeleving te slopen. Na 2c zijn alle bekende bugs (B1–B8) opgelost en is dat bestand weg.

Opgedeeld in deel-PR's (afgestemd met Coen, 24 sep 2026):

| Deel | Bugs       | Inhoud                                             | Status |
| ---- | ---------- | -------------------------------------------------- | ------ |
| 2a   | B3, B6, B7 | Tijdmodel: spelklok, vaste tijdstap, kaarteenheden | ✅     |
| 2b   | B1, B2     | Waypoints puur visueel, reisplanner met etappes    | ✅     |
| 2c   | B4, B5, B8 | Zones en spoor, plus tellers in de zijbalk         | ✅     |
| 2d   | –          | Balans-config en bot-simulatie                     | ✅     |

Besluiten 2a:

- De simulatie loopt in vaste stappen van 1/60 s op een spelklok (`state.time`) die stilstaat bij pauze en game over.
  Een frame haalt hooguit 250 ms in (`MAX_FRAME_MS`), dus een haperende browser springt niet vooruit.
- Afstanden in kaarteenheden: de kaart is 1200×800 eenheden. Het tempo (treinen, afstandsbonus) is gelijk aan dat van
  vóór fase 2 op een speelveld van 1200×800 bij 60 fps, en nu op elk scherm en elke framerate hetzelfde.
- Tab weg of venster geminimaliseerd: het spel pauzeert automatisch. Hervatten doet de speler zelf.
  Alleen naar een ander venster klikken (zonder minimaliseren) pauzeert niet.

Besluiten 2c:

- Geen eilanden, geen sprongen. Een lijn rijdt alleen over het aaneengesloten stuk open spoor dat aan het centrum
  vastzit (`getUnlockedPath`). Een zone kan alleen open als al zijn stations daarna meteen door een lijn bereikbaar
  zijn (`canUnlockZone`). De uitbreidingslijst zegt welke zone eerst moet ("Open eerst: …").
- Volgorde die daaruit volgt (getest): Kop van Zuid, West 1, Oost 1 en Lijn E direct; Slinge na Kop van Zuid;
  Zuid 3 na Slinge; De Akkers na Zuid 3; West 2 na West 1 (ook al raakt het via Pernis Zuid 3); Hoek van Holland na
  West 2; Ommoord en Capelle na Oost 1; Nesselande na Ommoord.
- Bij het openen van een zone blijft een metro tussen dezelfde twee stations rijden.
- Tellers in het blok onder Beheer, totaal sinds de start: verlopen, overstappen, gemiddelde reistijd.

Besluiten 2d (25 sep):

- Meting vooraf (20 min, seeds 1–3): "niets doen" gaat nooit game over (~€62k, 0 verlopen) en een domme uitbreider
  ook niet. Het spel heeft geen druk: de vraag groeit niet, metro's kosten niks, en subsidie beloont stilzitten.
- 2d-1 (meetlat, zonder gedragsverandering): alle balansgetallen in `BALANCE` (`src/sim/config.ts`), botjes en
  `npm run balance` (`scripts/`). Bewezen gelijk gedrag: identieke eindstaat in 11 scenario's. De upgrademeldingen
  lezen hun getallen uit de config (lost U3 op).
- 2d-2 (afstellen), gekozen door Coen: groeiende vraag met de speltijd; exploitatiekosten per metro; subsidie alleen
  als vangnet bij laag saldo; "Frequentie verhogen" maakt alleen metro's sneller (niet meer sneller spawnen en korter
  geduld). Doel: eindeloos en steeds zwaarder; niets doen game over binnen ~5 min, een goede speler 20+ min.
  Getallen stelt Claude voor met bot-uitkomsten; Coen beslist na spelen. De doelen worden tests.
- 2d-2, eerste meting: met alleen die vier knoppen blijft uitbreiden dom (de beste bot stapelt metro's in het centrum)
  en stapelt geld op. Daarom gekozen door Coen: **A** de stad groeit vanzelf (om de 2 min opent de goedkoopste
  aansluitende zone; zones kopen verdwijnt uit het spel; het tabblad Uitbreiding is een tijdlijn) en **B**
  spoorcapaciteit (hoogstens één metro per drie haltes van het rijdbare stuk). Opbrengst per reis mocht omlaag.
- Voorgestelde getallen (Coen beslist na spelen): vraaggroei 0,3 per minuut, ticket €5 (was €8), fooi €2 (was €5),
  afstandsbonus €0,02 per kaarteenheid (was €0,10: dat was gemiddeld €25 per reis, de echte geldpomp),
  exploitatie €250 per metro per minuut, subsidie onder €300 saldo. Geduld is nu direct 30 s (was 60 s gedeeld door de
  snelheidsfactor 2); de fooidrempel wordt daarmee 21 s reistijd (was 42 s).
- Uitkomst eerste voorstel (20 min, seeds 1–3): niets doen game over na 5:34–5:54; blind kopen na ~14:40;
  beheerder loopt door. Doelen als test in `tests/balance.test.ts`.
- Coen speelde (25 sep): geld is in het begin een echte afweging (goed); de druk voelt licht; uitbreiden gaat te traag;
  en raar dat E nog metro's kon kopen terwijl D op hetzelfde spoor "vol" was (zelfde bij A/B/C). Aangepast:
  - **Gedeelde spoorcapaciteit:** capaciteit van een lijn = haltes ÷ 1,5; elke metro telt mee voor het deel van zijn
    traject dat over die lijn loopt (een D-metro telt volledig mee op E, voor een kwart op A via Beurs). Een metro
    kopen kan alleen als geen enkel spoor waar hij over rijdt overvol raakt.
  - **Stad groeit elke 60 s** (was 120 s); alles is na ~13 minuten open.
  - Getallen opnieuw afgesteld: vraaggroei 0,2/min, vraag per station 0,03 (was 0,05), afstandsbonus €0,04,
    exploitatie €150 per metro per minuut.
  - Uitkomst (30 min, seeds 1–3): niets doen game over na 5:43–6:17; blind kopen na ~12:35; beheerder 25 min of
    langer. Laat in het potje (netwerk open, spoor vol) stapelt geld weer op (~€55k na 20 min): let op bij spelen.
- Coen speelde opnieuw (25 sep): "erg makkelijk". Tevredenheid bleef 100%, niemand bleef staan, het tarief liep op tot
  €23 en laat in het potje was er geld zat. Oorzaken (gemeten met een bot die upgrades koopt zoals een speler): upgrades
  hadden geen maximum (capaciteit tot 160+ per metro, comfort tot €35 tarief en +37 s geduld); tevredenheid steeg
  +0,2 per aankomst en zakte dus nooit; game over kwam altijd plotseling op Beurs (enige kruising A/B/C met D/E).
  Aangepast, met keuzes van Coen:
  - **Upgrades maximaal 5 niveaus** (prijs blijft oplopen); comfort +€1 per niveau; campagne onbeperkt.
  - **Subsidie alleen bij schuld** (saldo onder €0).
  - **Drukte kost tevredenheid:** elk station dat meer dan half vol staat, kost elke 10 s 1% tevredenheid.
    Tevredenheid per aankomst omlaag naar +0,02, anders zakt hij nooit.
  - **Exploitatie per rijtuig** (€100 per rijtuig per minuut; een metro van 20 plaatsen is 2 rijtuigen).
  - Toegevoegd door Claude, goedgekeurd door Coen na speeltest 3: **nieuwe zones trekken geleidelijk reizigers** (in 2 min naar vol; de
    laatste zone, Den Haag met 14 stations, gaf anders een klif waar elke bot tegelijk op strandde) en
    **overstapstations zijn groter** (+20 plekken per extra lijn: Beurs 120, de stam 80), zodat goed spelen weer
    verschil maakt.
  - Vraaggroei 0,4/min.
  - Uitkomst (40 min, seeds 1–3): niets doen game over na ~6:07; blind kopen na ~12:00; beheerder (koopt alle
    upgrades) na 20:51–21:31. Geld stapelt laat in het potje nog steeds op (~€80–110k na 20 min): de inkomsten groeien
    mee met de vraag, de kosten zijn begrensd door het spoor. Open punt voor Coen.
- Coen speelde een derde keer (25 sep): alles gekocht zonder geldproblemen en met tevredenheid op 100%, daarna nog
  10 minuten laten lopen zonder iets te doen, en het volle netwerk kon het aan (vraag ×10,6, €258k, 0 verlopen).
  Nagemeten met een bot die alles koopt wat kan (seeds 2–3): ook 32 metro's, ~€15k na 15 min, ~€278k na 25 min,
  tevredenheid 100% tot het einde. Dan in één klap game over op Beurs, na 21–26 min. Wat het veroorzaakt:
  - Geld heeft na ~15 min geen doel meer: alles is gekocht, de inkomsten groeien mee met de vraag.
  - Tevredenheid zakt niet: +0,02 per aankomst bij ~1000 aankomsten per minuut weegt zwaarder dan de straf voor
    drukte (hooguit −6 per minuut); met alle upgrades verloopt niemand.
  - De Beurs-klap valt niet te voorkomen: ~95% van de wachtenden daar zijn overstappers, terwijl de metro's maar
    8–24% vol zitten. De overstapstroom groeit mee met de vraag en het station niet.
  - `tests/balance.test.ts` is groen, maar "de beheerder gaat binnen 40 minuten onderuit" gebeurt door die klap, niet
    doordat het geleidelijk zwaarder wordt.
    Besluit Coen: fase 2 is balans, geen nieuwe mechanismes. Het late spel gaat naar een volgende fase (zie fase 5).
    2d-2 gaat zo de deur uit.

Afspraken 2c (24 sep):

- B8 in 2c, samen met B4 en B5 (zelfde familie: zones en spoor).
- Tellers in de zijbalk: vervoerd, verlopen, overstappen, gemiddelde reistijd. Coen kan reizigers niet
  individueel volgen, dus zo kan hij zelf zien of het spel doet wat het moet doen. Nodig voor 2d.

Besluiten 2b:

- Waypoints zijn puur visueel: geen reizigers erop of ernaartoe, de planner slaat ze over.
- Een reiziger verschijnt op een open station en wil naar een ander open station dat via spoor bereikbaar is,
  ook als daar (nog) geen metro rijdt. Een onbediende lijn kost dus nog steeds tevredenheid.
- Reisplanner (`src/sim/planner.ts`): de route met de minste overstappen, daarna de minste haltes, alleen via lijnen
  waar een metro rijdt. Een reiziger stapt in de eerste metro die op zo'n route ligt en blijft zitten tot zijn
  overstap- of eindhalte. Kan de hele reis niet, dan stapt hij niet in en verloopt hij.
- Geduld telt de wachttijd op het perron en begint na een overstap opnieuw.
- Opbrengst één keer bij aankomst: ticket + afstandsbonus hemelsbreed van begin- tot eindstation + fooi.
  Geen geld per overstap. De fooi-drempel rekent nog met de hele reistijd (balans, 2d).

Meting na 2b (5 min speltijd, seeds 1–3, ❗ scenario "alles open" is een stresstest, geen normaal spelverloop):

| Scenario                       | Vóór 2b                                                  | Na 2b                                                      |
| ------------------------------ | -------------------------------------------------------- | ---------------------------------------------------------- |
| Startnetwerk, niets doen       | ~€10.300 excl. subsidie, ~560 vervoerd, loopt door       | ~€10.700 excl. subsidie, ~560 vervoerd, loopt door         |
| Alles open, 2 metro's per lijn | ~€2.900 excl. subsidie, ~45 vervoerd, game over na ~62 s | ~€11.200 excl. subsidie, ~245 vervoerd, game over na ~96 s |

Vóór 2b kwam in het tweede scenario ~60% van de inkomsten uit de €2-per-tussenhalte-bug. Na 2b is de bezetting
maar ~25%: het netwerk loopt vast op wachttijd (effectief geduld 30 s tegen lange lijnen), niet op capaciteit.
Dat is werk voor 2d.

**Over te nemen uit branch `claude/ecstatic-williams-7cbd73`** (commit `e200308`). Die branch wordt niet
gemerged: hij heeft geen gemeenschappelijke geschiedenis met `main` en bevat een oudere spelversie
(38 stations, geen waypoints, geen game over). De ideeën worden in TypeScript opnieuw gebouwd, met tests:

| Idee in die branch                                                              | Waar het hier landt |
| ------------------------------------------------------------------------------- | ------------------- |
| Vloot-graaf: alleen routeren via lijnen waar treinen rijden (`buildFleetGraph`) | B2 reisplanner      |
| Spelklok `gameTime` die stilstaat bij pauze                                     | B3                  |
| Delta-tijd (`frameScale`); hier wordt het een vaste tijdstap                    | B3                  |
| Treinpositie hermappen op station-id bij zone-unlock                            | B4                  |
| Caches voor graaf en stationsposities                                           | B2 / performance    |
| `updateStats()` gescheiden van `renderExpansionList()`                          | U4                  |
| Spawn- en restart-modal over het hele scherm                                    | U2                  |

Let op: ook die branch stapt nog op elke tussenhalte uit en in (B2 zit er ook in).

| ID    | Probleem                                                                                                                                                                                 | Aanpak                                                                                                                                                                                     |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ✅ B1 | Reizigers spawnen op onzichtbare waypoints, en reizigers met een waypoint als volgende halte blijven eeuwig in de trein zitten.                                                          | Waypoints worden puur visueel: niet in spawn, niet in de routegraaf.                                                                                                                       |
| ✅ B2 | Reizigers stappen op elke tussenhalte uit en in (+€2 per halte); de afstandsbonus telt alleen de laatste halte.                                                                          | Reisplanner: reis als reeks (lijn, uitstaphalte). Alleen overstappen waar de lijn wisselt. Idee uit de lokale branch: alleen routeren via lijnen waar treinen rijden.                      |
| ✅ B3 | Tijdmodel: snelheid hangt af van framerate en schermgrootte; pauze en tab-wissel laten reizigers massaal verlopen; overvol-timer loopt door tijdens pauze.                               | Vaste tijdstap op een spelklok (`gameTime`) die stilstaat bij pauze. Afstanden in kaarteenheden in plaats van pixels.                                                                      |
| ✅ B4 | Treinen verspringen als er een zone opengaat.                                                                                                                                            | Positie hermappen op station-id (was lokaal al opgelost).                                                                                                                                  |
| ✅ B5 | Zones kunnen in elke volgorde open; treinen rijden dan over niet-bestaand spoor naar onbereikbare eilanden.                                                                              | Zone alleen te openen als hij aansluit op een open zone.                                                                                                                                   |
| ✅ B8 | Een lijn springt over dicht spoor: Zuid 3 open en West 2 dicht laat lijn C van Schiedam C. rechtstreeks naar Tussenwater rijden. Zit er al in sinds fase 0 (gevonden door Coen, 24 sep). | Een lijn rijdt alleen over een aaneengesloten stuk open spoor; bij een gat rijdt hij op het stuk dat aan het centrum vastzit. B5 alleen lost dit niet op: Zuid 3 sluit via lijn D wél aan. |
| ✅ B6 | Overvol-timer van een station wordt niet gewist als het station helemaal leegloopt; later weer vol betekent direct game over.                                                            | Timer wissen voor elk station dat niet (meer) overvol is.                                                                                                                                  |
| ✅ B7 | Na game over hervat de pauzeknop de simulatie.                                                                                                                                           | Pauze blokkeren na game over.                                                                                                                                                              |

Balans (in dezelfde fase, meetbaar maken):

- Alle balansgetallen naar `src/sim/config.ts`.
- Bot-simulatie als balanstest: nu wint "niets doen" eeuwig (15 min zonder game over, €46k) en
  gaat uitbreiden na ~10 minuten failliet.
- "Frequentie verhogen" maakt het spel netto moeilijker (meer spawn, minder geduld). ❓ afgeleid uit code, niet gesimuleerd.
- De fooi is vrijwel gratis: de drempel gebruikt ongeschaald geduld.
- ✅ Restant in `Game.frame()` dat alleen een toevalsgetal verbruikt: weggehaald in 2a.

## ⏳ Fase 3: UI en weergave

| ID    | Punt                                                                                                        |
| ----- | ----------------------------------------------------------------------------------------------------------- |
| ✅ U1 | Reset tijdens pauze: pauzescherm blijft staan en de knop werkt omgekeerd.                                   |
| U2    | Na game over blijft de zijbalk bruikbaar (modal dekt alleen de kaart).                                      |
| ✅ U3 | Comfort-upgrade meldt "+€3.00" maar geeft €2.                                                               |
| U4    | `updateUI()` bouwt de uitbreidingslijst bij elke geldmutatie opnieuw op (lokaal al opgelost met een split). |
| U5    | Canvas scherp op hoge-DPI-schermen (`devicePixelRatio`).                                                    |
| U6    | Parallelle lijnen loodrecht op het spoor verschuiven in plaats van diagonaal.                               |
| U7    | Laten zien welke lijn of zone onbediend is.                                                                 |
| U8    | Werkt op mobiel en tablet (nodig voor een release).                                                         |

## ⏳ Fase 4: winnen met de campagne "RET door de jaren"

- ❓ Echte aanlegvolgorde en jaartallen van het netwerk uitzoeken en verifiëren.
- Levels langs die volgorde, met doelen (reizigers, tevredenheid, budget) en 1 tot 3 sterren.
- Balans per level met bot-simulaties.

## ⏳ Fase 5: features

- Opslaan en laden (localStorage).
- Moeilijkheidsgraad, met in de makkelijke modus een gratis metro bij het openen van een onbediende lijn (idee Coen).
- Materieel verkopen of verplaatsen.
- Idee Coen (25 sep, nog uitwerken en challengen): metro's kopen en zelf op een lijn inzetten binnen een capaciteit van
  één metro per 1,5 halte over het hele open netwerk, en metro's tegen betaling tussen lijnen verplaatsen als de vraag
  ergens te hoog wordt. Aandachtspunt: alleen een netwerkbrede grens laat weer stapelen in het centrum toe; combineren
  met de gedeelde spoorcapaciteit per traject.
- Extra spelmodi: Dienstdag (spits, evenementen) en Mijlpalen (eindeloos met doelen).
- Het late spel (uit speeltest 3; in welke fase: nog kiezen met Coen). Na ~15 minuten valt er niks meer te kiezen,
  geld stapelt op, tevredenheid blijft 100% en het einde is een onvermijdelijke klap op Beurs. Richtingen, nog niet
  gekozen: stations uitbreiden (per station plekken kopen, oplopende prijs), kosten laten meegroeien met de vraag,
  tevredenheid laten bewegen (minder per aankomst, meer straf voor drukte), overvol station kost tevredenheid in
  plaats van direct game over. Ook de balanstests moeten dan het geleidelijke verloop meten, niet alleen het moment
  van game over.

## ⏳ Fase 6: klaar voor een release

- Merk-, logo- en kleurgebruik afstemmen met RET marketing en communicatie.
- Privacy bij eventuele analytics.
- Toegankelijkheid en performance.
