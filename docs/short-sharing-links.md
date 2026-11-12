# Short screening links

Issue #31. Decision and local verification: November 12, 2026.

## Decision

Use `/s/<8-character-code>/` directory-index HTML on the existing GitHub Pages
deployment. Reuse `npm run generate:pages`, the Spanish page frame and the
current source catalogue. No runtime service, new package or external shortener.

| Option | Preview and operation | Decision |
| --- | --- | --- |
| Generated first-party page | Initial HTML metadata; existing hosting; regenerate with schedules | Selected |
| Application route | Current database facts; needs backend and deployment from #15–#24 | Preserve route/registry during migration |
| Redirect-only alias or shortener | Adds a hop and crawler-dependent preview behavior; another service adds a dependency | Unnecessary for the current catalogue |

Example, Hanabi at FIDOCS:

```text
Before: https://vivaelcine.cl/?festival=fidocs-2026&dia=2026-11-13&funcion=fidocs-2026-hanabi-13-0960
After:  https://vivaelcine.cl/s/e0292cac/
```

The landing page identifies the exact screening and offers **Ver en la agenda**
as its primary action, opening the existing query URL and selected detail dialog.
**Detalles y fuentes** opens the full generated performance page. There is no
automatic redirect, user-agent detection or dependency on sender state/login.
Static text remains useful with JavaScript disabled.

## Identity and schedule changes

`data/short-links.js` is the committed public registry. Each code belongs to one
festival/performance pair. New codes use the first eight hexadecimal characters
of SHA-256 of `festivalId/eventId`; generation rejects collisions and duplicate
identities. The registry controls existing codes. It contains public IDs and a
last-known title, never personal data.

Dates, times, rooms and titles are read afresh at generation and keep existing
codes. Repeat performances have separate event IDs/codes. Keep existing event
IDs during rescheduling. If an importer must rename an event ID, explicitly
rebind that registry entry to the verified replacement before generation;
preserve its code. Do not infer equivalence from titles: one film can have
several performances. Import the registry unchanged during backend migration
and serve these paths permanently.

Never delete or recycle published entries. A missing event retains its short
page and title, says it is no longer in the published schedule, and links to the
festival programme (or the agenda if the festival is absent). It never selects
another performance. Past screenings keep their links and the existing
generation-date-qualified archive label. Unknown paths receive GitHub Pages'
custom `404.html` with a recovery action. The local Python server uses its own
404 response; the hosted custom-404 handoff remains a deployment check.
Existing query URLs and `/funciones/…/` pages remain available.

## Preview

Each short page supplies its title, festival, local date/time, venue and room in
initial Open Graph/Twitter metadata. Its canonical and `og:url` use the short
URL. Programmes retain their own title and component films; parts use their
actual title; unpublished durations and winner notes stay explicit.

The image is a local branded 1200 × 630 PNG with an absolute HTTPS URL and alt
text. It is deliberately consistent across screenings; text metadata identifies
the performance. This covers missing artwork, programmes and withdrawn events
without depending on TMDB's CDN or selecting one programme member's poster.
Poster artwork was considered but adds availability and version-selection
dependencies unnecessary for this slice. The file is about 32 KB. Its editable
source is `assets/share-preview.html`; rasterize it at 1200 × 630 with a browser
when changing the image, then inspect the PNG.

[Open Graph](https://ogp.me/) defines the head metadata and image properties.
[GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
serves the checked-in static HTML. Short pages are omitted from the discovery
sitemap; existing full performance pages remain its discovery entries. This
does not guarantee preview display, indexing or engagement.

## Generate and publish

```sh
npm run generate:pages
npm test
python3 -m http.server 4174 --bind 127.0.0.1
```

Generation updates the registry, short pages, 404 page and manifest alongside
programme output. `npm run check:pages` verifies them at the manifest's recorded
date, including missing/altered/obsolete short pages. Commit code separately
from generated registry/pages/manifest. Deploy all files together to the domain
root; no rewrites needed. A screening without a generated code falls back to
its exact legacy URL until publication, never an unserved short path.

Copy link, native URL sharing, invitation text and Story copy share
`sharedScreeningUrl`. Agenda history keeps `agendaScreeningUrl` (also exported
as `screeningUrl` by `story.js`). Existing clipboard/manual-copy, cancellation,
download and image-sharing fallbacks remain.

Schedule changes require regeneration and deployment. Messaging services can
cache HTML and images independently; no refresh interval or cache purge is
promised. For brand-image changes, publish a versioned filename and regenerate.
A crawler refresh does not change an already delivered message. Keep stable
screening codes; verify fresh messages separately from older cached previews.

## Validation

Automated coverage: every performance's distinct code, shorter URL, legacy
handoff, initial metadata and PNG dimensions; rescheduling/reordering,
collision rejection, programmes, archive/unavailable/unknown states and drift.

Local Chromium checks use desktop (1280 × 900) and mobile viewport (390 × 844),
fresh contexts, an archived screening, Hanabi and a shorts programme. Landing →
exact detail, copy, intercepted native share and Story copy passed, with no
horizontal overflow or JavaScript errors. Native sharing was intercepted to
avoid sending messages; this does not validate a real OS share sheet or
messaging preview. Raw HTTP checks passed for all 148 pages and the PNG without
executing JavaScript. Full `npm test` covers the feature and generated checks.

Still required after deployment: paste into WhatsApp and a second messaging
app, inspect actual title/description/image, and open on a physical phone and
desktop. Repeat for a programme, missing artwork, archived screening, corrected
schedule and invalid path. Record app/device, date, deployed revision and
results in #31. No actual messaging-app preview or physical-device handoff has
been verified, and no engagement improvement has been measured.
