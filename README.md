# RET Metro Manager

Browserspel waarin je het Rotterdamse metronetwerk beheert: zet metro's in, open nieuwe zones en
houd de reizigers tevreden.

**Spelen:** https://coenvisker-main.github.io/metro-manager/ (na de eerste deploy)

## Lokaal draaien

Vereist [Node.js](https://nodejs.org/) 22.12 of nieuwer.

```bash
npm install
npm run dev
```

Open daarna http://localhost:5173. In deze ontwikkelmodus staat rechtsboven een debugmenu.

## Scripts

| Commando         | Wat het doet                                       |
| ---------------- | -------------------------------------------------- |
| `npm run dev`    | Ontwikkelserver met automatisch herladen           |
| `npm run build`  | Productiebuild in `dist/`                          |
| `npm run check`  | Format, lint, typecheck, tests en build (zoals CI) |
| `npm test`       | Tests                                              |
| `npm run format` | Code formatteren met Prettier                      |

## Verder lezen

- `docs/ROADMAP.md`: planning, besluiten en bekende bugs.
- `PROJECT_CONTEXT.md`: achtergrond en architectuur.
- `CLAUDE.md`: werkafspraken en structuur.
