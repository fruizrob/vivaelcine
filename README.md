# ¡Viva el Cine!

Film festival schedules organized by time and screening room. Each festival has an independent agenda; more will be added as new festivals are announced.

Switch between **SANFIC22** and **FIDOCS 30** in the header. Time runs horizontally, rooms vertically, and blocks match published runtimes. Search, venue and section filters, zoom, and screening details work within the selected festival.

- [SANFIC22](https://vivaelcine.cl/?festival=sanfic-2026): November 2–8, 2026. The original 100 screenings across seven rooms.
- [FIDOCS 30](https://vivaelcine.cl/?festival=fidocs-2026): November 13–19, 2026. All 51 official listings, normalized into 48 screening blocks across six spaces. Sourced independently from [FIDOCS](https://fidocs.cl/programacion/).

## Development

No dependencies or build step. From the repository root:

```sh
python3 -m http.server 4174 --bind 127.0.0.1
```

Open http://127.0.0.1:4174/. With Node.js 20+, `npm test` checks schedule data, filters, and timeline proportions. `npm run dev` starts the same local preview.

## Files

- `data.js`: festival registry and URL selection.
- `data/`: one independent schedule per festival; source records are in `assets/`.
- `core.js`: time calculations and search, independent of the DOM.
- `timeline.js`: generates the timeline, independent of the DOM.
- `app.js`: state and interactions; `index.html` and `styles.css`: structure and design.

Festival links use `?festival=FID`; changing the day adds `&dia=YYYY-MM-DD`. Existing SANFIC links without a festival parameter still work. Filters and zoom are kept in memory. No accounts, persistent storage, or external services.

## Deployment

GitHub Pages: **Settings → Pages → Deploy from a branch → main → /(root)**. These files are published directly.

## Data

Independent agendas based on official programs. SANFIC data retrieved on October 28, 2026: [sources](assets/fuentes.json), [official program](assets/programacion-sanfic22.pdf). FIDOCS data and provenance are separate: [research notes](docs/festivals/fidocs-2026.md), [source records](assets/fidocs-2026-sources.json).

End times are calculated from film or session runtimes, excluding introductions and discussions. Multipart works use each part's verified runtime. If a duration is unpublished, the timeline shows a dashed start marker without inventing an end time. Shorts sharing a verified program appear as one block, with individual films in its details and search results.
