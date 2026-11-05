# TMDB festival history

The importer checks the entire dashboard catalogue for TMDB festival histories. It does not assume that a matched movie has complete festival records.

## Full catalogue: November 5, 2026

All 134 dashboard film/part entries are accounted for: 131 announced entries were queried, while three unannounced winner slots are reported separately. Screening repeats are not counted again; shorts and separately listed parts retain their own identities.

| Result | Entries | Percentage of 131 announced entries |
| --- | ---: | ---: |
| Queried | 131 | 100% |
| TMDB identity matched | 53 | 40.5% |
| Usable TMDB festival history | 35 | 26.7% |
| TMDB plus curated history | 43 | 32.8% |

SANFIC: 69 entries queried; 27 matched; 18 with usable TMDB histories. FIDOCS: 62 announced entries queried; 26 matched; 17 with usable TMDB histories. The other three FIDOCS entries are unannounced winner slots.

The generated TMDB snapshot contains 81 appearances. After curated edition records take precedence, the combined UI has 92 appearances across 43 entries. Unmatched entries remain in the coverage report with candidate rejection reasons; a match with no accepted festival note remains distinguishable from an unmatched film. These figures measure what the current importer can publish, not TMDB's exhaustive coverage or proof that an uncovered film never attended a festival.

## Initial sample: November 5, 2026

The initial proof of concept sampled 20 films: 11 matched and 24 recognized festival appearances imported. Nine films failed identity checks or were absent from the bounded search results. There were no ambiguous passing matches. That sample is preserved in `data/tmdb-pilot.json` for reference; it does not control the importer anymore. The current snapshot and coverage report cover the entire dashboard.

For that initial sample, the import added 21 appearances and histories for seven previously uncovered films after curated records took precedence. Combined coverage at that point was 19 films and 35 appearances, including curated films outside the sample. Those figures were not full-catalogue coverage.

The gaps are not all missing TMDB data: *A Useful Ghost* has its director credited in Thai; *La siesta*, *Latir*, and *La muerte te vio volver* have different director name forms. *Bloques erráticos* has a different runtime. *Silent Friend* has a different main release year and director name order. These remain review candidates rather than loosening identity checks automatically. Unknown festival notes are also retained in the report rather than discarded from the evidence.

## Data flow

`filmCatalogue()` in `scripts/import-tmdb.mjs` derives the import scope from every screening in every registered festival. Repeated screenings share one identity; programme blocks expand into individual films, reusing component film IDs where available. Separately titled screenings use their own event IDs, titles, years and runtimes. Parts with unpublished runtimes never inherit the full work's runtime. Programme labels such as `Foco Alan Berliner #1:` are stripped from search titles.

Titles, directors, verified aliases, known years, and runtimes come from the schedules. No year is inferred from the festival edition. Winner slots without an announced film are retained in the report with status `unannounced`, without querying TMDB. Coverage reports distinguish all dashboard entries (`total`) from actual film entries searched (`queried`) and unannounced slots; percentages of film coverage use `queried` as their denominator.

Run `npm run import:tmdb` with Node.js 20+. The script:

1. Searches each distinct title/verified alias, filtering by the known film year when available and considering the first five results per query.
2. Fetches each candidate's details with credits, alternative titles, and release dates.
3. Requires an exact normalized title or alternative title, every named director, the verified year when known, and runtime within three minutes. Accents and punctuation are normalized. Multiple passing candidates remain ambiguous and unpublished. Missing directors/runtimes and larger version differences require review.
4. Imports only release type **1 (Premiere)** with a note naming one recognized festival and a valid date. The festival allowlist lives in `scripts/import-tmdb.mjs`. Blank, unknown, or multi-festival notes stay in the coverage report. Other release types and countries alone never become festival appearances. Duplicate festival/date records across countries collapse into one.
5. Writes the coverage report, then atomically replaces the site's JSON only after all requests succeed.

Every film in the dashboard is searched, but only the first five results per query are inspected. This is not an exhaustive search of TMDB's catalogue. Review candidate rejections before changing identity thresholds. A missing history means no usable record was imported; it does not mean the film never attended festivals.

## Files and provenance

- `assets/tmdb/responses/*.json`: successful raw responses, with public request URL and retrieval timestamp. Filenames hash the URL. Authentication headers are never persisted.
- `assets/tmdb/coverage.json`: total/queried/unannounced/matched/unmatched/ambiguous counts, usable festival coverage, candidate identity checks, and unclassified premiere records for every dashboard film entry.
- `data/tmdb-festival-history.json`: normalized appearances keyed by the same festival/film/component identities used by curated histories. Each appearance links to the matched movie's TMDB releases page.

The browser loads only the normalized snapshot, after rendering the agenda. Failure to load it leaves the original agenda and curated histories working. Programme members stay separate. Curated records override imported records for the same festival/year, preserving official dates and scoped premiere claims. Imported records never assert world, international, or national premiere status.

The API's premiere release type is broader than a festival record, and its notes are community metadata. These imported dates are sourced to TMDB, not independently verified against each festival. The raw responses allow later review without silently presenting unknown notes as festivals.

## Credentials and replay

Store the **API Read Access Token** outside the repository at `~/.config/vivaelcine/tmdb-read-token`, alone on one line without quotes or a `Bearer` prefix. Directory permission: `700`; file permission: `600`. The environment variable `TMDB_READ_ACCESS_TOKEN` takes precedence. Never put credentials in browser code, JSON, URLs, or source control. Git ignore rules are an additional safeguard; a static server can still serve ignored files placed under its root.

Default runs reuse successful responses and fetch only cache misses. `--offline` requires all needed responses in the cache and never reads the token or contacts TMDB. `--refresh` retrieves every response again. Requests run sequentially, time out after 15 seconds, and stop on HTTP errors, including 401/403 and 429. Existing normalized data survives an interrupted import; successful responses already saved can be reused on the next run.

## Official references and attribution

- [Application authentication](https://developer.themoviedb.org/docs/authentication-application): API Read Access Token in the Authorization Bearer header.
- [Search movies](https://developer.themoviedb.org/reference/search-movie), [movie details](https://developer.themoviedb.org/reference/movie-details), and [append to response](https://developer.themoviedb.org/docs/append-to-response).
- [Release dates](https://developer.themoviedb.org/reference/movie-release-dates): release types and regional entries. Type 1 is Premiere, not a world-premiere claim.
- [TMDB FAQ](https://developer.themoviedb.org/docs/faq): noncommercial use and attribution requirements.
- [Approved logos](https://www.themoviedb.org/about/logos-attribution). The unmodified local `assets/tmdb-logo.svg` comes from [TMDB's blue short logo](https://www.themoviedb.org/assets/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg).

The footer always shows the approved TMDB logo beside the Letterboxd account link, with the required notice directly below: “This product uses the TMDB API but is not endorsed or certified by TMDB.” Credits remain visible before the local history snapshot loads and if it is unavailable.
