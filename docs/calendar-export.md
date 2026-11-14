# Calendar export

Screening details offer **Añadir a Google Calendar** and **Añadir a Apple Calendar** below the date and venue. Both stay visible; phones stack the buttons. Google uses the existing prefilled event URL. Apple opens a same-origin `.ics` file in a new tab so the browser can hand it to a calendar application while preserving the agenda.

## Static delivery

`sharing.js` owns both calendar URL helpers. `scripts/calendar-files.mjs` produces one event per file at `/calendarios/<festival-id>/<event-id>.ics`. `npm run generate:pages` generates these with the programme, and `npm test` checks that every published screening's file exists and matches its data. The generated manifest and obsolete-file guard also cover `calendarios/`.

Use an HTTP(S) file with `Content-Type: text/calendar`, without a forced `download` attribute, data URL, blob URL, account connection, or backend. Python's preview server serves this MIME type; confirm it on the deployed host as part of device verification.

The [iCalendar standard (RFC 5545)](https://www.rfc-editor.org/rfc/rfc5545) defines the file format. Each file has a stable festival/screening UID, a source snapshot date in `DTSTAMP`, CRLF line endings, escaped text, and UTF-8 lines folded at 75 octets. UTC start/end instants reuse `discovery-time.js` and its IANA timezone conversion. Summer/winter offsets and after-midnight dates are resolved per screening; ambiguous or nonexistent wall times fail generation. An unpublished runtime omits `DTEND` and states **Duración por confirmar** rather than supplying an invented duration.

This is an individual import, not a calendar subscription, invitation, attendance confirmation, or ticket purchase. No organizer, attendee, or alerts are added. Programme corrections require regeneration/deployment; already imported events do not synchronize automatically. Stable UIDs preserve identity, but duplicate handling belongs to the importing application.

Regenerate after schedule changes and commit generated output separately from code. To avoid changing existing page archive labels during a calendar-only change, retain the manifest date:

```sh
npm run generate:pages -- --as-of 2026-11-12
npm test
```

## Verification

Automated checks cover every published screening, distinct event identity, actual titles/rooms/links, known and unknown runtimes, Chile summer/winter, overnight and year rollover, escaping and UTF-8 folding. Browser checks should cover desktop and phone widths, keyboard focus/activation, HTTP MIME type, opening the correct file, and switching screenings.

Physical iPhone import remains a separate check. [Apple documents importing `.ics` files from Mail and calendar subscriptions](https://support.apple.com/en-euro/guide/iphone/ipha0d932e96/ios); that does not establish every Safari or embedded-browser handoff. Before merging Apple support:

1. Open the HTTPS preview in Safari on an iPhone and tap **Añadir a Apple Calendar**.
2. Confirm a single-event preview with an Add control, then choose a calendar and import.
3. Check the title, Chile-local date/start/end, room, and agenda link against the selected screening. Repeat for another screening, an unknown runtime, and a shorts programme.
4. Check cancellation returns to the agenda, then repeat from the in-app browser if relevant.
5. Record the iPhone/iOS/browser, served MIME type, deployed revision, and result in the PR. If only a file preview/download appears without Add, the handoff is not verified.

Desktop browser emulation validates layout and delivery, not iOS Calendar integration. No physical iPhone import has been verified for this change.
