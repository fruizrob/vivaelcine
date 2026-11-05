# Festival marks on agenda cards

One festival identity appears in the card footer for the film's premiere or earliest recorded festival appearance. The title remains the primary content. No rank numbers, logo stacks, added legends, award laurels or selection claims appear on cards. The full sourced history stays in the existing details.

## Premiere selection

`festivalMark()` in `festival-history-data.js` selects a dated appearance no later than the selected screening:

1. Prefer an explicitly sourced **world premiere**.
2. Otherwise use the **earliest recorded festival appearance**. International, regional and national premiere labels do not override an earlier appearance.
3. For equal dates, sort by festival name, then programme member title, so input order never changes the result. Partial dates retain their published precision; this tie-break does not establish which screening happened first.

The logo registry contains identities, not a ranking. Look up the logo only after selecting the appearance: a missing logo leaves the festival name visible rather than substituting a later festival. SANFIC and FIDOCS can appear when they are the selected premiere/first appearance. Unknown histories add no identity.

For example, Barbara Forever shows Sundance (January 24, 2026), ahead of its later Berlinale appearance. Animales shows its verified SANFIC world premiere. Hover text and accessible names preserve an explicit premiere scope, or say “Primera aparición registrada” for the fallback. The fallback is an inference from incomplete records, not a verified world-premiere claim.

## Eligibility and layout

Cards and details use the same `filmHistory()` lookup: curated records take precedence over TMDB records for the same festival/year. A mark requires a dated appearance no later than the selected screening date. Future announced appearances stay in details. A mark indicates a sourced festival appearance; it does not assert an award, competition section, or independently verified official selection.

For programmes, the same selection is evaluated across individual members. The hover text and screening button's accessible name identify the particular film, e.g. “Incluye La siesta · Cannes · 2019 · Estreno internacional”. The programme never receives a fabricated combined festival history. Separately identified parts only use their own history keys.

The footer pairs a decorative logo in a fixed 20 × 16 px slot with a visible festival name (Toronto displays as TIFF). Names share the same type size and alignment, so wide wordmarks cannot dominate smaller symbols. Ji.hlava uses the circular symbol from its existing identity, with the wordmark outside the view box. Letterboxd and sharing controls follow on the right. At 150 px or narrower, scores collapse to Letterboxd dots and rated cards keep the festival name alone. At 110 px or narrower, all cards keep the name alone and prioritize it over the rating. At 85 px or narrower, cards omit the festival identity, which remains in the screening's accessible name, tooltip and details. Runtime sits beside the director below the card title and remains in details, the accessible name, and the tooltip. Unknown histories omit the identity. Logos load locally; no logo service, tracking request, new font or dependency is required.

When the optional TMDB JSON arrives, the agenda refreshes while preserving focus on an active card control and its scroll position. Failure to fetch the snapshot leaves curated marks and the schedule working.

## Logo sources

Retrieved November 5, 2026. Marks identify the festivals editorially; no partnership or endorsement is implied. Raster symbols and SVG paths preserve the source artwork; isolated marks and color adjustments are noted below. Edition text is excluded where a source provides a separate identity symbol. View boxes remove unused padding without changing the drawing.

| Local asset | Source |
| --- | --- |
| `assets/festivals/cannes.svg` | [Festival de Cannes](https://www.festival-cannes.com/en/), inline `logo-festival-de-cannes` palm symbol. |
| `assets/festivals/venice.svg` | [La Biennale pinned-tab lion](https://static.labiennale.org/safari-pinned-tab.svg); view box fitted to the symbol. |
| `assets/festivals/berlinale.svg` | [Berlinale](https://www.berlinale.de/en/home.html), inline `berlinale_logo_baer` identity symbol; edition/date lettering omitted. |
| `assets/festivals/tiff.svg` | [TIFF wordmark on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Toronto_International_Film_Festival_logo.svg), credited to TIFF and sourced from its website. |
| `assets/festivals/sundance.png` | [Sundance Film Festival's compact identity](https://d2wsrejhnxatgp.cloudfront.net/assest/prod1/sundance_favicon.png), linked by [the festival site](https://festival.sundance.org/); no edition year. |
| `assets/festivals/locarno.png` | [Locarno's FIAF supporter profile](https://www.fiafnet.org/pages/Community/Supporter-LOCARNO.html), [logo asset](https://www.fiafnet.org/images/tinyUpload/2020/12/LFF-GEN-2linee-small-POS.png). |
| `assets/festivals/san-sebastian.svg` | [San Sebastián mobile identity](https://www.sansebastianfestival.com/admin_img/pag/iconos/ico_ssiff_movil_logo.svg). |
| `assets/festivals/rotterdam.svg` | [Rotterdam identity vector](https://cdn.freebiesupply.com/logos/large/2x/international-film-festival-rotterdam-logo-svg-vector.svg), via [Freebie Supply](https://freebiesupply.com/logos/international-film-festival-rotterdam-logo/). Generic festival identity, not year-specific selection laurels. |
| `assets/festivals/idfa.svg` | [IDFA](https://www.idfa.nl/en/), inline identity with its original red/black values resolved from the site's stylesheet. |
| `assets/festivals/nyff.png` | [NYFF identity on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:New_York_Film_Festival_logo.png), credited to Film Society of Lincoln Center. |
| `assets/festivals/bfi-london.ico` | [BFI identity](https://www.bfi.org.uk/favicon.ico); tooltip explicitly names BFI London. |
| `assets/festivals/karlovy-vary.svg` | [KVIFF identity symbol](https://www.kviff.com/images/logo.svg). The white source is rendered in black for contrast on the agenda. |
| `assets/festivals/busan.svg` | [Busan header identity](https://www.biff.kr/kor/img/cmm/top_logo.svg), BIFF symbol and wordmark paths, excluding edition/date lettering. |
| `assets/festivals/jihlava.svg` | [Ji.hlava](https://www.ji-hlava.com/), inline header identity. |
| `assets/festivals/valdivia.png` | [FICValdivia compact identity](https://ficvaldivia.cl/wp-content/uploads/2024/09/FICValdivia-logo.png), linked by the festival site. |
| `assets/festivals/sanfic.png` | SANFIC wordmark from the cover of the existing [official programme](../assets/programacion-sanfic22.pdf). Edition number and subtitle excluded; original letter shapes preserved, recolored dark on transparency. |
| `assets/festivals/fidocs.png` | FIDOCS symbol from the festival artwork published by its partner [Instituto Francés de Chile](https://www.institutofrances.cl/eventos/festival-internacional-de-documentales-de-santiago-fidocs-2026/), [source artwork](https://www.institutofrances.cl/wp-content/uploads/2026/10/FIDOCS.png). Original circle/triangle symbol isolated, recolored dark on transparency. |
| `assets/festivals/guadalajara.svg` | [FICG header wordmark](https://ficg.mx/wp-content/uploads/2024/02/FICG-LOGO.svg), linked by the [official festival site](https://ficg.mx/). Original paths recolored dark for the light card background. |
| `assets/festivals/punto-de-vista.svg` | [Punto de Vista header identity](https://www.puntodevistafestival.com/images/logo_es_2027_mb_black.svg), linked by the [official festival site](https://www.puntodevistafestival.com/). Original wordmark paths only; edition dates and subtitle excluded. |
