# FICVIÑA 38 (2026) — program sources

Collected November 13, 2026. The independent `ficvina-2026` agenda follows the
[official two-page program](https://cinevina.cl/wp-content/uploads/2026/11/Programacion-FicVina-2026.pdf),
downloaded and visually transcribed because it contains images rather than selectable text.
The original PDF is preserved locally and checked by SHA-256 before regeneration.

## Coverage

The festival runs **November 23–28**. Preview screenings on **November 20–21**
are included in the agenda. Both dates and free admission are confirmed by the
[official outdoor announcement](https://cinevina.cl/el-cine-sale-a-la-calle-ficvina-se-toma-playas-muelle-y-centro-de-vina-del-mar/).
The date navigation includes only dates with published screenings; there is no November 22 event.

All **42 printed screening blocks**, containing **85 individual films**, are retained:

| Space | Screenings | PDF page |
| --- | ---: | ---: |
| Cinemark, Av. Libertad 1348 | 12 | 1 |
| Teatro Municipal, Plaza Vergara | 13 | 2 |
| Cine Arte, Plaza Vergara 142 | 14 | 2 |
| Playa Los Marineros | 1 | 1 |
| Muelle Vergara | 1 | 1 |
| Calle Von Schroeders | 1 | 1 |

The PDF's **13 Palacio Vergara talks** are also transcribed, with starts, speakers,
moderators and unknown durations, in the source manifest's `activities` collection.
These are preserved for future use and are **not displayed in the film agenda**.
Other named festival venues have no screenings in this PDF; no times are inferred.

## Schedule and identity decisions

- Shorts stay together in seven shared sessions: Pulso 1/2 (119/103 min),
  Creando Universos 1/2 (96/86 min), Habitar (86 min), and Ruca 1/2 (44/57 min).
  Each member remains searchable and keeps its director/country or university.
  Unpublished individual runtimes and years are omitted.
- Cine Arte's November 28 **15:00** entry is one double bill: *El jardín de los
  pañuelos blancos* (**7 min**) and *Detrás de la lluvia* (**98 min**). Its 105-minute
  total is calculated from those two published lengths. No second start is invented.
- Opening and closing entries retain the **19:00 / 19:30 ceremony starts**, with
  explicit unknown event durations. Film lengths (118/155 min) remain in their
  records and notes. The timeline does not invent ceremony ends or separate movie starts.
- *Karmele*: use the PDF's **November 28, 14:30**. The
  [official article](https://cinevina.cl/karmele/) contains both 15:00 and 14:30.
  Its screening details flag this conflict and advise confirming with the organizer.
- *Réplicas*: the PDF places the November 27 **17:30 Cinemark** screening under
  Habitar; the [Desde Aquí announcement](https://cinevina.cl/ficvina-reune-cinco-miradas-sobre-el-chile-de-hoy-en-la-competencia-desde-aqui/)
  places that same screening in Desde Aquí. Preserve the PDF section, record the conflict,
  and keep one screening. No fifth Desde Aquí screening is missing.
- *La anatomía de los caballos*: preserve its fiction competition placement;
  the PDF's conflicting genre label “Documental” is not imported as a section.
  [Competition announcement](https://cinevina.cl/competencia-largometraje-iberamericano-de-ficcion/).
- Edition-specific metadata stays independent. *Plata o mierda* is 98 min / 2026
  here versus FIDOCS's 88 min / 2025. *Guerra de verano* lists Argentina in the PDF,
  while the fiction announcement presents it as Chilean. Details retain these discrepancies.
- Names follow the PDF; *Motel paraíso* additionally has the director alias Lalo Castilla
  from the [Joya announcement](https://cinevina.cl/38-ficvina-presenta-joya-con-cinco-aclamados-estrenos-del-cine-iberoamericano/).
  Conam Calderón's name is confirmed against the
  [official OsloFusion entry](https://oslofusion.no/en/films/film/me-vas-a-estar-esperando).
- New Letterboxd/TMDB identities, scores, posters and premiere histories are not inferred.
  The existing TMDB importer discovers the new catalogue on its next enrichment run.
  Cached-snapshot tests replay only the films recorded in that snapshot's coverage manifest.

## Files and regeneration

- `assets/programacion-ficvina-2026.pdf`: original official PDF.
- `assets/ficvina-2026-sources.json`: transcription, page references, hash,
  cross-check URLs and separately collected talks.
- `data/ficvina-2026.js`: generated independent schedule.
- `scripts/import-ficvina-2026.mjs`: offline generation using Node's standard library.

Run `node scripts/import-ficvina-2026.mjs`, then `npm test`.
After schedule changes, run `npm run generate:pages` before testing to refresh
the public festival/day/screening pages, sitemap and short sharing links.
When the organizer revises the PDF, visually review both pages and update the
manifest and its hash together before regenerating. Publication is a separate step.
