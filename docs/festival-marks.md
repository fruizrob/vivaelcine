# Festival marks on agenda cards

One festival identity mark appears in the card footer when a film has a sourced appearance in the list below. The title remains the primary content. No rank numbers, logo stacks, added legends, award laurels or selection claims appear on cards. The full sourced history stays in the existing details.

## Editorial priority

The order in `festival-history-data.js` is a display preference for this agenda, not an official or universal ranking:

1. Cannes
2. Venice
3. Berlinale
4. Toronto / TIFF
5. Sundance
6. Locarno
7. San Sebastián
8. Rotterdam / IFFR
9. IDFA
10. New York / NYFF
11. BFI London
12. Karlovy Vary
13. Busan
14. Ji.hlava
15. Valdivia

International discovery festivals, documentary festivals and a major Chilean festival are included alongside the larger general festivals. Other sourced appearances remain visible in details. SANFIC/FIDOCS participation alone does not add a card mark for the agenda the visitor is already browsing.

## Eligibility and layout

Cards and details use the same `filmHistory()` lookup: curated records take precedence over TMDB records for the same festival/year. A mark requires a dated appearance no later than the selected screening date. Future announced appearances stay in details. A mark indicates a sourced festival appearance; it does not assert an award, competition section, or independently verified official selection.

For programmes, priority is evaluated across individual members. The hover text and screening button's accessible name identify the particular film, e.g. “Incluye La siesta · Cannes · 2019”. The programme never receives a fabricated combined festival history. Separately identified parts only use their own history keys.

The footer pairs a decorative logo in a fixed 20 × 16 px slot with a visible festival name (Toronto displays as TIFF). Names share the same type size and alignment, so wide wordmarks cannot dominate smaller symbols. Ji.hlava uses the circular symbol from its existing identity, with the wordmark outside the view box. Letterboxd and sharing controls follow on the right. At 150 px or narrower, scores collapse to Letterboxd dots and rated cards keep the festival name alone. At 110 px or narrower, all cards keep the name alone and prioritize it over the rating. At 85 px or narrower, cards omit the festival identity, which remains in the screening's accessible name, tooltip and details. Runtime sits beside the director below the card title and remains in details, the accessible name, and the tooltip. Unknown histories omit the identity. Logos load locally; no logo service, tracking request, new font or dependency is required.

When the optional TMDB JSON arrives, the agenda refreshes while preserving focus on an active card control and its scroll position. Failure to fetch the snapshot leaves curated marks and the schedule working.

## Logo sources

Retrieved November 5, 2026. Marks identify the festivals editorially; no partnership or endorsement is implied. Raster files are original downloads. SVG symbols preserve source paths; edition text is excluded where a source provides a separate identity symbol. View boxes remove unused padding without changing the drawing.

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
