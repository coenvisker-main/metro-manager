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
- Het spel heeft nog de bekende bugs uit de review; die staan als falende tests klaar voor fase 2.
- Details en planning: `docs/ROADMAP.md`.

## Architectuur

- Vite + TypeScript, Tailwind 4, Vitest. Speelbare versie via GitHub Pages.
- Simulatie (`src/sim/`) staat los van DOM en canvas; klok en toeval zijn injecteerbaar.
- Renderer (`src/render/`) en UI (`src/ui/`) lezen de spelstaat; `src/main.ts` verbindt alles.

## Geschiedenis

- Feb 2026: eerste versie op GitHub `main` (klassieke scripts, Tailwind via CDN).
- Mei 2026: migratie uit Antigravity naar GitHub `master` (onvolledig: `js/` en `css/` ontbraken).
  Lokaal daarna verder gebouwd op de oudere v2-backup (branch `claude/ecstatic-williams-7cbd73`).
- Sep 2026: code review, versies samengevoegd op `main`, overstap naar Vite + TypeScript.
