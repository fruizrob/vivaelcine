# FIDOCS 2026 — agenda sources

Collected November 3, 2026. FIDOCS is an independent festival dataset (`fidocs-2026`), with its own dates, spaces, sections, films, screenings and provenance. SANFIC data stays separate.

## Coverage

All four official listing pages and all 51 linked detail pages were collected. Their 56 published starts normalize to **48 screening blocks**, grouping ten short films into two shared sessions. The dataset has 53 film/program records, including every original listing, plus 13 film components embedded in three focus programs. Sources: [page 1](https://fidocs.cl/programacion/), [page 2](https://fidocs.cl/programacion/?e-page-30fe25f=2), [page 3](https://fidocs.cl/programacion/?e-page-30fe25f=3), [page 4](https://fidocs.cl/programacion/?e-page-30fe25f=4).

The current program is **FIDOCS 30**, with the edition year confirmed as **2026** by the [official pass page](https://fidocs.cl/abono-fidocs30/). Observed screenings run **November 13–19**; this describes the imported schedule, rather than an independently verified festival opening/closing announcement.

Six screening spaces appear: Cineteca Nacional, Centro Arte Alameda – Sala CEINA, Sala de Cine UC, Sala K / U. Mayor, Paseo Bulnes, and CEINA Sala Expo 2. The outdoor site and the expo room remain distinct. [Program](https://fidocs.cl/programacion/), [outdoor screening](https://fidocs.cl/programacion/el-tren-fluvial/), [expo screenings](https://fidocs.cl/programacion/por-dentro-somos-color-version-cine-expandido/).

The navigation's [venues page](https://fidocs.cl/sedes-29/) still says “Sedes 29”; it was not used to establish edition 30's space inventory. Section pages may also retain previous-edition content: use the current program listings and individual details for import.

## Modeling decisions

- **Borges:** the official detail lists 323 minutes total and three starts (11:00, 14:15, 16:00). The review describes three films. Three events preserve those starts, each with explicit `duration: null`, because individual part runtimes could not be verified. The 323-minute aggregate never becomes three overlapping blocks. [Source](https://fidocs.cl/programacion/biografia-de-jorge-luis-borges/).
- **La Batalla de Chile:** three events start 15:00, 16:45, 18:30, with individual published runtimes **96, 88, 79 minutes**. The ticket page also advertises ten-minute intervals, but the published start/runtime pairs imply different gaps; retain the exact starts. [Festival detail](https://fidocs.cl/programacion/la-batalla-de-chile-parte-i-ii-y-iii/), [official ticket page](https://www.passline.com/eventos/la-batalla-de-chile-funciones-especiales-fidocs-30).
- **Cortos Emergentes:** five November 13 details share one official ticket URL, date, start and room; five November 17 details share another. These become two sessions with all ten films preserved and searchable as components. Summed published runtimes are **79** and **80 minutes**. [Program 1 ticket target](https://www.passline.com/eventos/competencia-nacional-cortos-emergentes-1-fidocs-30), [program 2 ticket target](https://www.passline.com/eventos/competencia-nacional-cortos-emergentes-2-fidocs-30). Every member's detail URL and outgoing ticket URL is retained in the manifest.
- **Expanded cinema:** both 15:00 and 18:15 starts are preserved for the 40-minute *Por dentro somos color* in Expo 2. [Source](https://fidocs.cl/programacion/por-dentro-somos-color-version-cine-expandido/).
- **Focus programs:** component titles, directors, countries, years and runtimes are preserved from the official detail pages. Published session totals: Federico Luis **77 min**, Pelechian **83 min**, Sergio Bravo **60 min**. [Federico Luis](https://fidocs.cl/programacion/foco-federico-luis/), [Pelechian](https://fidocs.cl/programacion/pelechian-project/), [Sergio Bravo](https://fidocs.cl/programacion/sergio-bravo/).
- **Q&A:** retain published Q&A notes, without inventing a duration or extending runtime-based ends. [Example](https://fidocs.cl/programacion/aqui-se-escucha-el-silencio/).
- **Winners:** three November 19 slots retain category names, starts and spaces with unknown durations. No winning film is inferred. [Official program](https://fidocs.cl/programacion/?e-page-30fe25f=3).

## Source inconsistencies and limits

- Federico Luis: header total 77 minutes; five component runtimes sum to 78. Preserve the published header total and flag the discrepancy. [Source](https://fidocs.cl/programacion/foco-federico-luis/).
- Pelechian: header year range 1967–1992; the component list includes *Land of the People* (1966). Preserve both source values. [Source](https://fidocs.cl/programacion/pelechian-project/).
- Three Borges part ends and three winner runtimes remain unknown. Full festival date announcement remains unverified.
- Direct HTTP collection failed; snapshots are rendered official page text. Ticket-page bodies often timed out; outgoing official ticket URLs were still resolved. Group membership uses those shared targets plus matching room/date/start, not an assumed program order. No ticket was purchased.

## Files and reproduction

- `data/fidocs-2026.js`: normalized schedule.
- `assets/fidocs-2026-sources.json`: all listing/detail URLs, exact source time labels, starts in minutes, original room labels, listing-to-event/component mappings, counts and uncertainties.
- `scripts/import-fidocs-2026.py`: offline importer; Python standard library only. Run `python3 scripts/import-fidocs-2026.py RAW_DIRECTORY` from the repository.
- Immutable rendered source snapshots remain outside the public repository, under the local collection folder `sanfic22-web/fidocs-2026/raw/`. Public provenance contains their SHA-256 hashes, without machine-specific paths or long reviews.
