# Generated programme pages

Issue #14's first slice adds Spanish HTML for the two existing editions. No framework, dependencies, database or runtime API. GitHub Pages serves committed directory indexes directly:

- `/festivales/fidocs-2026/` — edition and links to its seven days.
- `/festivales/fidocs-2026/2026-11-14/` — chronological screenings with rooms and runtimes.
- `/funciones/<existing-screening-id>/` — one canonical page per performance, including programme contents or part-specific facts, source and ticket links, other performances and the exact legacy agenda URL.

The homepage/agenda footer links to both editions in initial HTML. Existing `?festival=...&dia=...&funcion=...` URLs retain their behavior. The root HTML is shared across query variants; it does not pretend to supply distinct server-side canonicals or redirects for them. Generated pages use their own absolute canonical and matching social metadata. Screening metadata includes date and time so repeat performances remain distinct. No new broad “all cinema today” coverage claim.

## Reproduce and publish

The same command also generates `/s/<code>/` sharing pages, the persistent code
registry and `404.html`. [Sharing decisions and deployment](short-sharing-links.md).

Node.js 20+; no installation required. From the repository root:

```sh
npm run generate:pages
npm test
python3 -m http.server 4174 --bind 127.0.0.1
```

Generation defaults to the current `America/Santiago` calendar date. For a byte-for-byte replay, use the date recorded in `generated-pages.json`:

```sh
npm run generate:pages -- --as-of 2026-11-12
npm run check:pages
```

`check:pages` regenerates in memory using the manifest's date and fails on missing, altered or obsolete output. `npm test` includes it. It detects data/template/metadata changes that alter the rendered output; it is not a fresh source check or a daily timer. Output consists of `festivales/**/index.html`, `funciones/**/index.html`, `sitemap.xml` and `generated-pages.json`. Never edit those HTML files manually. The generator refuses obsolete files rather than silently deleting pages; review removals and incoming links deliberately.

Code lives in `scripts/generate-pages.mjs` (inputs and writing), `scripts/discovery-pages.mjs` (rendering), `discovery-time.js` (calendar/timezone semantics), and `programme.css` (isolated styles). The renderer uses the agenda's `durationOf`, `endOf`, `roomLocation`, `yearOf`, `screeningUrl` and `applyFilmMetadata` helpers. Accepted TMDB years come from the same checked-in snapshot as the app. Generation clones records and never mutates the registry. No invitation or default-day behavior changes.

Commit generator/style/tests/docs changes separately from generated files. For later schedule imports, keep source-data and corresponding generated output together in their data commit. Run checks before deploying the branch to the existing GitHub Pages root. No production deployment occurs through the generator.

## Dates and trust

`assets/fuentes.json` records SANFIC consultation on **2026-10-28**; `assets/fidocs-2026-sources.json` records FIDOCS retrieval on **2026-11-03**. Pages read these date-only observations directly. They never turn `updated`, a build time, a TMDB metadata refresh or an observation date into a per-screening verification timestamp. Individual `sourceCheckedAt` and `scheduleChangedAt` remain unknown unless explicitly supplied by a sourced record. Generation itself does not recheck any organizer page.

Calendar labels compare scheduled dates to the visible generation date. SANFIC is historical at the November 12 cut-off; FIDOCS dates are future at that cut-off. A saved page can age, so labels always state their reference date, and the footer makes clear they do not establish attendance, current availability or whether an event actually took place. Regenerate when publishing new observations and after the covered dates pass. During active editions, source checking should be a separate daily editorial action and follow organizer change notices; that workflow is not automated here.

Bounds describe observed screenings, not independently verified edition opening/closing announcements. Exact starts use `America/Santiago` offsets resolved for each date with IANA data, including winter/summer changes; ambiguous or nonexistent wall times fail generation. Runtime-derived finishes are visibly estimates excluding introductions and Q&A; unknown part/winner runtimes have unknown finishes. Programme collections keep their component films, their published/summed total and source discrepancies. Separately identified parts use their own titles/runtimes; other parts are not called repeat performances of the same part. Winner slots do not invent a winning film. Free entry appears only when the existing record explicitly says `free: true`; no price, inventory, address, subtitle or accessibility claim is inferred.

## Crawlers and markup

`sitemap.xml` contains the homepage and 164 distinct generated canonical routes. It omits `lastmod`: rebuilding is not evidence of a significant source update. [Google's sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) recommends canonical URLs and accurate significant-change dates, rather than arbitrary generation timestamps.

`robots.txt` permits general search/readers and explicitly permits `OAI-SearchBot`; `GPTBot` is disallowed. [Official OpenAI documentation](https://developers.openai.com/api/docs/bots), rechecked November 12, 2026, distinguishes search access from training access and allows configuring them independently. This file is a policy for cooperating crawlers, not authentication or a guarantee of indexing/citation. Check actual hosting access after deployment.

Event JSON-LD is intentionally deferred. Current venue records lack verified full addresses, required by [Google's event guidance](https://developers.google.com/search/docs/appearance/structured-data/event). [Schema.org `ScreeningEvent`](https://schema.org/ScreeningEvent) supports `workPresented: Movie`, but valid Schema.org data and Google rich-result eligibility are separate. No fields are invented to satisfy a validator. A later sourced address/markup slice should distinguish single movies, collections and pending selections and validate visible/structured consistency.

## Verification and remaining work

`tests/discovery-pages.test.mjs` covers all 148 screening pages, every edition/day link, distinct metadata, legacy query handoffs, source/listing consistency, shared programmes, unknown durations/winners, part runtimes, metadata authority, past/future cut-offs, Santiago DST behavior, sitemap/robots semantics and stale output rejection. Full `npm test` retains the existing app checks.

Search Console/Bing access, live URL inspection, confirmed indexing, crawler logs, structured-data validation, analytics baseline/action measurement, prompt benchmarks, partner outreach, retention/calendar actions and the JSON feed remain follow-ups on the open issue. Local HTML/browser checks do not establish public indexing or actual traffic. No outreach sent, no new analytics configured, and no live ticket availability checked.
