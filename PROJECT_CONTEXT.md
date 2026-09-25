# PROJECT_CONTEXT: Metro Manager

> Gedeeld door Antigravity en Claude Code. Werk dit bij bij grote wijzigingen.

## Doel

Browserspel over het beheren van het Rotterdamse metronetwerk van de RET. Begint als hobby- en
leerproject; bij enthousiasme mogelijk een release samen met RET marketing en communicatie.

## Spel in het kort

De speler zet metro's in op de lijnen A t/m E, kiest hun startstation, koopt upgrades
(frequentie, capaciteit, faciliteiten, marketing) en opent zones om het netwerk uit te breiden.
Reizigers verschijnen op open stations en willen naar een bestemming; vervoerde reizigers leveren
geld op. Te lang wachten kost tevredenheid. Game over bij 0% tevredenheid of een station dat langer
dan 10 seconden overvol is.

## Status

- Fase 0 en 1 afgerond (september 2026): één codebasis op `main`, Vite + TypeScript, tests, CI en deploy.
- Fase 2 loopt in deel-PR's. 2a (tijdmodel), 2b (waypoints en reisplanner) en 2c (zones en spoor, tellers) zijn
  klaar: alle bekende bugs uit de review zijn opgelost. Volgende: 2d (balans).
- Details en planning: `docs/ROADMAP.md`.

## Architectuur

- Vite + TypeScript, Tailwind 4, Vitest. Speelbare versie via GitHub Pages.
- Simulatie (`src/sim/`) staat los van DOM en canvas; klok en toeval zijn injecteerbaar.
- Tijd: `Game.frame()` meet de wandklok en tikt de simulatie in vaste stappen van 1/60 s (`Game.step()`) op de
  spelklok `state.time`. Afstanden rekent de simulatie in kaarteenheden (`mapDistance`), niet in pixels.
- Reizen: `JourneyPlanner` (`src/sim/planner.ts`) kiest per reiziger de route met de minste overstappen via lijnen
  waar een metro rijdt. Een reiziger zit in de metro tot zijn overstap- of eindhalte (`alightAt`).
- Netwerk: een lijn rijdt over het aaneengesloten open stuk vanaf het centrum (`getUnlockedPath`); zones gaan
  alleen open als ze aansluiten (`canUnlockZone`), zodat er geen eilanden ontstaan.
- Renderer (`src/render/`) en UI (`src/ui/`) lezen de spelstaat; `src/main.ts` verbindt alles.

## Geschiedenis

- Feb 2026: eerste versie op GitHub `main` (klassieke scripts, Tailwind via CDN).
- Mei 2026: migratie uit Antigravity naar GitHub `master` (onvolledig: `js/` en `css/` ontbraken).
  Lokaal daarna verder gebouwd op de oudere v2-backup (branch `claude/ecstatic-williams-7cbd73`).
- Sep 2026: code review, versies samengevoegd op `main`, overstap naar Vite + TypeScript.
