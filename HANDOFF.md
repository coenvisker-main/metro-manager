[AI-TO-AI HANDOFF PAYLOAD]

Kernopdracht/Doel: Fase 2 uitvoeren: de simulatiekern van Metro Manager herbouwen tot alle 11 `it.fails`-tests in `tests/known-bugs.test.ts` echt slagen, zonder de spelbeleving te slopen.

Overdrachtstype: Volledig (sessie van 24 sep 2026: code review, fase 0 en 1, werkwijze zonder lokale Node).

Context & Achtergrond:
Metro Manager is een browserspel over het RET-metronetwerk in Rotterdam (public repo `coenvisker-main/metro-manager`).
Eigenaar is Coen, IT business consultant bij de RET. Het is een hobby- en leerproject; bij enthousiasme volgt mogelijk
een release met RET marketing en communicatie. Coen programmeert niet zelf: Claude ontwikkelt, Coen beslist, test en merget.
Lees eerst `CLAUDE.md` (werkafspraken, structuur), `PROJECT_CONTEXT.md` en `docs/ROADMAP.md` (besluiten, bug-ID's B1–B7 en U1–U8).
Coens werklaptop heeft geen adminrechten: geen Node.js, geen winget. Code wijzigen en testen moet dus in een
cloud-sessie (Claude Code op het web) waar Node aanwezig is. Een lokale Windows-sessie kan geen tests draaien.

Tot nu toe bereikt:

- Code review met bugs gereproduceerd in headless Chromium (nep-klok, seed).
- Drie uit elkaar gelopen versies samengevoegd:
  - `main` is nu de enige bron.
  - `master` is verwijderd.
  - Branch `claude/ecstatic-williams-7cbd73` is archief: een oudere spelversie met 38 stations, plus fixes in commit `e200308`. NIET mergen; de ideeën staan per bug in de roadmap.
- PR #1 (gemerged): fase 0+1.
  - Stack: Vite 8, TypeScript 6.0, Vitest 5, Tailwind 4 lokaal, ESLint, Prettier.
  - De port is bit-voor-bit identiek aan het origineel bij gelijke seed en canvasmaat.
  - Simulatie los van DOM, klok en toeval.
  - Tests: 20 slagen en 11 bekende bugs staan als `it.fails`.
  - CI plus deploy naar GitHub Pages; debugmenu alleen in dev.
- PR #2 (gemerged): `npm run build:single` levert één `metro-manager.html`, die CI als artifact uploadt (zonder zip).
  Coen heeft bevestigd dat het bestand op zijn werklaptop werkt.
- De deploy naar Pages is geslaagd: https://coenvisker-main.github.io/metro-manager/. Coen heeft bevestigd dat de link op zijn werklaptop werkt.
- Fase 2 opgedeeld in 2a–2d (akkoord Coen). 2a (tijdmodel, B3/B6/B7, plus U1) en 2b (waypoints en reisplanner, B1/B2) zijn gemerged; 2c (zones en spoor, B4/B5/B8, tellers) staat als PR open. Besluiten staan in `docs/ROADMAP.md`.

Wat werkte:

- Simulatie deterministisch tikken met `createTestGame()` uit `tests/helpers.ts` (nep-klok, seed, `run`/`runSeconds`).
- Elke bug eerst als falende test vastleggen en daarna pas fixen.
- Headless Playwright (via `/opt/node22/lib/node_modules/playwright`, Chromium voorgeïnstalleerd).
  - Stub `requestAnimationFrame`, `Date.now` en `Math.random`, en tik handmatig met `__step(n)`.
  - In dev-modus staan `window.__game` en `window.__debug` klaar.
  - Pariteit meet je met een dump van de spelstaat bij een vaste canvasmaat, want de simulatie rekent (nog) in pixels.
- CI-status en artifacts opvragen:
  - via de publieke GitHub API met `curl`;
  - wachten met een `until`-loop met `run_in_background: true` (een `sleep` op de voorgrond wordt geblokkeerd).
- PR's aanmaken met de `mcp__github__*`-tools.

Wat niet werkte (niet herhalen):

- **Tags pushen** en pushen naar andere branches dan de aangewezen sessie-branch: de git-proxy geeft 403.
- **Geblokkeerd vanuit de cloud-container:** `cdn.tailwindcss.com` en `*.github.io`. Pages kun je niet zelf openen.
- **TypeScript 7:** typescript-eslint 8 ondersteunt alleen `<6.1`, dus TypeScript blijft op `~6.0.3`.
- **Omwegen om IT-regels heen** (portable Node e.d.): Coen wil dat niet en het is afgeraden.
- **Aanwijzingen voor Coen:** geef ze dummyproof, met genummerde stappen, exacte commando's en de verwachte output.
  - Coen leest selectief: zet acties bovenaan.
  - Eerder ging een push mis omdat hij op `master` stond in plaats van op de branch.

Stijl & Afspraken:

- **Taal en toon:** Nederlands, casual Rotterdams, to the point en direct.
  - Kritische spiegel: geen vleierij, aannames challengen.
  - Label wat niet geverifieerd is (❓ of [niet geverifieerd]).
  - Parafraseer Coen niet.
- **Vragen:** stel vragen als je minder dan 99% zeker bent wat Coen wil.
- **Human-in-the-loop:** features en spelontwerp eerst voorstellen. Bugfixes uit de roadmap mogen direct.
- **Werkwijze:**
  - Kleine PR's naar `main`, per deelstap.
  - CI moet groen zijn. Coen merget.
  - Draai `npm run check` vóór elke push.
- **Commits:**
  - Geen model-ID's in commits of PR's.
  - In de cloud committen als Claude <noreply@anthropic.com>.
  - Lokaal gebruikt Coen `262769031+coenvisker-main@users.noreply.github.com`.
- **Documentatie:** UI-teksten en docs in het Nederlands, code-namen in het Engels.
- **Ruimte laten:** geef Coen ruimte om te ontdekken wat hij leuk vindt; niet zelf grote features bouwen.

Essentiële Data:

- **Besluiten (niet heroverwegen):**
  - Een onbediende zone kost terecht tevredenheid; dat is bewust.
  - Het netwerk blijft realistisch.
  - Winnen: campagne "RET door de jaren" is de hoofdmodus; "Dienstdag" en "Mijlpalen" komen later als extra modi.
  - De simulatie hoort DOM-vrij te blijven (`src/sim/`).
- **Fase 2-bugs** (zie `docs/ROADMAP.md` en `tests/known-bugs.test.ts`):
  - B1 waypoints: reizigers spawnen erop en zitten eeuwig in de trein. Na 6 min bezetten ze 74% van de capaciteit.
  - B2 reizigers stappen op elke tussenhalte uit en in (+€2 per halte); de afstandsbonus telt alleen de laatste halte.
  - B3 tijdmodel:
    - de simulatie hangt af van framerate en schermgrootte;
    - pauze en tab-wissel laten reizigers massaal verlopen;
    - de overvol-timer loopt door tijdens pauze.
  - B4 treinen verspringen als er een zone opengaat.
  - B5 de volgorde van zones openen is vrij, met eilanden als gevolg.
  - B6 de overvol-timer reset niet als een station helemaal leegloopt.
  - B7 de pauzeknop hervat de simulatie na game over.
- **Meetgegevens van de oude code (bot-simulaties):**
  - Niets doen levert 15 min geen game over op en €46k.
  - Een bot die uitbreidt gaat na ~10,5 min failliet.
  - Alleen B1 fixen geeft +24% vervoerd, maar nog steeds een ineenstorting. Er is dus ook een balansprobleem.
  - Het effectieve geduld is 30 s (60000 / speedFactor 2).
- **Te verwijderen:** in `Game.frame()` staat een `this.random()` die alleen een toevalsgetal verbruikt (restant voor pariteit).
- **Richting, voorstel [niet met Coen afgestemd]:**
  - Vaste tijdstap op een spelklok (`gameTime`) los van `requestAnimationFrame`.
  - Afstanden in kaarteenheden in plaats van pixels.
  - Reisplanner met etappes per lijn, via de vloot-graaf: alleen lijnen met treinen.
  - Waypoints puur visueel.
  - Een zone alleen openen als hij aansluit op een open zone.
  - Balansgetallen in `src/sim/config.ts`, en een deterministische bot-simulatie als balanstest.
- **Pariteit loslaten:** fase 2 verandert het gedrag bewust, dus de gelijkheid met het origineel hoeft niet meer.
  Opgeloste bugs verhuizen van `it.fails` naar `it` in `tests/sim.test.ts`.

Openstaande acties:

- [x] Fase 2 opgedeeld (akkoord): 2a tijdmodel (B3, B6, B7), 2b waypoints en reisplanner (B1, B2),
      2c zones (B4, B5), 2d balans-config en bot-simulatie.
- [x] 2a gemerged (PR #4). Coen testte: treinsnelheid goed, pauze bij tab-wissel werkt.
- [x] 2b gemerged (PR #5). Coen kon individuele reizigers niet volgen; daarom tellers in 2c.
- [x] 2c gemerged (PR #6).
- [ ] 2d-1 (meetlat): PR laten mergen. Daarna 2d-2 (afstellen), keuzes staan in de roadmap onder "Besluiten 2d".
- [ ] Na elke deel-PR: CI groen, en Coen test via het artifact `metro-manager.html`.
- [ ] `.claude/settings.json` bevat `mcpServers` met `@modelcontextprotocol/server-github`.
  - Vermoedelijk leest Claude Code dit daar niet uit, en het package is mogelijk verouderd [niet geverifieerd].
  - Eerst met Coen afstemmen, niet zelf wijzigen.
- [ ] Later, fase 4: de echte aanlegvolgorde en jaartallen van het RET-netwerk uitzoeken en verifiëren.
- [ ] Optioneel: een devcontainer voor GitHub Codespaces, als Coen zelf wil ontwikkelen zonder lokale Node.
- [ ] Onbekend of Coens lokale clone al op `main` staat [niet geverifieerd]. Bij lokaal werk eerst `git status` laten checken.

Directe vervolgstap: Controleer of de PR van 2d-1 gemerged is. Zo ja: 2d-2. Bouw de gekozen mechanieken (groeiende vraag, exploitatiekosten, subsidie als vangnet, frequentie-upgrade alleen snelheid), stel getallen voor met `npm run balance`, en leg de doelen vast als test (niets doen game over binnen ~5 min, bot "beheerder" 20+ min). Coen beslist over de getallen na spelen. De bot "beheerder" moet dan ook exploitatiekosten meewegen.
