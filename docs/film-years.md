# Film years

Updated November 5, 2026. `year` describes the film's published year, never the festival year or a premiere classification. Cards and details use the same `yearOf` rule. Only a single integer year is displayed; unknown values are omitted without placeholders. Details put the year beside the title. Narrow cards shorten the time range to its start to make room for the year. Short-film markers keep the year beside their external title.

FIDOCS years already come from the official film details recorded in [the import manifest](../assets/fidocs-2026-sources.json). Multi-film programmes retain each component's year in their details; aggregate year ranges are preserved in the source data but do not become a film year on cards or in the main metadata. The separately scheduled parts of [La Batalla de Chile](https://fidocs.cl/programacion/la-batalla-de-chile-parte-i-ii-y-iii/) use 1975, 1977 and 1979 respectively, matching the official title/part order and published year list.

SANFIC's official film pages provide identities and runtimes but generally omit years. Added 35 film years and two short-film years by reading the year and director from the already verified Letterboxd film pages. [Evidence records](../assets/film-year-sources.json) preserve each page title, source URL and year; each curated record also has `yearSource`. Examples: [A Happy Family (2026)](https://letterboxd.com/film/a-happy-family-2026/), [El Club (2015)](https://letterboxd.com/film/the-club-2015/). Years were read from page content, never URL slugs.

TMDB added 15 previously missing years on November 5: seven films and eight shorts. [TMDB evidence](../assets/tmdb-film-years.json) records the reviewed movie IDs, titles, directors, runtime, release date, retrieval time and explicit director-name aliases. Years come from `release_date` for the identified film. The 94-minute El Tigre del Este record was selected over the same director's 91-minute duplicate to match the official programme. Festival runtimes and screening dates remain authoritative; importing a year never changes them.

All 32 missing individual SANFIC years were investigated through movie searches and, where useful, director filmographies. Seventeen remain unresolved: six films and eleven shorts. Some TMDB records have no release date (including Los Relatos, Rumor, Recuerdo tu nombre and Lejanía); others lack enough identity evidence or are absent from the searched results. The evidence file records these gaps. Humedal remains blank because its likely TMDB match has no runtime or synopsis to resolve the identity confidently. Unannounced FIDOCS winner selections also remain blank. No inference from the schedule date, festival edition, title or other films in a programme.

For additions or corrections, verify the individual film's identity and year against its official festival/producer/distributor page or verified Letterboxd record, then set `year` and `yearSource` together and update the evidence records. FIDOCS regeneration preserves curated `year`/`yearSource` pairs on films, components and events alongside Letterboxd identities. Unsourced imported years still refresh from the official snapshots.

## Refresh TMDB years

Use Node.js 20+ and the existing private token file, `~/.config/vivaelcine/tmdb-read-token` (directory `700`, file `600`), or `TMDB_READ_ACCESS_TOKEN`. Credentials stay outside the repository and browser. Authentication uses the [Bearer header](https://developer.themoviedb.org/docs/authentication-application), never a URL parameter.

```sh
npm run import:years
npm run import:years -- --offline
```

The normal command refreshes the reviewed IDs with [movie details and credits](https://developer.themoviedb.org/reference/movie-details). Offline mode replays the checked-in evidence without credentials or network access. Both validate every record before writing: exact normalized film title or alternative title, every director (with only explicitly reviewed aliases), runtime within three minutes, and a valid full release date. Requests stop on HTTP failures, including authentication errors and rate limits. Failed retrieval or validation leaves the existing files intact. Existing curated sources cannot be silently replaced with a conflicting year.

To add a match, review its title, director and version against the official film source, add the reviewed ID and evidence to `assets/tmdb-film-years.json`, remove that identity from `unresolved`, then rerun the import. Search ranking alone is never identity evidence. The script updates only film years and provenance in the existing datasets; there is no browser fetch, backend, dependency or build step.

Credits contains the unmodified [approved TMDB logo](https://www.themoviedb.org/about/logos-attribution) and required notice, following [TMDB's attribution requirements](https://developer.themoviedb.org/docs/faq). The local logo is the [official blue short SVG](https://www.themoviedb.org/assets/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg).

`npm test` covers recent and older films, absent/invalid years, programmes, separately scheduled parts, source coverage, rejected TMDB identities, import replay and curated metadata preservation. Browser checks cover the same years in cards and details plus layout at desktop/mobile widths and narrow zoom settings.
