# Claude Code instructies — Metro Manager

Lees eerst `PROJECT_CONTEXT.md` voor projectcontext.
Zie ook `C:\Users\chvis\Projects\_GLOBAL_CONTEXT.md` voor globale conventies.

## Project
Standalone HTML tool. Geen build, geen dependencies.

## Structuur
- `Metro_Manager_v2.html` — HTML-shell; laadt CSS + JS uit `css/` en `js/`.
- `css/style.css` — alle styling.
- `js/data.js` — speldata (`ZONES_DEF`, `STATIONS`, `ROUTES_DEF`).
- `js/utils.js` — helpers & pathfinding (BFS), floating text, notificaties.
- `js/Train.js` — `Train`-class.
- `js/ui.js` — DOM/UI, knoppen, modals, upgrade-listeners.
- `js/game.js` — engine: state, gameloop, rendering, `init()`.
- Laadvolgorde staat vast (zie `<script>`-tags onderaan de HTML); het zijn
  **klassieke scripts** (géén ES-modules) omdat de `onclick`-handlers globale functies nodig hebben.
- `Metro_Manager_v2_Backup.html` — self-contained referentieversie (oude inline build).

## Werkwijze
- Wijzig de losse bestanden in `js/` en `css/`, niet meer de inline backup.
- Test lokaal via een statische server (bijv. `python -m http.server`) — `file://` werkt niet
  met de losse JS-bestanden.
- Backup maken voor grote wijzigingen: kopieer naar `Metro_Manager_v2_Backup.html`.
