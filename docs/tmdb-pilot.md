# TMDB festival history

The importer checks the entire dashboard catalogue for TMDB festival histories. It does not assume that a matched movie has complete festival records.

## Full catalogue: November 5, 2026

All 134 dashboard film/part entries are accounted for: 131 announced entries were queried, while three unannounced winner slots are reported separately. Screening repeats are not counted again; shorts and separately listed parts retain their own identities.

| Result | Entries | Percentage of 131 announced entries |
| --- | ---: | ---: |
| Queried | 131 | 100% |
| TMDB identity matched | 108 | 82.4% |
| Needs identity review | 18 | 13.7% |
| Unmatched after bounded search | 5 | 3.8% |
| Usable TMDB festival history | 59 | 45.0% |

The snapshot includes 98 posters, 97 available TMDB years, 145 recognized festival appearances and all 1,176 regional release entries. The November 5 exported review adds 51 accepted bindings to the previous 57: 47 sourced approvals, El Tigre del Este, Rumor, La Batalla de Chile part II, and newly verified Wilma. Five wrong candidates are persistently rejected. Two uncertain versions remain held; see [recheck](tmdb-export-recheck.md). Three unannounced winner slots are excluded from the 131-film denominator. `queried` counts announced entries considered, including direct ID refreshes.

Unresolved entries remain in the coverage report with candidate rejection reasons and explicit search budgets. A match with no accepted festival note remains distinguishable from an unmatched film. These figures measure what the current importer can publish, not TMDB's exhaustive coverage or proof that an uncovered film never attended a festival.

## Initial sample: November 5, 2026

The initial proof of concept sampled 20 films: 11 matched and 24 recognized festival appearances imported. Nine films failed identity checks or were absent from the bounded search results. There were no ambiguous passing matches. That sample is preserved in `data/tmdb-pilot.json` for reference; it does not control the importer anymore. The current snapshot and coverage report cover the entire dashboard.

For that initial sample, the import added 21 appearances and histories for seven previously uncovered films after curated records took precedence. Combined coverage at that point was 19 films and 35 appearances, including curated films outside the sample. Those figures were not full-catalogue coverage.

The gaps are not all missing TMDB data: *A Useful Ghost* has its director credited in Thai; *La siesta*, *Latir*, and *La muerte te vio volver* have different director name forms. *Bloques erráticos* has a different runtime. These now have sourced manual bindings; automatic identity rules remain strict. *Silent Friend*, previously blocked by its main release year and director name order, now has a sourced manual binding. Unknown festival notes are also retained in the report rather than discarded from the evidence.

## Data flow

`filmCatalogue()` in `scripts/import-tmdb.mjs` derives the import scope from every screening and explicitly listed `unscheduledFilmIds` in every registered festival. Repeated screenings share one identity; programme blocks expand into individual films, reusing component film IDs where available. Separately titled screenings use their own event IDs, titles, years and runtimes. Parts with unpublished runtimes never inherit the full work's runtime. Programme labels such as `Foco Alan Berliner #1:` are stripped from search titles.

The shared `applyFilmMetadata()` overlay now applies valid nonempty TMDB original titles, credited directors, work runtimes, production countries and synopses as well as release years. Local billed titles remain unchanged; provider titles are stored separately. Explicit `event.duration` values, including unknown windows, take precedence over work runtimes. Programmes marked `durationKind: 'sum'` recompute their totals from enriched components; explicit programme windows remain intact. The browser and generated pages use this same overlay. [AMOR field corrections and limitations](festivals/amor-2026.md).

Titles, directors, verified aliases, known years, and runtimes come from the schedules. No year is inferred from the festival edition. Winner slots without an announced film are retained in the report with status `unannounced`, without querying TMDB. Coverage reports distinguish all dashboard entries (`total`) from actual film entries searched (`queried`) and unannounced slots; percentages of film coverage use `queried` as their denominator.

Run `npm run import:tmdb` with Node.js 20+. The script:

1. Reuses an accepted binding from `data/film-identities.json` and requests details by ID. Otherwise it can crosswalk a sourced `externalIds.imdb` value, or search each distinct title/verified alias with the known year, then retry without a year if no identity is accepted. It considers whole result pages within a limit of two pages per query and 40 candidate IDs per year/no-year phase. Search truncation is explicit and prevents automatic acceptance.
2. Fetches each candidate's details with credits, alternative titles, and release dates.
3. For new automatic matches, requires an exact normalized title or alternative title, every named director, the verified year when known, and runtime within three minutes. Accents and punctuation are normalized. Multiple passing candidates remain ambiguous and unpublished. Previously rejected candidates and pending review decisions cannot be automatically accepted. Accepted bindings report text/year/runtime discrepancies separately; material source/provider identity changes require review.
4. Retains all regional release entries in `metadata[key].releases`, including country, type, date, note and certification. Uses the accepted movie’s main `release_date` for `metadata[key].year`. For the festival list, imports only release type **1 (Premiere)** with a note naming one recognized festival and a valid date. The festival allowlist lives in `scripts/import-tmdb.mjs`. Blank, unknown, or multi-festival notes stay in the coverage report. Other release types and countries alone never become festival appearances. Duplicate festival/date records across countries collapse into one.
5. Saves the identity registry, coverage report and review queue, then atomically replaces the site's JSON only after collection succeeds. Network/authentication failures stop publication. A deleted or contradictory accepted provider record is persistently suspended for review; its previous metadata can be retained without reassignment to another movie. A changed source identity does not inherit the old work's metadata.

Every announced film is considered, but accepted bindings skip text search. Bounded candidate retrieval is not an exhaustive search of TMDB's catalogue. Review candidate rejections before changing identity thresholds. A missing history means no usable record was imported; it does not mean the film never attended festivals.

## Persistent identities and review

`scripts/film-identity.mjs` owns the resolver; `collectFilms()` owns caching, registry writes and snapshot publication. A registry film has an app-owned `id`, existing catalogue `keys` (including explicit cross-festival aliases), and current candidate `decisions`. Only one provider ID may be accepted per film, and one accepted TMDB ID may belong to only one canonical film. Parts stay separate. Output continues to use the existing keys and screening URLs.

Decisions record status (`accepted`, `rejected`, `needs_review`), method, decision date, evidence and source fingerprints. Accepted decisions also retain IMDb/director-ID observations, allowing display-name changes while flagging incompatible provider identities. The initial 53 matches are explicitly labelled `strict_rule_v1`, not human-verified. The three original issue bindings use `manual` with primary-source citations. The exported review has now been applied; uncertain versions and discovery gaps remain pending; the unrelated Animales and Réplica candidates have explicit rejections. Programme identities stay separate. Catalogue years remain preserved as fallback evidence; displayed years follow the accepted TMDB metadata.

Start with [the generated review queue](../assets/tmdb/review.md), then inspect the full coverage report and saved candidate response. To accept a candidate, verify the work/part against primary sources and replace that candidate's decision using exported `identityDecision(key, film, movie, 'manual', evidence)` with source URLs and notes. Use `filmCatalogue()` for the exact identity input; the helper records its fingerprint and provider baseline. Update the existing registry film rather than creating a second owner for an accepted TMDB ID. Retain explicit rejections and unresolved alternatives. Do not hand-edit a fingerprint merely to bypass changed source identity.

The [HTML review queue](../review.html), served with `npm run dev`, compares unresolved identities and previously manually accepted films side by side. **Wrong match** rejects one candidate; **None correct** records a film-level decision; **Unsure** leaves the entry in To review. Reviewed lets you revisit clear choices. Local browser choices override defaults. Source/candidate fingerprints invalidate changed observations.

`data/film-review-decisions.json` records the normalized November 5 decisions, source fingerprints and evidence. The original observations and submitted export are preserved under `assets/tmdb/review-observations-20261105.json` and `assets/tmdb/review-submitted-20261105.json`. Two submitted acceptances were held for exact-version evidence, and the submitted Wilma suggestion was verified and accepted. Only previously missing catalogue-year additions from the independent main commit were revalidated; title/director/runtime did not change.

Apply future exports with `npm run review:apply -- path/to/decisions.json`. The application checks the whole batch against current catalogue/candidate observations, provider details and unique ownership before writing the registry. Stale observations, changed provider metadata or conflicting IDs reject the batch. It replays cached details offline. Then run `npm run import:tmdb -- --offline` to regenerate the site and queue. Repeated application is idempotent. Film-level uncertainty and explicit rejections prevent automatic acceptance; choosing a new identity requires a fresh reviewed decision.

For a confirmed upstream deletion/merge or changed provider identity, inspect the suspended binding's `reviewRequired` reason. Resolve the identity and evidence before clearing the suspension or replacing the ID. Transient network failures do not suspend bindings. Aliases for another festival must have their own verified source fingerprints in the accepted decision. The resolver never automatically merges parts or duplicates.

**TMDB is the source of truth for accepted film identities, available film years, posters and release metadata.** `film-metadata.js` overlays the accepted movie's main release year on cards, details and sharing; missing dates retain sourced catalogue years. Screening titles, dates, venues, programmes and runtimes remain official festival facts. Uncertain versions publish no new TMDB metadata. Source datasets are preserved so the original evidence and fallback remain inspectable. [Film-year policy](film-years.md). A premiere-type release never establishes world/international/national premiere scope.

Run `npm run import:tmdb`, then `npm run import:tmdb -- --offline` and `npm test`. The importer fetches sequentially and deduplicates provider requests per run. New searches may require online cache warming before offline replay. Transient network/429/5xx failures receive at most three attempts with capped backoff; supported short `Retry-After` delays are respected, and cooldowns above five seconds stop the run for later retry.

## Files and provenance

- `assets/tmdb/responses/*.json`: successful raw responses, with public request URL and retrieval timestamp. Filenames hash the URL. Authentication headers are never persisted.
- `assets/tmdb/coverage.json`: total/queried/unannounced/matched/unmatched/ambiguous counts, usable festival coverage, candidate identity checks, and unclassified premiere records for every dashboard film entry.
- `review.html`, `review.js`, `review.css`: local review interface. `scripts/tmdb-review-data.mjs` builds `assets/tmdb/review-data.json` from the catalogue, registry, coverage and successful cached observations during import; no API credentials or live API requests are needed by the page.
- `data/tmdb-festival-history.json`: accepted film metadata (TMDB ID, main release year, source and all regional release entries), posters, and normalized appearances keyed by the same festival/film/component identities used by curated histories. Each appearance links to the matched movie's TMDB releases page.

The snapshot also includes `posters`, keyed by those same identities. Only a unique identity match with a valid `poster_path` publishes artwork, even when that film has no festival history. Each poster stores its image path and TMDB movie source link. The browser builds a `w342` image URL following [TMDB's image guide](https://developer.themoviedb.org/docs/image-basics); it requests no images for timeline cards. Screening details preserve the full poster proportions, hide failed images, and omit unavailable artwork without placeholders. Programme posters belong to individual members, not to the combined screening.

The browser loads only the normalized snapshot, after rendering the agenda. Failure to load it leaves the original agenda and curated histories working. Programme members stay separate. Curated records override imported records for the same festival/year, preserving official dates and scoped premiere claims. Imported records never assert world, international, or national premiere status.

The API's premiere release type is broader than a festival record, and its notes are community metadata. These imported dates are sourced to TMDB, not independently verified against each festival. The raw responses allow later review without silently presenting unknown notes as festivals.

## Credentials and replay

Store the **API Read Access Token** outside the repository at `~/.config/vivaelcine/tmdb-read-token`, alone on one line without quotes or a `Bearer` prefix. Directory permission: `700`; file permission: `600`. The environment variable `TMDB_READ_ACCESS_TOKEN` takes precedence. Never put credentials in browser code, JSON, URLs, or source control. Git ignore rules are an additional safeguard; a static server can still serve ignored files placed under its root.

Default runs reuse successful responses and fetch only cache misses. `--offline` requires all needed responses in the cache and never reads the token or contacts TMDB. `--refresh` retrieves every response again. Requests run sequentially and time out after 15 seconds per attempt. Authentication errors stop immediately; retryable network/429/5xx errors stop after the retry budget or a long provider cooldown. Existing normalized data survives an interrupted import; successful responses already saved can be reused on the next run.

## Official references and attribution

- [Application authentication](https://developer.themoviedb.org/docs/authentication-application): API Read Access Token in the Authorization Bearer header.
- [Search movies](https://developer.themoviedb.org/reference/search-movie), [movie details](https://developer.themoviedb.org/reference/movie-details), and [append to response](https://developer.themoviedb.org/docs/append-to-response).
- [Release dates](https://developer.themoviedb.org/reference/movie-release-dates): release types and regional entries. Type 1 is Premiere, not a world-premiere claim.
- [TMDB FAQ](https://developer.themoviedb.org/docs/faq): noncommercial use and attribution requirements.
- [Approved logos](https://www.themoviedb.org/about/logos-attribution). The unmodified local `assets/tmdb-logo.svg` comes from [TMDB's blue short logo](https://www.themoviedb.org/assets/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg).

The footer always shows the approved TMDB logo beside the Letterboxd account link, with the required notice directly below: “This product uses the TMDB API but is not endorsed or certified by TMDB.” Credits remain visible before the local history snapshot loads and if it is unavailable.
