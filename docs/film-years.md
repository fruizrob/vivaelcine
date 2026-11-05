# Film years

Checked November 4, 2026. `year` describes the film's published year, never the festival year or a premiere classification. Cards and details use the same `yearOf` rule. Only a single integer year is displayed; unknown values are omitted without placeholders. Card headers show only the start time on the left and the release year on the right; narrow headers can wrap the year to keep both readable.

FIDOCS years already come from the official film details recorded in [the import manifest](../assets/fidocs-2026-sources.json). Multi-film programmes retain each component's year in their details; aggregate year ranges are preserved in the source data but do not become a film year on cards or in the main metadata. The separately scheduled parts of [La Batalla de Chile](https://fidocs.cl/programacion/la-batalla-de-chile-parte-i-ii-y-iii/) use 1975, 1977 and 1979 respectively, matching the official title/part order and published year list.

SANFIC's official film pages provide identities and runtimes but generally omit years. Added 35 film years and two short-film years by reading the year and director from the already verified Letterboxd film pages. [Evidence records](../assets/film-year-sources.json) preserve each page title, source URL and year; each curated record also has `yearSource`. Examples: [A Happy Family (2026)](https://letterboxd.com/film/a-happy-family-2026/), [El Club (2015)](https://letterboxd.com/film/the-club-2015/). Years were read from page content, never URL slugs.

Los Relatos and Rumor have verified Letterboxd identities but no published year on their retrieved pages. Other SANFIC films and shorts without a verified year source remain blank. Unannounced FIDOCS winner selections also remain blank. No inference from the schedule date, festival edition, title or other films in a programme.

For additions or corrections, verify the individual film's identity and year against its official festival/producer/distributor page or verified Letterboxd record, then set `year` and `yearSource` together and update the evidence records. FIDOCS regeneration preserves curated `year`/`yearSource` pairs on films, components and events alongside Letterboxd identities. Unsourced imported years still refresh from the official snapshots.

`npm test` covers recent and older films, absent/invalid years, programmes, separately scheduled parts, source coverage and curated metadata preservation. Browser checks cover the same years in cards and details plus layout at desktop/mobile widths and narrow zoom settings.
