# ¡Viva el Cine!

Film festival schedules organized by time and screening room. SANFIC is the project's first agenda; more will be added as new festivals are announced.

SANFIC22 runs November 2–8, 2026. The timeline shows time horizontally and screening rooms vertically, with blocks proportional to each film's runtime. It includes 100 screenings across seven rooms, plus search, filters, zoom, and screening details.

## Development

No dependencies or build step. From the repository root:

```sh
python3 -m http.server 4174 --bind 127.0.0.1
```

Open http://127.0.0.1:4174/. With Node.js 20+, `npm test` checks schedule data, filters, and timeline proportions. `npm run dev` starts the same local preview.

## Files

- `data.js`: schedule and metadata; source files are in `assets/`.
- `core.js`: time calculations and search, independent of the DOM.
- `timeline.js`: generates the timeline, independent of the DOM.
- `app.js`: state and interactions; `index.html` and `styles.css`: structure and design.

Changing the day updates `?dia=YYYY-MM-DD`. Filters and zoom are kept in memory. No accounts, persistent storage, or external services.

## Deployment

GitHub Pages: **Settings → Pages → Deploy from a branch → main → /(root)**. These files are published directly.

## Data

An independent festival agenda. Data retrieved on October 28, 2026. [Sources](assets/fuentes.json) and [official program](assets/programacion-sanfic22.pdf). End times are calculated from film runtimes; introductions and discussions may extend screenings.
