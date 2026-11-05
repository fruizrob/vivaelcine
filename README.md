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

Open http://127.0.0.1:4174/. With Node.js 20+ and Python 3.9+, `npm test` checks schedule data, Letterboxd identities, filters, and timeline proportions. `npm run dev` starts the same local preview.

## Files

- `data.js`: festival registry and URL selection.
- `data/`: one independent schedule per festival; source records are in `assets/`.
- `core.js`: time calculations and search, independent of the DOM.
- `timeline.js`: generates the timeline, independent of the DOM.
- `story.js`: draws Story cards and owns the sharing preview, export, and clipboard fallback.
- `sharing.js`: opens the share menu for a screening, with Story and link actions.
- `festival-history.js` and `data/festival-history.js`: sourced film festival appearances and premiere scopes in details.
- `app.js`: state and interactions; `index.html` and `styles.css`: structure and design.

Festival links use `?festival=FID`; changing the day adds `&dia=YYYY-MM-DD`. Without a valid day in the URL, the agenda opens on today's date in the festival's timezone, or its first day when today is outside the schedule. Existing SANFIC links without a festival parameter still work. Filters and zoom are kept in memory. No accounts or persistent storage.

## Share a screening

Select the small share arrow beside a screening's Letterboxd score to open a menu with **Historia de Instagram** and **Copiar enlace**. Supported devices also offer **Compartir enlace**, which opens the device's share sheet with the exact screening URL. The icon is also available in the detail dialog; very narrow blocks and unknown-duration markers keep sharing in their details. Choosing the Story opens a 1080 × 1920 preview with **Compartir**, **Descargar**, and **Copiar enlace**. Image sharing opens the device's share sheet when file sharing is available; downloading remains available. Paste the copied URL into Instagram's link sticker to link to the exact screening.

Screening links include `?festival=FID&dia=YYYY-MM-DD&funcion=EVENT_ID` and open that exact screening. A valid screening takes precedence over the day parameter; an unknown screening falls back to the normal agenda. Closing the detail removes `funcion` from the current URL.

Images are generated locally with Canvas; no backend, login, or external image service. Sharing requires a supported browser and HTTPS (or localhost). The browser cannot choose Instagram as the destination or guarantee its Story composer opens; the user selects the destination. Verify that handoff on physical iOS and Android devices. [Implementation references](docs/instagram-story-sharing.md).

## Deployment

GitHub Pages: **Settings → Pages → Deploy from a branch → main → /(root)**. These files are published directly.

Cloudflare Web Analytics measures visits and page views using the official script in `index.html`. View reports in the Cloudflare account under **Observability → Analytics → Web analytics → vivaelcine.cl**. Manual installation supports the current DNS-only setup; no proxy or hosting change is required.

## Data

Independent agendas based on official programs. SANFIC data retrieved on October 28, 2026: [sources](assets/fuentes.json), [official program](assets/programacion-sanfic22.pdf). FIDOCS data and provenance are separate: [research notes](docs/festivals/fidocs-2026.md), [source records](assets/fidocs-2026-sources.json).

End times are calculated from film or session runtimes, excluding introductions and discussions. Multipart works use each part's verified runtime. If a duration is unpublished, the timeline shows a dashed start marker without inventing an end time. Shorts sharing a verified program appear as one block, with individual films in its details and search results.

Cards and screening details show verified film years. Missing years are omitted; a year does not establish premiere status. Shared programmes show individual years in their details, and separately identified parts use their own years. Sources, remaining gaps, and regeneration rules: [film years](docs/film-years.md).

Cards place the start time at the top left and the verified release year at the top right. The title and smaller director/runtime text sit inset below the header, with up to two lines and no ellipses. End times stay in the tooltip and screening details. The footer groups the sourced festival logo, Letterboxd and sharing controls; narrow cards keep additional actions available in details.

Screening boxes show a compact Letterboxd score linking to the film when a published average is verified. Scores are dated snapshots; film details load Letterboxd's live ratings widget. Shorts inside programmes have individual links; programmes have no combined rating. No API key, backend, or runtime scraper. Add an optional `letterboxd` slug to a film, component, or separately identified screening. Identity checks, score sources and refresh procedure: [Letterboxd sources](docs/letterboxd.md).

Film details show a chronological **Festivales** list when verified history is available. Festival names link to sources; dates keep their published precision, later appearances are marked **Anunciada**, and premiere scopes stay with the named edition. Programme films show their own histories inside their existing details. Initial coverage: 12 films, 14 appearances. [Sources and curation](docs/festival-history-sources.md).

Agenda cards show one compact festival logo beside its name when sourced history is available for a prioritized festival. Narrow cards keep the name alone; very narrow cards keep festival history in details. Cannes comes first, followed by Venice, Berlinale, TIFF and the rest of the editorial list. Hover text names the festival and year; programmes identify the particular short. Full history stays in details. [Priority, behavior and logo sources](docs/festival-marks.md).

### TMDB history

`npm run import:tmdb` reads the entire dashboard catalogue, saves successful API responses under `assets/tmdb/responses/`, writes a coverage report to `assets/tmdb/coverage.json`, and generates `data/tmdb-festival-history.json` for the site. Repeated screenings count once; programme members and separately identified parts keep their own identities. Unannounced winner slots are reported without querying an invented film. Visitors read only the local JSON; they never contact TMDB's API or need credentials. Curated histories take precedence for the same festival and year.

Create a [TMDB account](https://www.themoviedb.org/signup) and request API access in [Settings → API](https://www.themoviedb.org/settings/api). Save the **API Read Access Token**, alone on one line, in `~/.config/vivaelcine/tmdb-read-token` with permissions `600`. Alternatively set `TMDB_READ_ACCESS_TOKEN` in your shell. Keep credentials outside this repository and its static server root; `.gitignore` also excludes `.config/`, `.env*`, and `tmdb-read-token` as a safeguard.

Use `npm run import:tmdb -- --offline` to regenerate from saved responses without credentials or network access. Use `--refresh` to fetch fresh responses. A failed request stops the import and preserves the site's previous snapshot. Coverage limits, identity checks, and source semantics: [TMDB history](docs/tmdb-pilot.md).
