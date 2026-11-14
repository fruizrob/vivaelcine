# Identity before metadata

## Evidence ladder

1. Reuse an accepted registry identity with unchanged source fingerprint and stable
   provider identity. Compare the current source work, not only its slug.
2. Prefer an official work-level TMDB link or independently corroborated IMDb ID
   resolving to one TMDB movie. A bare ID copied from a search result is not evidence.
   Reject conflicting director, subject, part, or version evidence.
3. The existing strict rule accepts a unique exact normalized title/alternate title,
   all known directors, matching known year and runtime within three minutes. A
   truncated search cannot establish uniqueness. These are sufficient conditions,
   not mandatory discovery filters: festival years and runtimes can be wrong.
4. For discrepancies, automatically accept only after corroborating work identity:
   title/verified translation plus director identity and independent identifying
   details (for example synopsis/subject, characters, cast, production company or
   an external work ID). Cite the official festival observation, primary identity
   evidence and cached TMDB details. Explain aliases or incorrect source facts.
   An exact common title plus a close year, fuzzy director spelling, popularity,
   poster similarity, or highest search score alone is insufficient.
5. Otherwise record unresolved status, candidates, evidence and a precise reason.
   No match means no provider poster/history/metadata, except explicitly recorded
   retention of a previously verified snapshot during provider failure.

Use TMDB's first-party API through the repository client and cached responses.
If changing endpoint semantics, consult current official TMDB documentation rather
than assuming API behavior. Never rely on a search snippet instead of movie details.
The current resolver bounds each discovery phase to two pages / forty candidates;
record truncation. Additional targeted queries may be useful; do not retry forever
or label a bounded empty search as proof the film does not exist in TMDB.

## Persistent decisions and refreshes

`data/film-identities.json` owns identity. Use `validateRegistry`, `sourceFingerprint`
and `identityDecision` from `scripts/film-identity.mjs`; do not hand-roll hashes.
Current accepted methods are `strict_rule_v1`, `external_id`, and `manual`.
For agent-researched acceptance, the current schema's `manual` method can represent
curation: explicitly state **agent-verified primary evidence**, never human approval.
If adding an automated method, update schema validation and tests together.

- One canonical record can own keys in several festivals. One TMDB ID has one
  accepted owner. For a verified repeated work, add an alias key to that record;
  merge fingerprints/evidence without overwriting the other aliases or decisions.
- A changed title/director/year/runtime observation invalidates its fingerprint.
  Re-evaluate changed evidence automatically. If the same work remains verified,
  update only that alias's fingerprint with a dated explanation. Never replace all
  hashes just to silence stale-source detection. Time/room/ticket changes alone do
  not invalidate film identity. Preserve the original observation behind old reviews.
- Preserve human rejections and imported review exports byte-for-byte. Pending
  machine decisions can be resolved with new evidence, without inventing a review
  submission. Mark the earlier decision as superseded in audit history; current
  schema allows only one decision per candidate ID, so update rather than append
  a duplicate. Keep prior notes and evidence.
- If provider IMDb/director identity changes or a movie disappears, stop enrichment
  for that identity, flag it and retain explicitly marked last-good data where
  supported. Never silently move the binding to a similarly titled movie.
- Duplicate TMDB pages require work-level evidence; retain an existing verified ID
  rather than choosing the page with a fuller poster or newer year. Document the
  duplicate; do not attempt provider edits as part of an import.

## Film facts versus screening facts

After acceptance, festival metadata disagreement is a correction to audit, not a
reason to prefer the festival's film year. Use the movie's main TMDB release date
for its year. A festival's current edition year is not a film release year.
Use valid TMDB runtime for the film; preserve an explicit festival session window
separately. Null, blank or zero provider fields are missing, not corrections.

Different trilogy parts, a whole trilogy, a short and an expanded feature can share
title/director evidence. Never bind the aggregate to a part. Check part subtitle,
external IDs and version-specific evidence. If the precise version remains unclear,
record that limitation; keep explicit session timing and do not invent a cut match.

A type-1 release date and country do not prove a named festival appearance. Publish
festival history only when TMDB's release note identifies the festival unambiguously;
keep unclassified premiere observations separately.
