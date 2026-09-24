# Roadmap Metro Manager

Samengevoegd uit de code review van september 2026 en de backlog van de lokale sessie
(`je-bent-een-senior-validated-allen.md`, branch `claude/ecstatic-williams-7cbd73`).

Legenda: ✅ klaar · 🔜 volgende · ⏳ gepland · ❓ nog uitzoeken

## Besluiten

| Onderwerp        | Besluit                                                                                                                                                                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codebasis        | De code van de oude `main` (realistische kaart met 71 stations, game over) is de basis. De lokale branch `claude/ecstatic-williams-7cbd73` bouwde voort op de oudere v2-backup en dient als referentie voor fixes. `master` is gearchiveerd. |
| Techniek         | Vite + TypeScript + Vitest + Tailwind 4 (lokaal gebouwd), deploy via GitHub Pages.                                                                                                                                                           |
| Werkwijze        | `main` is de enige bron van waarheid. Zie CLAUDE.md.                                                                                                                                                                                         |
| Netwerk          | Realistisch RET-netwerk blijft het uitgangspunt.                                                                                                                                                                                             |
| Onbediende zones | Een geopende zone zonder metro kost terecht tevredenheid. Bewust gedrag, geen bug.                                                                                                                                                           |
| Winnen           | Hoofdmodus wordt de campagne "RET door de jaren". "Dienstdag" en "Mijlpalen" komen later als extra spelmodi.                                                                                                                                 |
| Doelgroep        | Begint als hobby- en leerproject; bij enthousiasme mogelijk een release samen met RET marketing en communicatie.                                                                                                                             |

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

## 🔜 Fase 2: simulatiekern herbouwen

Doel: alle tests in `tests/known-bugs.test.ts` groen, zonder de spelbeleving te slopen.

| ID  | Probleem                                                                                                                                                   | Aanpak                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Reizigers spawnen op onzichtbare waypoints, en reizigers met een waypoint als volgende halte blijven eeuwig in de trein zitten.                            | Waypoints worden puur visueel: niet in spawn, niet in de routegraaf.                                                                                                  |
| B2  | Reizigers stappen op elke tussenhalte uit en in (+€2 per halte); de afstandsbonus telt alleen de laatste halte.                                            | Reisplanner: reis als reeks (lijn, uitstaphalte). Alleen overstappen waar de lijn wisselt. Idee uit de lokale branch: alleen routeren via lijnen waar treinen rijden. |
| B3  | Tijdmodel: snelheid hangt af van framerate en schermgrootte; pauze en tab-wissel laten reizigers massaal verlopen; overvol-timer loopt door tijdens pauze. | Vaste tijdstap op een spelklok (`gameTime`) die stilstaat bij pauze. Afstanden in kaarteenheden in plaats van pixels.                                                 |
| B4  | Treinen verspringen als er een zone opengaat.                                                                                                              | Positie hermappen op station-id (was lokaal al opgelost).                                                                                                             |
| B5  | Zones kunnen in elke volgorde open; treinen rijden dan over niet-bestaand spoor naar onbereikbare eilanden.                                                | Zone alleen te openen als hij aansluit op een open zone.                                                                                                              |
| B6  | Overvol-timer van een station wordt niet gewist als het station helemaal leegloopt; later weer vol betekent direct game over.                              | Timer wissen voor elk station dat niet (meer) overvol is.                                                                                                             |
| B7  | Na game over hervat de pauzeknop de simulatie.                                                                                                             | Pauze blokkeren na game over.                                                                                                                                         |

Balans (in dezelfde fase, meetbaar maken):

- Alle balansgetallen naar `src/sim/config.ts`.
- Bot-simulatie als balanstest: nu wint "niets doen" eeuwig (15 min zonder game over, €46k) en
  gaat uitbreiden na ~10 minuten failliet.
- "Frequentie verhogen" maakt het spel netto moeilijker (meer spawn, minder geduld). ❓ afgeleid uit code, niet gesimuleerd.
- De fooi is vrijwel gratis: de drempel gebruikt ongeschaald geduld.
- Restant in `Game.frame()` dat alleen een toevalsgetal verbruikt: weghalen.

## ⏳ Fase 3: UI en weergave

| ID  | Punt                                                                                                        |
| --- | ----------------------------------------------------------------------------------------------------------- |
| U1  | Reset tijdens pauze: pauzescherm blijft staan en de knop werkt omgekeerd.                                   |
| U2  | Na game over blijft de zijbalk bruikbaar (modal dekt alleen de kaart).                                      |
| U3  | Comfort-upgrade meldt "+€3.00" maar geeft €2.                                                               |
| U4  | `updateUI()` bouwt de uitbreidingslijst bij elke geldmutatie opnieuw op (lokaal al opgelost met een split). |
| U5  | Canvas scherp op hoge-DPI-schermen (`devicePixelRatio`).                                                    |
| U6  | Parallelle lijnen loodrecht op het spoor verschuiven in plaats van diagonaal.                               |
| U7  | Laten zien welke lijn of zone onbediend is.                                                                 |
| U8  | Werkt op mobiel en tablet (nodig voor een release).                                                         |

## ⏳ Fase 4: winnen met de campagne "RET door de jaren"

- ❓ Echte aanlegvolgorde en jaartallen van het netwerk uitzoeken en verifiëren.
- Levels langs die volgorde, met doelen (reizigers, tevredenheid, budget) en 1 tot 3 sterren.
- Balans per level met bot-simulaties.

## ⏳ Fase 5: features

- Opslaan en laden (localStorage).
- Moeilijkheidsgraad, met in de makkelijke modus een gratis metro bij het openen van een onbediende lijn (idee Coen).
- Materieel verkopen of verplaatsen.
- Extra spelmodi: Dienstdag (spits, evenementen) en Mijlpalen (eindeloos met doelen).

## ⏳ Fase 6: klaar voor een release

- Merk-, logo- en kleurgebruik afstemmen met RET marketing en communicatie.
- Privacy bij eventuele analytics.
- Toegankelijkheid en performance.
