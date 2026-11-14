# FICVIÑA TMDB audit — 2026-11-14

The original festival addition omitted all 85 FICVIÑA film keys from the TMDB
import. The public snapshot therefore supplied no FICVIÑA posters, years or
festival histories. The snapshot replay test filtered its catalogue to the old
coverage report, hiding the omission. Coverage now must equal the complete
catalogue, and offline replay exercises every registered film.

## Result

- 85 works checked, including individual programme members.
- 57 supported identities: 14 strict automatic matches and 43 documented manual
  bindings, including six aliases of existing SANFIC/FIDOCS identities.
- 55 posters available; 28 works remain unpublished in provider metadata.
- Existing SANFIC/FIDOCS posters, metadata and histories are unchanged.

The [per-film audit](../assets/tmdb/ficvina-2026-audit.json) lists every result,
selected ID, primary source, discrepancy and remaining limitation. Accepted
bindings and source fingerprints live in `data/film-identities.json`; first-party
API responses are preserved under `assets/tmdb/responses/`. Automatic matches
remain identified as automated, rather than human-verified.

## Identity decisions

Title alone never establishes identity. Manual bindings compare festival credits
with provider directors and, where available, descriptions, year and runtime.
Missing individual runtimes block the strict rule for shorts; manual evidence
does not relax that rule globally. No year or runtime is invented for missing
provider values.

Ciudad jardín, Norte claro, sur oscuro, La ilusión de un verano sin fin,
Plata o mierda, Población flotante and Relicto share existing canonical records.
Reapplying an older review must retain every festival alias's fingerprint and
evidence; the review importer now preserves these instead of replacing the
shared decision with a single-key decision.

Ogú y Mampato's abbreviated title is linked through the
[Cineteca's full-title record](https://www.cclm.cl/cineteca-nacional/ogu-y-mampato-en-rapa-nui/).
La fabulosa máquina del tiempo was discovered using its Portuguese title;
the [official FICCI catalogue](https://ficcifestival.com/sites/default/files/2026-05/Catalogo_Oficial_FICCI_65.pdf)
identifies Eliza Capai and the 70-minute work. The original programme data is
preserved; these discoveries are explicit bindings rather than source rewrites.

O jardim mágico uses 1475725, supported by the festival's Naira Carneiro credit
and matching description. Candidate 1721375 is a possible duplicate, without an
independently established canonical claim. Motel paraíso uses 1631783, supported
by Castilla's credits and the grandfather/motel description; sparse candidate
1292576 is not accepted merely because its title matches.

After identity acceptance, available TMDB years follow the existing metadata
policy. Festival screening starts and runtimes remain authoritative. Examples:
Karmele displays provider year 2025 while preserving the published 114 minutes;
Plata o mierda retains FICVIÑA's 98 minutes despite the provider's 88. This
establishes the work, not a verified screening master or cut.

## Pending cases

Siempre soy tu animal materno has a candidate with matching title/director but
100 minutes against the programme's 180; publication remains held for version
or source-correction evidence. A menina que queria ser pedra needs a documented
link between the source's Jackson Teixeira and candidate Jackson Abacatu for
this work. Ross, Ven and Captura exhausted the bounded search without a
supported candidate. Other missing results and wrong-director namesakes remain
pending; this does not prove their absence from TMDB.

The review queue now uses registered festival names instead of labelling every
non-SANFIC row as FIDOCS. Browser cache versions are updated for the new snapshot.

## Reproduction

```sh
npm run import:tmdb -- --offline
npm run generate:pages -- --as-of 2026-11-12
npm test
```

The November 12 page-generation cut-off is retained. The full offline snapshot
replay and review-batch replay protect completeness and shared identity evidence.
