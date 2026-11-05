# Export recheck — 2026-11-05

Scope: five newly accepted difficult rows and the user's Wilma suggestion in
`vivaelcine-reviews-2026-11-05 (1).json`. Applied to the registry following user approval; original export preserved unchanged.
Separate work identity, screening version, provider metadata, and canonical provider ID.
Updated policy: TMDB supplies available film years after identity acceptance; festival screening runtimes remain authoritative.

## Full export validation

All 74 catalogue entries have a decision: 52 accepted, five rejected, one
`no_match`, and 16 `unsure`. Every source fingerprint was recomputed from the
current catalogue; candidate fingerprints and embedded candidate observations
match the saved review data. No duplicate decisions, multiple accepted IDs per
film, reused accepted provider IDs, or conflicts with existing registry ownership
were found. The 47 previously sourced approvals remain the same identities as
the [SANFIC](tmdb-review-sanfic-verification.md) and
[FIDOCS](tmdb-review-fidocs-verification.md) verification records.

The five rejections are supported by different director identities and runtimes:

| Catalogue film | Rejected candidate | Reason |
| --- | ---: | --- |
| El llamado | 1550196 | Peter McPhee / 21 min versus Benjamín Fuentes Contreras / 15 min. |
| El vuelo de la cigüeña | 340948 | Soumaya Hidalgo + Berta Vicente Salas / 70 min versus Julián Pastor / 91 min. |
| Jacinto | 866337 | Karina Angulo Morales / 15 min versus Javi Camino / 95 min. |
| La ciudad de los dioses | 38267 | Sebastián S Claro / 19 min versus Jacques Tourneur / 84 min. |
| Quintil | 820067 | Esperanza Urrutia Mora / 13 min versus Masato Jimbo / 136 min. |

`no_match` for Angélica means none of the retrieved candidates was selected;
it does not establish absence from TMDB. The 16 `unsure` entries remain unresolved
even though the review UI counts them as reviewed. Wilma's newly supported
candidate resolves one of those uncertainties; the other 15 still need discovery
or version/part evidence. Pensaba remains provisional and the expanded Por dentro
entry requires a version flag despite their submitted acceptance.

The machine-readable companion is
[`assets/tmdb/review-export-audit.json`](../assets/tmdb/review-export-audit.json).
The original export is preserved as `assets/tmdb/review-submitted-20261105.json`. The normalized decisions apply 51 additional bindings, five candidate rejections and 18 film-level dispositions (17 unsure, one no_match). Two submitted acceptances remain held; Wilma is promoted from unsure after verification. The regenerated snapshot has 108 matches, 98 posters, 97 TMDB years and 145 festival appearances. Six existing bindings were revalidated after an independent main commit filled previously missing catalogue years; all other identity inputs were unchanged.

| Film | Selected TMDB | Finding |
| --- | ---: | --- |
| El Tigre del Este | 1708375 | Work matches; retain user's preferred ID, track duplicate 1816532. |
| Rumor | 1409285 | Work matches; retain user's preferred ID, track duplicate 1468350. |
| La Batalla de Chile — parte II | 1752899 | Part II identity matches; year/runtime conflict remains. |
| Pensaba que te habías olvidado de escribirme | 1816256 | Plausible 18-minute version; exact version independently unverified. |
| Por dentro somos color — cine expandido | 1308352 | Underlying work matches; 40-minute expanded screening is not established as the 12.5-minute linear version. |
| Wilma quiere más | 1465390 | Suggested new match confirmed; TMDB runtime is missing. |

## El Tigre del Este

[Chiledoc](https://www.chiledoc.cl/custodio-el-tigre-del-este/) identifies Jorge
Acevedo Carrasco's 2026 film about Custodio travelling to Mexico to bring his music
to Los Tigres del Norte. It lists Yareta/Queltehue, 90 minutes and an advanced-edit
status. [IN-EDIT](https://www.inedit.cl/el-tigre-del-este/) identifies the same
director, protagonist and story, with a 94-minute 2026 screening.

Cached TMDB 1708375 and 1816532 share title, director ID 2907203 and release date
2026-06-19; runtimes are 91 and 94 minutes respectively. These are consistent with
the same work. Keep the user's choice 1708375 as preferred; no evidence establishes
which TMDB ID is canonical or proves a distinct cut. Track 1816532 as a probable
duplicate, without merging or deleting provider records. Preserve festival runtime.

## Rumor

[Producer Sambaqui Cultural](https://www.sambaquicultural.com.br/item-portfolio/rumor/)
confirms Joana Nin, Olívia/Dalton's investigation, and Giulia Benite, Emílio Orciollo
Netto, Cristina Lago, Caroline Roehrig and Tiago Daniel. Its current page labels
the project 2027. The [producer's May 2025 post](https://www.sambaquicultural.com.br/sambaqui-cultural-no-curitibalab-2025-refinando-o-corte-final-de-rumor-a-partir-de-consultorias-especializadas/)
describes a 96-minute final-edit project targeting 2026; [SANFIC](https://sanfic.com/movies/rumor/)
lists 94 minutes. These dates and lengths describe inconsistent project metadata,
not evidence for a different Joana Nin film.

Both cached TMDB IDs name Joana Nin (1469261) and share Emílio/Cristina. Record
1468350 also contains the producer's other cast and IMDb tt32310704; 1409285 is
sparser. Retain user's preferred 1409285; track probable duplicate 1468350.
Richer metadata alone does not establish a canonical ID. Neither provider entry
has a release date/runtime to import.

## La Batalla de Chile — parte II

[Cineteca Nacional](https://www.cclm.cl/cineteca-nacional/la-batalla-de-chile-parte-ii/)
explicitly identifies **Parte II: El golpe de Estado**, Patricio Guzmán, 1976 and
90 minutes. Its credits also match cached TMDB 1752899: Chris Marker, Jorge Müller
and Pedro Chaskel. TMDB has the exact part subtitle, director and IMDb tt0074187;
its 1976/79-minute metadata differs from the preserved festival's 1977/88 minutes.

Accept the work/part identity. The primary source supports 1976 as a film year but
does not authenticate a 79-minute cut or the precise FIDOCS screening master.
Preserve FIDOCS source year/duration and provenance; display TMDB year 1976 under the approved metadata policy; treat the disagreement as metadata
or version uncertainty, not evidence that this is another trilogy part.

## Pensaba que te habías olvidado de escribirme

The preserved FIDOCS import identifies Sofía Hansen, Chile, 2026 and 18 minutes,
with [its source URL](https://fidocs.cl/programacion/pensaba-que-te-habias-olvidado-de-escribirme/).
Cached TMDB 1816256 has the exact title/director (4283937), Chile/Spanish and
18 minutes, but no release date, synopsis or independent identifier. Cached
1264679 has the same title/director but 2023-12-22 and 3 minutes.

The [official 2025 Bienal](https://17.bienaldeartesmediales.cl/obra/pensaba-que-te-habias-olvidado-de-escribirme-cartas-abiertas/)
documents Hansen's related *Cartas abiertas* as a multiprojection installation:
4-, 3- and 6-minute films, plus photographs. The [Universidad de Chile](https://artes.uchile.cl/noticias/241119/u-de-chile-abre-convocatoria-de-punta-medial-para-creadores-emergentes)
also describes the work's development and exhibition. This establishes multiple
presentations, not equivalence between the 18-minute film, the older 3-minute
entry and the installation.

1816256 is the best candidate for the user's 18-minute screening and retains
the submitted acceptance as provisional evidence, with publication held for exact-version verification. Exact version remains independently
unverified: do not merge 1264679, infer a release year, or import its poster as
proof of the 18-minute cut. Confirmation would need a filmmaker/festival credit
or synopsis linking that specific 18-minute version to 1816256.

## Por dentro somos color — cine expandido

The preserved FIDOCS entry is explicitly *versión cine expandido*, Elena Pardo,
2025 and 40 minutes, in FIDOCS Expandido; [festival source](https://fidocs.cl/programacion/por-dentro-somos-color-version-cine-expandido/)
and [ticket source](https://www.passline.com/eventos/por-dentro-somos-color-fidocs-expandido-fidocs-30)
remain recorded locally.

[Distributor Canyon Cinema](https://canyoncinema.com/2025/04/16/now-available-elena-pardos-por-dentro-somos-color-on-the-inside-we-are-color/)
offers Pardo's film as a **2024, 12.5-minute digital file**, with the same Poj Kaa
herbarium/Ruiz family plant-dye synopsis found in cached TMDB 1308352 (2024,
12 minutes, director 1652997). This confirms the underlying linear work.

Keep a version-conflict flag. A relationship to the linear film is supported;
an exact one-to-one match to the 40-minute expanded event is not. Do not replace
festival year/runtime with 2024/12 or claim that provider runtime describes the
screening. An explicit related-work/artwork decision could be supported separately.

## Wilma quiere más

The user's [TMDB 1465390](https://www.themoviedb.org/movie/1465390-wilma-will-mehr)
suggestion is correct. A fresh first-party API response gives *Wilma will mehr*,
Maren-Kea Freese (1316070), release 2025-07-31, IMDb tt36987225 and the matching
Fritzi Haberlandt-led cast. Runtime is 0/missing, not a zero-minute film.

[German distributor Neue Visionen](https://www.neuevisionen.de/de/filme/wilma-will-mehr-159)
lists 112 minutes and theatrical release 31 July 2025. [Official FSK record](https://www.fsk.de/detail/?detailid=67ea79a1630e83f94cfa5a4b&stype=single)
independently confirms Freese, Germany 2025 and cinema duration 111:54, which
rounds to the festival's 112 minutes. Title, director, year and story align with
the preserved SANFIC entry. Add 1465390 as the supported candidate; keep 112 minutes
from the festival/primary evidence rather than importing TMDB's missing runtime.

## Limits

FIDOCS live film/ticket pages were inaccessible during this audit; festival facts
above use the preserved import/source manifest, not a successful fresh page read.
TMDB observations for the five existing selections are cached first-party responses
retrieved on 2026-11-05. Wilma was freshly fetched into
`/tmp/vivaelcine-wilma-details.json` and `/tmp/vivaelcine-export-recheck-cache`.
External primary sources verify work identity; they do not adjudicate TMDB's
duplicate IDs. This audit does not publish decisions or certify every export row.
