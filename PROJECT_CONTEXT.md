# PROJECT_CONTEXT — Metro Manager

> Gedeeld door Antigravity en Claude Code. Update dit bij grote wijzigingen.

## Doel
Standalone HTML tool voor Metro Manager (RET-gerelateerd).
Geen build stap nodig — direct openen in browser.

## Status
Stabiel. `Metro_Manager_v2_Backup.html` is de backup van v2.

## Architectuur
- `Metro_Manager_v2.html` — HTML-shell die `css/style.css` + de `js/`-bestanden laadt
- `css/style.css`, `js/{data,utils,Train,ui,game}.js` — gemodulariseerde bron
- `Metro_Manager_v2_Backup.html` — self-contained referentie (oude inline versie)

## Gebruik
Serveer via een statische server (bijv. `python -m http.server`) en open in de browser.
`file://` werkt niet met de losse JS-bestanden (module/pad-restricties).

## Laatste wijzigingen
- Modularisatie afgemaakt: inline code uit de backup opgesplitst naar `css/` + `js/`,
  waardoor `Metro_Manager_v2.html` weer werkt (verwees eerder naar niet-bestaande bestanden).
- Ontbrekende `@keyframes fadeIn` toegevoegd aan de CSS.
