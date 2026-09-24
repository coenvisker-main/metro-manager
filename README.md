# RET Metro Manager

Browserspel waarin je het Rotterdamse metronetwerk beheert: zet metro's in, open nieuwe zones en
houd de reizigers tevreden.

## Spelen zonder installatie

- **Laatste versie:** https://coenvisker-main.github.io/metro-manager/
- **Een wijziging uitproberen vóór het mergen:** open de pull request, klik op het tabblad **Checks**,
  kies de run **CI** en download onder **Artifacts** het bestand `metro-manager.html`. Dubbelklik om
  te spelen; het werkt offline en zonder installatie.

## Lokaal ontwikkelen

Vereist [Node.js](https://nodejs.org/) 22.12 of nieuwer.

```bash
npm install
npm run dev
```

Open daarna http://localhost:5173. In deze ontwikkelmodus staat rechtsboven een debugmenu.

## Scripts

| Commando               | Wat het doet                                                |
| ---------------------- | ----------------------------------------------------------- |
| `npm run dev`          | Ontwikkelserver met automatisch herladen                    |
| `npm run build`        | Productiebuild in `dist/`                                   |
| `npm run build:single` | Alles in één HTML-bestand: `dist-single/metro-manager.html` |
| `npm run check`        | Format, lint, typecheck, tests en build (zoals CI)          |
| `npm test`             | Tests                                                       |
| `npm run format`       | Code formatteren met Prettier                               |

## Verder lezen

- `docs/ROADMAP.md`: planning, besluiten en bekende bugs.
- `PROJECT_CONTEXT.md`: achtergrond en architectuur.
- `CLAUDE.md`: werkafspraken en structuur.
