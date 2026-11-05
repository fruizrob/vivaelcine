# Festival history — source feasibility and initial coverage

Checked November 4, 2026, for [issue #4](https://github.com/fruizrob/vivaelcine/issues/4). Research precedes acquisition choice: retain manually curated static metadata, independent of release years and Letterboxd ratings. No runtime scraper or new service required.

## Letterboxd Releases feasibility

Four sampled public Releases pages rendered through the web reader: [A Useful Ghost](https://letterboxd.com/film/a-useful-ghost/releases/), [Aquí se escucha el silencio](https://letterboxd.com/film/where-the-silence-is-heard-2026/releases/), [Dans la gueule de l’ogre](https://letterboxd.com/film/into-the-jaws-of-the-ogre/releases/), and [La siesta](https://letterboxd.com/film/the-nap-2019/releases/). They contain festival names and dates, alongside theatrical/digital releases. Useful Ghost has many festival entries; Silence has one. This is a four-film feasibility sample, not a completeness audit of either agenda.

Direct Python HTTP requests to the first two pages returned HTTP 403. Web-reader access therefore does not establish reliable unattended collection. The pages repeat entries under date and country views; deduplicate before using leads. Generic “Premiere” entries do not identify world, international, regional, or national scope. In particular, La siesta lists an Argentine theatrical entry before its Cannes entry. Do not convert the earliest visible festival entry into a world premiere.

Use these pages for discovery and identity cross-checking; prefer the festival's own record for published appearances and premiere scope. Missing entries establish nothing about a film's complete release history. Public API availability, licensing and exhaustive festival coverage were not established; no API dependency is assumed.

## Initial verified candidates

The bounded pilot supplies 12 exact film bindings: ten SANFIC standalone films, one FIDOCS standalone film, and one FIDOCS programme component. Most catalogue entries remain unresearched. This is selected coverage, not a complete festival filmography. Per the subsequent design request, unknown records add no history section; absence never establishes premiere status.

### SANFIC22 competition

The [official competition announcement](https://sanfic.com/mauricio-pesutic-josefina-montane-y-daniel-munoz-encabezan-la-competencia-de-cine-chileno-de-sanfic22/) identifies each film and its designation. Its edition is November 2–8, 2026. These are edition-level claims, not independently verified first-screening timestamps.

| `sanfic-2026` film ID | Scope at SANFIC22 |
| --- | --- |
| `animales` | World |
| `la-muerte-te-vio-volver` | World |
| `latir` | World |
| `monguen` | World |
| `rebelion-interior` | World |
| `bloques-erraticos` | Latin American |
| `cuadro-negro` | Latin American |
| `poblacion-flotante` | Latin American |
| `el-tigre-del-este` | National, Chile |

Exact source phrases: “Estreno mundial”; “Estreno latinoamericano”; “Estreno nacional”. Preserve those scopes. Label an edition's premiere association with SANFIC22; a repeat screening is not another world-first screening.

The same announcement verifies earlier appearances: `bloques-erraticos`, Thomas Woodroffe, San Sebastián 2026 New Directors; `cuadro-negro`, Carolina Adriazola/José Luis Sepúlveda, Punto de Vista 2025. It also names Shanghai for El tigre del este and Ji.hlava for Población flotante without years; omit those undated appearances from chronological data until their editions are verified.

San Sebastián's [official 2026 programme](https://www.sansebastianfestival.com/programacion) confirms its 74th edition, September 18–26, and Bloques erráticos screenings. Retain edition range rather than assume which start was the premiere. Its runtime varies from the imported SANFIC runtime (92 versus 96 minutes); identity is the named Thomas Woodroffe feature, but no cut/version equivalence is independently established. Conservative option: retain only SANFIC's explicit account of its earlier 2026 festival appearance, with year precision.

Punto de Vista's [official 2025 results](https://www.puntodevistafestival.com/es/noticias/2025/la-chilena-cuadro-negro-de-jose-luis-sepulveda-y-carolina-adriazola-ganadora-del-gran-premio-a-la-mejor-pelicula-de-la-seccion-oficial-este-ano) independently confirm Cuadro Negro's appearance at edition 19 and both directors. Store `2025`; the result publication date is not a screening date.

### Other exact bindings

| Binding | Verified appearance and precision | Evidence |
| --- | --- | --- |
| `sanfic-2026/a-useful-ghost` | Cannes, Semaine de la Critique 64, `2025-05-17`; historical world premiere | [Official film record](https://www.semainedelacritique.com/en/edition/2025/movie/pee-chai-dai-ka), explicit “World premiere”; [official screening programme](https://www.semainedelacritique.com/uploads/general_files/2025/Programme_SDLC2025.pdf) supplies May 17. Ratchapoom Boonbunchachoke, 2025, 130 minutes matches the imported film. This is not a SANFIC world premiere. |
| `fidocs-2026/aqui-se-escucha-el-silencio` | Guadalajara41, `2026-04-17`–`2026-04-25`; EDOC, `2026-09-25` | [FICG selection](https://ficg.mx/en/ficg41-anuncia-las-peliculas-seleccionadas-de-la-seccion-largometraje-iberoamericano-documental/) identifies Gabriela Pena/Picho García; [closing report](https://ficg.mx/ficg-41-una-clausura-que-mira-al-pasado-y-celebra-el-presente-del-cine/) confirms attendance and edition dates. [EDOC film/screening record](https://festivaledoc.org/etn/aqui-se-escucha-el-silencio/) matches both directors, 2026, 94 minutes and specifies September 25, 19:30, INCINE Sala 2. No premiere scope inferred. |
| `fidocs-2026/foco-federico-luis`, component `La siesta` | Cannes official short-film competition, `2019`; historical international premiere | [Cannes film record](https://www.festival-cannes.com/f/la-siesta/) matches Federico Luis, Argentina, 2019, 15 minutes. [Cannes filmmaker biography](https://cinemadedemain.festival-cannes.com/en/2025/six-new-filmmakers-at-the-residency-of-the-festival-de-cannes/) explicitly says “international premiere in the Official Competition at Cannes 2019”. Label only that component; siblings and the focus programme inherit nothing. |

## Exclusions and limits

- Direct FIDOCS detail reads failed during this check; existing imported identities and the independent sources above support the selected bindings. Do not interpret that access failure as missing releases.
- Cannes lists Calle Santa Fe at 163 minutes while FIDOCS lists 167. No version reconciliation completed; leave it outside the pilot.
- The expanded-cinema version of Por dentro somos color, unidentified winner slots, and programme/part aggregates receive no inferred histories. Histories for individual films or verified parts require their own bindings.
- Only published date precision is retained. Year-only dates stay year-only; edition ranges stay ranges. Neither is presented as an exact screening date. An appearance is marked announced only when its earliest possible date is after the selected screening, outside the selected edition. The list does not claim that a past scheduled screening actually took place.

## Curation and refresh

Implemented pilot: all 12 bindings above, with 14 sourced appearances. Bloques erráticos retains only its SANFIC edition designation: the earlier version/runtime question remains unresolved. Cuadro Negro uses the independently confirmed 2025 Punto de Vista appearance. Useful Ghost uses its exact May 17 date from the programme linked above. La siesta preserves the explicit international scope from Cannes' filmmaker biography. No future announcements were added to this pilot; synthetic fixtures verify future and partial dates.

`data/festival-history.js` is a lookup of appearances by `festivalId/filmId`. A programme member uses its own film ID when available, otherwise `festivalId/programmeId/componentTitle`. A separately identified part uses `festivalId/eventId`; it never falls back to its parent film. There is no second film catalogue or duplicate title/director metadata. Reimporting schedules leaves the lookup intact; tests check its keys and primary-source links. Identity and premiere evidence live in this document.

The renderer produces one dated list. Festival names are source links, premiere scopes appear beside their festival, and edition names remain available on the links. Programme histories use the existing film rows rather than a second list of film titles. Missing histories produce no markup. There are no group headings, source labels, or explanatory footnotes in the interface.

For each new record: confirm title/director and version/runtime; copy an explicit festival/edition and date precision; link the primary evidence; record exact premiere scope only when stated; bind the exact standalone film, component, or screening part. Keep source publication dates separate from screening dates. Recheck programme announcements before changing their status. Never infer a world premiere from absent history, a generic release category, or the first date in a partial list.

## Validation

All 39 tests pass, covering identity/source checks, scoped premieres, repeat-screening edition associations, chronological ordering, future announcements, partial dates, absent history, and component separation, alongside the existing schedule, sharing, rating, and film-year checks. Twelve Chrome layout cases passed at 1280, 390, and 320 pixels: Cuadro Negro (prior appearance), Animales (world premiere), A Happy Family (no history), and Foco Federico Luis (independent shorts). Repeat-screening navigation, keyboard dismissal, and overflow were checked; screenshots inspected. External Letterboxd widgets and analytics were blocked during local layout checks.
