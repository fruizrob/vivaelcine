# Repository integration

Read the current files before using these paths; extend existing boundaries rather
than introducing another catalogue or matching registry.

| Boundary | Existing implementation |
| --- | --- |
| Festival registry and raw edition data | `data.js`, `data/<edition>.js` |
| Source evidence and adapter | `assets/<edition>-sources.json`, `scripts/import-<edition>.*` |
| Edition provenance, caveats and counts | `docs/festivals/<edition>.md` |
| Whole catalogue, provider client/cache, enrichment | `scripts/import-tmdb.mjs` |
| Canonical keys, decision validation and source fingerprints | `scripts/film-identity.mjs`, `data/film-identities.json` |
| Responses, coverage, unresolved candidates | `assets/tmdb/responses/`, `assets/tmdb/coverage.json`, `assets/tmdb/review-data.json` |
| Published provider snapshot | `data/tmdb-festival-history.json` |
| Shared display overlay | `film-metadata.js`; callers in app and `scripts/generate-pages.mjs` |
| Timing, sharing, calendar and stable pages | `core.js`, `sharing.js`, `scripts/generate-pages.mjs`, `generated-pages.json` |

Use `scripts/import-ficvina-2026.mjs` for a small, deterministic manifest-driven
import. Inspect `scripts/import-fidocs-2026.py` for a richer website-derived programme
and activities. These are edition adapters, not a universal crawler. For a new site,
build the smallest source-specific adapter with an offline replay mode. Do not run
an adapter against the network without reading its invocation and output paths.

## Current compatibility work

At the skill's creation, shared TMDB normalization applies **release year only**;
`collectFilms` publishes year/releases, and `film-metadata.js` overlays year. Existing
festival runtimes and other film facts remain festival-sourced. That is a known
implementation limit, not the desired policy for future imports.

When importing under this skill, inspect whether that limit still exists. If so,
extend the shared snapshot/overlay for the film fields needed by the import:
original/provider title, directors, runtime, countries, synopsis and posters when
available. Preserve the local billed title and raw source observations. Model any
explicit session duration/end separately from normalized film runtime before
changing timing consumers. Do not patch raw edition years/runtimes to bypass the
overlay or resolver. Keep browser, generated pages, sharing and calendar consistent;
add relevant regression coverage. Report any unfinished fields as incomplete work.

The existing strict resolver also treats year/runtime discrepancies as review cases.
Use the evidence-backed decision route described in the matching reference to resolve
them unattended; do not loosen title-only acceptance or invent approved user reviews.

## Provider access and replay

The importer reads `TMDB_READ_ACCESS_TOKEN`, falling back to
`~/.config/vivaelcine/tmdb-read-token`. Reuse that access. Never print the credential,
put it into URLs, commit it or expose it in browser code. The cached response format
stores URL, retrieval time and data, without Authorization headers.

From the repository root:

```sh
npm run import:tmdb
npm run import:tmdb -- --offline
```

The default reuses cached responses; it does not ensure freshness. For a live refresh,
use `npm run import:tmdb -- --refresh` (currently refreshes the **whole catalogue**)
or add/use a tested scoped refresh that preserves other editions. Inspect collateral
diffs. `--offline` and `--refresh` are mutually exclusive. Respect bounded retries and
provider cooldowns. Missing credentials cannot be repaired by claiming cached data
is newly fetched.

Before import, snapshot/stage the last-good artifacts in the worktree. Current writes
are atomic per file, not transactional across every output; run/validate staged
outputs before promoting a set. Do not publish a partial snapshot after a failed
acquisition or provider run. Preserve evidence of the failed attempt separately.

## Verification

1. Run the edition adapter from saved observations twice. Compare normalized facts,
   keys and counts; no unexplained semantic drift.
2. Enrich the entire catalogue, then replay offline. Missing cached observations are
   failures, not permission to shrink the catalogue to existing coverage keys.
3. Run `node .agents/skills/import-festival/scripts/check-coverage.mjs`.
   It compares `filmCatalogue()` with coverage, validates accepted fingerprints and
   snapshot ownership, and rejects enrichment without a match or explicit retention.
   Run its own tests after modifying it:
   `node --test .agents/skills/import-festival/scripts/check-coverage.test.mjs`.
4. Regenerate pages with `npm run generate:pages`. To keep an existing calendar
   cut-off for a focused data update, read `generated-pages.json.asOf` and pass that
   value with `-- --as-of YYYY-MM-DD`; never hard-code a previous festival's date.
5. Run `npm test` and relevant importer/matching/metadata regression checks. For a
   UI-affecting import, serve with `npm run dev` and inspect desktop/mobile flows.

Do not freeze old edition totals into generic tests. Test source-derived coverage,
programme component identities, wrong festival year corrected after identity,
director aliases, same-title different works, cross-festival aliases, rejection
retention, changed observations, schedule changes and offline replay where affected.
Preserve historical review fixtures rather than updating old fingerprints to pass.

For refreshes, confirm changed/cancelled screenings and old saved/short URLs before
completion. Schedule changes must not duplicate an event just because its start time
was embedded in an old ID. Follow the current cancellation/redirect model; extend it
with tests if absent. An inaccessible source is not evidence of an empty programme.
