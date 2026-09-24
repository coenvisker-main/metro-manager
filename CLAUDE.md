# Claude Code instructies: Metro Manager

Lees eerst `HANDOFF.md` (overdracht van de vorige sessie), `PROJECT_CONTEXT.md` en `docs/ROADMAP.md`.
Lokaal ook: `C:\Users\chvis\Projects\_GLOBAL_CONTEXT.md` voor globale conventies (niet in deze repo).

## Werkafspraken

- `main` op GitHub is de enige bron van waarheid. Geen losse kopieën of backupbestanden; git is de backup.
- Begin elke sessie met `git pull`, werk op een eigen branch, lever op via een PR naar `main`, en push aan het eind.
- CI moet groen zijn voordat er gemerged wordt: `npm run check` doet hetzelfde.
- Coens werklaptop heeft geen adminrechten, dus daar staat geen Node.js. Ontwikkelen en testen gebeurt in
  cloud-sessies (Claude Code op het web) en in CI. Een lokale sessie zonder Node wijzigt alleen tekst en
  data, en laat CI de controle doen. Geen omwegen om bedrijfsregels heen (zoals een portable Node).
- Coen probeert wijzigingen uit via de speelbare versie: `main` op GitHub Pages, een PR via het
  downloadbare `metro-manager.html` bij de CI-run (onder "Artifacts").
- Commit-e-mail: het GitHub-noreply-adres (`262769031+coenvisker-main@users.noreply.github.com`), anders weigert GitHub de push.
- Human-in-the-loop: nieuwe features en spelontwerp eerst voorstellen en met Coen afstemmen. Bugfixes uit de roadmap mogen direct.
- Kleine, testbare iteraties. Eerst correctheid, dan features.
- Taal: UI-teksten en documentatie in het Nederlands, code (namen) in het Engels.

## Commando's

- `npm install` eenmalig (Node.js 22.12 of nieuwer).
- `npm run dev`: ontwikkelserver met debugmenu (http://localhost:5173).
- `npm run check`: format, lint, typecheck, tests en build.
- `npm run build:single`: alles in één HTML-bestand (`dist-single/metro-manager.html`), te openen met dubbelklikken.
- `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run format`.

## Structuur

- `index.html`: HTML-shell (Vite-entry).
- `src/main.ts`: opstart, gameloop, koppeling simulatie ↔ UI ↔ renderer.
- `src/data/network.ts`: zones, stations, lijnen (genormaliseerde coördinaten).
- `src/sim/`: de simulatie, zonder DOM. `game.ts` (spelregels en acties), `train.ts`, `routing.ts`, `config.ts`, `state.ts`, `layout.ts`, `types.ts`.
- `src/render/renderer.ts`: canvas-tekenwerk.
- `src/ui/ui.ts`: zijbalk, knoppen, modals en meldingen.
- `src/debug.ts`: debugmenu, alleen in dev-modus.
- `src/styles.css`: Tailwind 4 plus eigen componentstijlen.
- `tests/`: Vitest. `helpers.ts` bevat `createTestGame()` met nep-klok en seed.

## Testen

- Simulatie testen door deterministisch te tikken: `createTestGame()` en `run()`/`runSeconds()` uit `tests/helpers.ts`. Niet op de wandklok wachten.
- Bekende bugs staan als `it.fails` in `tests/known-bugs.test.ts`. Los je er een op, dan faalt die test: zet hem om naar `it` en verplaats hem naar `tests/sim.test.ts`.
- Headless browser (Playwright) throttlet `requestAnimationFrame`. Stub `requestAnimationFrame` en `Date.now` en tik handmatig; in dev-modus staan `window.__game` en `window.__debug` klaar.
