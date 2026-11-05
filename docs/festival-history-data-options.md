# Festival-history data options

Checked November 4, 2026. Scope: alternatives to Letterboxd page scraping. No subscriptions, credentials, vendor outreach, or paid trials started. Includes the main investigation's TMDB and Letterboxd API findings.

## Best next experiments

1. **First choice: TMDB pilot.** Sample approximately 20 films across international features, Chilean documentaries, shorts and programmes, using an existing API key if available. Check whether premiere release notes preserve usable festival names. Measure coverage before building an importer; keep explicit premiere scope sourced to official festivals.
2. **Free supplementary enrichment:** batch-match the agenda to Wikidata, retaining exact film identities, date precision, qualifiers and references. Measure actual festival-appearance coverage. Open access is proven; broad coverage is not.
3. **Paid enrichment:** ask IMDb licensing for a representative API/bulk sample containing festival-name annotations, release types, premiere scope, and display/redistribution rights. Test the current Chilean documentary/shorts roster before buying. General release dates alone do not solve this issue.
4. **Long tail:** obtain programme exports or permitted feeds directly from festivals/distributors. A partner's structured export plus source URLs can feed the existing static catalogue. This is an architectural recommendation, not an already available universal feed.

## TMDB: strongest next step, coverage still untested

Letterboxd [identifies TMDB as its upstream film metadata source, including release dates](https://letterboxd.com/about/film-data/), and [recommends direct TMDB access for non-Letterboxd-specific metadata](https://letterboxd.com/api-beta/access/). This makes TMDB the most direct alternative to extracting the same information from rendered Letterboxd pages.

TMDB's official [movie release-date endpoint](https://developer.themoviedb.org/reference/movie-release-dates) is `GET /3/movie/{movie_id}/release_dates`; release type `1` means premiere. The [official OpenAPI schema](https://developer.themoviedb.org/openapi/tmdb-api.json) includes a `note` field on release entries. Festival-name recovery from those notes is a promising hypothesis, not a tested coverage result. Generic premiere type does not establish world-premiere scope.

The [TMDB FAQ](https://developer.themoviedb.org/docs/faq) explains account-based API-key requests, free non-commercial use with attribution, required approved logo/About-or-Credits acknowledgement, and separate commercial licensing. No authenticated response or pilot was tested in this research. Preserve API keys outside the browser bundle if used for offline acquisition; publish only the curated static data and provenance.

## Letterboxd official access: request-only

The [official access page](https://letterboxd.com/api-beta/access/) offers no guaranteed approval and currently excludes private/personal projects, data-analysis/visualization/recommendation projects and LLM/GPT-related use. It directs general film-data users to TMDB. This is not a readily available dependency for this project. Letterboxd's [terms, sections 6.6 and 6.11](https://letterboxd.com/legal/terms-of-use/) restrict access-control circumvention and unauthorized automated scraping; proxy rotation or unofficial wrappers do not create an authorized data route.

## IMDb: broad catalogue, festival export unproven

IMDb's [official API](https://data.imdb.com/documentation/api-documentation/) is GraphQL through AWS Data Exchange; [official documentation](https://data.imdb.com/documentation) also supports licensed bulk data. IMDb's [release-date contribution rules](https://help.imdb.com/article/contribution/titles/release-dates/GVUUDEPJNAW6G35P) explicitly accommodate festivals and festival-name annotations. Thus IMDb holds potentially useful records.

However, the public [licensed bulk title dictionary](https://data.imdb.com/documentation/bulk-data-documentation/data-dictionary/titles) describes `releaseDates` as date plus country, with year/month/day precision; its shown schema does not establish a festival-name or premiere-scope field. Website content must not be assumed to exist in the licensed export. API sample availability, festival annotation fields, current-film/short coverage, costs and public-display rights remain unverified.

The [free non-commercial TSV schemas](https://data.imdb.com/non-commercial-datasets/) contain identities, titles, release years, credits and ratings, but no festival release-date history. Their `title.akas` value `festival` describes an alternative title, not an appearance. IMDb's [usage guidance](https://help.imdb.com/article/imdb/general-information/can-i-use-imdb-data-in-my-software/G5JTRESSHJBBHTGX) directs non-commercial users to those datasets and disallows website extraction under that permission. Do not treat an unofficial “IMDb API” wrapper as IMDb's licensed service.

## Wikidata: usable open transport, uneven evidence

[Official access documentation](https://www.wikidata.org/wiki/Wikidata:Data_access) provides APIs, entity JSON, SPARQL and dumps; structured data is CC0. This is a practical offline-enrichment route for a static site.

The [Movies project's schema guidance](https://www.wikidata.org/wiki/Wikidata:WikiProject_Movies/Properties) recommends publication date `P577` qualified by place of publication `P291`, which may identify a festival, country, or region. Read complete statements rather than flattening `wdt:P577`: qualifiers and references carry the useful distinction. Premiere handling is not uniform: the [project's own discussion](https://www.wikidata.org/wiki/Wikidata_talk:WikiProject_Movies/Archive_3#date_of_first_performance_(P1191)_for_films) records disagreement over `P1191` versus qualified `P577`. Neither an earliest date nor `P291` alone proves world-premiere scope.

One concrete sample, [A Useful Ghost / Q134285377](https://www.wikidata.org/wiki/Q134285377), contains a May 17, 2025 date qualified by the 2025 Cannes edition, but that statement has zero references. It supplies one festival lead where the previously checked Letterboxd page lists many. This demonstrates usefulness and incompleteness in one case; it is not a population coverage estimate. No full-agenda match-rate or reference-quality audit completed. Missing recent Chilean titles cannot be inferred merely from search-engine absence.

Suggested pilot output: matched films / all films; films with a festival-qualified date; total appearances; appearances with retrievable primary references; ambiguous editions; version conflicts. Measure standalone films and programme components separately. A QID or IMDb ID is an identity aid, not proof that all cuts/parts are equivalent.

## Industry databases: partnership inquiries, not ready feeds

| Source | What is actually established | Decision |
| --- | --- | --- |
| Cinando | [Official terms](https://cinando.com/res/PDF/CGU_en.pdf) describe an account-based professional database. A historic festival submission integration appears in a [2017 partner-hosted Cinando eForm document](https://www.europa-international.org/wp-content/uploads/2017/04/Cinando-Festival-eForm.pdf). That document concerns importing a sales agent's film into a festival submission form, not comprehensive public screening histories. | No current public history API, bulk licence, export schema or coverage guarantee verified. Ask the operator only if a commercial partnership is justified. Do not infer a data licence from professional search access. |
| Festhome | [Official terms, Part II.21](https://festivals.festhome.com/en/terms-of-use) restrict the API to active festivals; third-party connections require written Festhome permission and onward sharing requires filmmaker permission. | Useful when cooperating with a specific festival. Not a self-serve, cross-festival open history feed. Submission records also need a verified selection/screening status before becoming appearances. |
| Cineuropa | Its [official feature-film database description](https://cineuropa.org/en/filmshome/en/index/) targets European-produced/co-produced features since 2000. A [real film profile](https://cineuropa.org/film/490187/) includes Aquí se escucha el silencio's CPH:DOX 2026 selection. | Useful research leads for European co-productions. No public API, licensed bulk export, complete festival trail, or shorts coverage verified. Ask for a feed/licence; do not build around a presumed endpoint. |

No audited provider above currently establishes a complete, affordable, redistributable history feed for this agenda. The feasible recommendation is a measured multi-source enrichment pipeline plus primary-source evidence, while retaining explicit unknowns. That conclusion is limited to this bounded documentation review; vendor capabilities may exceed their public documentation.
