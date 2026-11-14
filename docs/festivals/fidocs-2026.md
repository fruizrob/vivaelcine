# FIDOCS 2026 — agenda sources

Collected November 3, 2026; audited and supplemented November 13. FIDOCS is an independent festival dataset (`fidocs-2026`), with its own dates, spaces, sections, films, screenings and provenance. SANFIC data stays separate.

## Coverage

All four official listing pages and all 51 linked detail pages were collected. Their 56 published starts normalize to **48 screening blocks**, grouping ten short films into two shared sessions. The dataset has 53 film/program records, including every original listing, plus 13 film components embedded in three focus programs. Sources: [page 1](https://fidocs.cl/programacion/), [page 2](https://fidocs.cl/programacion/?e-page-30fe25f=2), [page 3](https://fidocs.cl/programacion/?e-page-30fe25f=3), [page 4](https://fidocs.cl/programacion/?e-page-30fe25f=4).

The November 13 audit confirmed the same film inventory, dates, starts and rooms. Four standalone [parallel activities](https://fidocs.cl/actividades-paralelas/) bring the agenda to **52 blocks**. They appear under **Actividades paralelas**, with published start/end intervals, three registration links and the UDP auditorium as a seventh space. The shared `films` record map retains its existing contract; non-film records have `kind: 'activity'`, no invented director/year/provider identities, and are excluded from TMDB import. The free Chris Marker book launch needs no registration. [Audit](fidocs-2026-audit-20261113.md).

The current program is **FIDOCS 30**, with the edition year confirmed as **2026** by the [official pass page](https://fidocs.cl/abono-fidocs30/). Observed screenings run **November 13–19**; this describes the imported schedule, rather than an independently verified festival opening/closing announcement.

Six screening spaces appear: Cineteca Nacional, Centro Arte Alameda – Sala CEINA, Sala de Cine UC, Sala K / U. Mayor, Paseo Bulnes, and CEINA Sala Expo 2. The outdoor site and the expo room remain distinct. [Program](https://fidocs.cl/programacion/), [outdoor screening](https://fidocs.cl/programacion/el-tren-fluvial/), [expo screenings](https://fidocs.cl/programacion/por-dentro-somos-color-version-cine-expandido/).

The navigation's [venues page](https://fidocs.cl/sedes-29/) still says “Sedes 29”; it was not used to establish edition 30's space inventory. Section pages may also retain previous-edition content: use the current program listings and individual details for import.

## Modeling decisions

- **Borges:** three starts remain 11:00, 14:15 and 16:00. The current PDF verifies individual runtimes **130 / 89 / 104 minutes**, totaling 323. Runtime-based ends are 13:10, 15:44 and 17:44; the PDF's printed windows end 13:15, 15:45 and 17:45. Notes retain that difference; the aggregate never becomes three overlapping blocks. [Detail](https://fidocs.cl/programacion/biografia-de-jorge-luis-borges/), [PDF](https://fidocs.cl/wp-content/uploads/2026/11/Programacion-FIDOCS-30.pdf).
- **La Batalla de Chile:** three events start 15:00, 16:45, 18:30, with individual published runtimes **96, 88, 79 minutes**. The ticket page also advertises ten-minute intervals, but the published start/runtime pairs imply different gaps; retain the exact starts. [Festival detail](https://fidocs.cl/programacion/la-batalla-de-chile-parte-i-ii-y-iii/), [official ticket page](https://www.passline.com/eventos/la-batalla-de-chile-funciones-especiales-fidocs-30).
- **Cortos Emergentes:** five November 13 details share one official ticket URL, date, start and room; five November 17 details share another. These become two sessions with all ten films preserved and searchable as components. Summed published runtimes are **79** and **80 minutes**. [Program 1 ticket target](https://www.passline.com/eventos/competencia-nacional-cortos-emergentes-1-fidocs-30), [program 2 ticket target](https://www.passline.com/eventos/competencia-nacional-cortos-emergentes-2-fidocs-30). Every member's detail URL and outgoing ticket URL is retained in the manifest.
- **Expanded cinema:** both 15:00 and 18:15 starts are preserved for the 40-minute *Por dentro somos color* in Expo 2. [Source](https://fidocs.cl/programacion/por-dentro-somos-color-version-cine-expandido/).
- **Focus programs:** component titles, directors, countries, years and runtimes are preserved from the official detail pages. Published session totals: Federico Luis **77 min**, Pelechian **83 min**, Sergio Bravo **60 min**. [Federico Luis](https://fidocs.cl/programacion/foco-federico-luis/), [Pelechian](https://fidocs.cl/programacion/pelechian-project/), [Sergio Bravo](https://fidocs.cl/programacion/sergio-bravo/).
- **Q&A:** retain published Q&A notes, without inventing a duration or extending runtime-based ends. [Example](https://fidocs.cl/programacion/aqui-se-escucha-el-silencio/).
- **November 13 screening notes:** Sergio Bravo gains the PDF's Q&A and [verified free admission](https://fidocs.cl/foco-restauraciones/). Revolutionaries Never Die includes the [Performance mortuoria book presentation](https://fidocs.cl/actividades-paralelas/) before the film, with no invented presentation duration or separate simultaneous block. PDF context identifies FIDOCS + INEDIT, the closing screening and the outdoor screening. Shorts use the PDF's printed member sequence, without claiming a guaranteed projection order.
- **Winners:** three November 19 slots retain category names, starts and spaces with unknown durations. No winning film is inferred. [Official program](https://fidocs.cl/programacion/?e-page-30fe25f=3).

## Source inconsistencies and limits

- Federico Luis: header total 77 minutes; five component runtimes sum to 78. Preserve the published header total and flag the discrepancy. [Source](https://fidocs.cl/programacion/foco-federico-luis/).
- Pelechian: header year range 1967–1992; the component list includes *Land of the People* (1966). Preserve both source values. [Source](https://fidocs.cl/programacion/pelechian-project/).
- Cortos Emergentes #1: PDF total 80 minutes conflicts with the individual-film sum 79. La Batalla de Chile: PDF header 323 conflicts with its own parts totaling 263. Preserve 79 and 263 and display discrepancy notes. [PDF](https://fidocs.cl/wp-content/uploads/2026/11/Programacion-FIDOCS-30.pdf).
- Only the three winner runtimes remain unknown. Full festival date announcement remains unverified.
- Initial collection used rendered official page text. November 13 HTTP checks succeeded for all 55 listing/detail pages; ticket URLs were unchanged. The Revolutionaries “upcoming” notice disappeared, but ticket availability was not verified. Group membership uses shared ticket targets plus matching room/date/start. No ticket was purchased.

## Files and reproduction

- `data/fidocs-2026.js`: normalized schedule.
- `assets/fidocs-2026-sources.json`: all listing/detail URLs, exact source time labels, starts in minutes, original room labels, listing-to-event/component mappings, counts and uncertainties.
- `scripts/import-fidocs-2026.py`: offline importer; Python standard library only. Run `python3 scripts/import-fidocs-2026.py RAW_DIRECTORY` from the repository.
- `assets/fidocs-2026-updates.json`: sourced November 13 supplemental input; imported after the original snapshots and curated identities. It preserves activities, runtimes, notes, printed component order and source discrepancies on regeneration. Public provenance records its hash and the PDF hash; counts distinguish 48 screenings from four activities.
- Immutable rendered source snapshots remain outside the public repository, under the local collection folder `sanfic22-web/fidocs-2026/raw/`. Public provenance contains their SHA-256 hashes, without machine-specific paths or long reviews.
