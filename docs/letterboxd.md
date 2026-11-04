# Letterboxd

Verified November 4, 2026. Film identity uses title/alternative title and director; release year and runtime distinguish versions where available. Coverage: 37 SANFIC and 31 FIDOCS film records, 17 short-film component occurrences, and three separately identified Battle of Chile screenings.

## Integration

An optional `letterboxd` slug lives on the existing film, component, or screening record. Screening-level identifiers override the film identifier for separately catalogued parts. No extra catalogue, dependencies, API key, backend, runtime scraper, or scheduled refresh.

Screening boxes use the corner badge: Letterboxd's dots and a one-decimal score, linking directly to the film. The link is a sibling of the detail button, so rating clicks never open the dialog. Narrow boxes omit runtime from the footer to prevent overlap; full timing remains in details. Shorts under 45 minutes and unknown-duration markers omit badges to preserve their labels.

`data/letterboxd-ratings.js` is a dated snapshot, separate from festival metadata. All 86 mapped slugs were checked on November 4, 2026 against their official `https://embed.letterboxd.com/film/SLUG/embed-histogram/?theme=light&notitle=true&nobackground=true` widget. It contains the 51 published weighted averages, including component films; the other 35 have no published average. No scores are inferred from histogram counts. Films without a score have no badge; their details retain the film link and live widget. Hover text and the accessible badge name include the snapshot date. The preview's illustrative scores are not used.

To refresh scores, open the official widgets for every unique `letterboxd` slug in the festival datasets, including components and screening overrides. Record only the displayed `.averagerating` value, confirming its tooltip identifies a weighted average. Keep Letterboxd's displayed one-decimal value rather than rounding its more precise tooltip. If a widget has no published average, omit its score. If any widget is blocked or cannot be verified, leave the existing snapshot and date intact; do not mistake an access error for an unrated film. Replace the complete snapshot and advance `checkedAt` only after all widgets are verified. Bump its import version in `timeline.js`, the timeline import in `app.js`, and the app version in `index.html`; run `npm test`.

Film details load the [official ratings iframe](https://letterboxd.com/about/embed-our-ratings/) only when opened. The histogram and weighted average come directly from Letterboxd and may be unavailable for films with too few ratings. A direct film link remains usable independently of the widget. Programmes link their individual shorts without a synthetic programme rating. Unverified identities have no widget or placeholder.

The iframe uses `theme=light&notitle=true&nobackground=true`, 120 px high. The guide's option table uses camel case, but its [working example](https://embed.letterboxd.com/tmdb/399057/embed-histogram/?notitle=true&theme=light) uses lowercase `notitle`. Verified in the local dashboard at desktop, 390 px and 320 px widths: title hidden, solid background, full chart, score, and Letterboxd attribution visible. Keep the attribution uncropped. The site's JavaScript does not extract scores from the iframe at runtime; sorting by Letterboxd rating is outside this integration.

To add a match, verify the exact film/version, add its canonical slug to the existing record, cite its film page here, and run `npm test`. Do not derive slugs from festival titles. Keep festival dates, runtimes and other metadata independent of Letterboxd's catalogue. The FIDOCS importer preserves curated identifiers on surviving film IDs, component titles, and screening IDs when regenerating its one-record-per-line output.

## SANFIC sources

| Schedule film ID | Verified Letterboxd page |
| --- | --- |
| `a-balcony-in-limoges` | [a-balcony-in-limoges](https://letterboxd.com/film/a-balcony-in-limoges/) |
| `a-happy-family` | [a-happy-family-2026](https://letterboxd.com/film/a-happy-family-2026/) |
| `a-useful-ghost` | [a-useful-ghost](https://letterboxd.com/film/a-useful-ghost/) |
| `amor-es-el-monstruo` | [love-is-the-monster-2026](https://letterboxd.com/film/love-is-the-monster-2026/) |
| `bloques-erraticos` | [erratics](https://letterboxd.com/film/erratics/) |
| `ceniza-en-la-boca` | [ashes-2026-3](https://letterboxd.com/film/ashes-2026-3/) |
| `coward` | [coward-2026](https://letterboxd.com/film/coward-2026/) |
| `cuadro-negro` | [cuadro-negro](https://letterboxd.com/film/cuadro-negro/) |
| `duse` | [duse](https://letterboxd.com/film/duse/) |
| `el-castigo` | [the-punishment-2022](https://letterboxd.com/film/the-punishment-2022/) |
| `el-club` | [the-club-2015](https://letterboxd.com/film/the-club-2015/) |
| `el-gran-arco` | [the-great-arch-2025](https://letterboxd.com/film/the-great-arch-2025/) |
| `el-lugar-de-la-ausencia` | [a-place-of-absence](https://letterboxd.com/film/a-place-of-absence/) |
| `el-vuelo-de-la-ciguena` | [the-flight-of-the-stork-2025](https://letterboxd.com/film/the-flight-of-the-stork-2025/) |
| `fjord` | [fjord-2026](https://letterboxd.com/film/fjord-2026/) |

| Schedule film | Verified Letterboxd film and director |
| --- | --- |
| Histeria | [Hysteria (2025), Mehmet Akif Büyükatalay](https://letterboxd.com/film/hysteria-2025-1/) |
| Historias sobrenaturales | [Supernatural Stories, Mauricio Corco Reyes](https://letterboxd.com/film/supernatural-stories/) |
| Los Justos | [The Righteous (2026), Jorge Lara and Fernando Pérez](https://letterboxd.com/film/the-righteous-2026/) |
| Los Perros | [Los perros (2017), Marcela Said](https://letterboxd.com/film/los-perros/) |
| Los Relatos | [Los relatos, Miguel del Arco](https://letterboxd.com/film/los-relatos/) |
| Mi nueva forma de ver | [My new way of seeing (2026), Andrés Varela and Lucía Gaviglio](https://letterboxd.com/film/my-new-way-of-seeing/) |
| Minotaur | [Minotaur (2026), Andrey Zvyagintsev](https://letterboxd.com/film/minotaur-2026/) |
| Narciso | [Narciso (2026), Marcelo Martinessi](https://letterboxd.com/film/narciso-2026/) |
| Paper Tiger | [Paper Tiger (2026), James Gray](https://letterboxd.com/film/paper-tiger-2026/) |
| Población Flotante | [Floating Population (2025), Carlos Araya Díaz](https://letterboxd.com/film/floating-population/) |
| Post Mortem | [Post Mortem (2010), Pablo Larraín](https://letterboxd.com/film/post-mortem/) |
| Relicto | [Relicto (2026), Guillermo Quintero](https://letterboxd.com/film/relicto/) |
| Rumor | [Rumor, Joana Nin](https://letterboxd.com/film/rumor-2/) |
| Sagrado | [Sagrado (2026), Alice Riff](https://letterboxd.com/film/sagrado/) |
| Silent Friend | [Silent Friend (2025), Ildikó Enyedi](https://letterboxd.com/film/silent-friend/) |
| The Dance of the Living | [Dance of the Living (2025), José Ángel Alayón Dévora](https://letterboxd.com/film/dance-of-the-living/) |
| The Fence | [The Fence (2025), Claire Denis](https://letterboxd.com/film/the-fence-2025-1/) |
| The Man I Love | [The Man I Love (2026), Ira Sachs](https://letterboxd.com/film/the-man-i-love-2026/) |
| The Stranger | [The Stranger (2025), François Ozon](https://letterboxd.com/film/the-stranger-2025-1/) |
| Una Mujer Fantástica | [A Fantastic Woman (2017), Sebastián Lelio](https://letterboxd.com/film/a-fantastic-woman/) |
| Wilma quiere más | [Wilma will mehr (2025), Maren-Kea Freese](https://letterboxd.com/film/wilma-will-mehr/) |
| Winnipeg, el barco de la esperanza | [Winnipeg, Seeds of Hope (2026), Elio Quiroga and Beñat Beitia](https://letterboxd.com/film/winnipeg-seeds-of-hope/) |
| El final de los tiempos (block 2) | [The end of times (2026), Mao Osorio and Ismael Morales](https://letterboxd.com/film/the-end-of-times-2026/) |
| Terra (block 3) | [Terra (2026), Amadis T. Loyer](https://letterboxd.com/film/terra-2026/) |

### Unresolved SANFIC identities

No verified film-page match found for seven standalone films: La muerte te vio volver; Latir; Monguen; Rebelión Interior; Recuerdo tu nombre; Un Reino Imaginado; Viajero Inmóvil. This does not establish that they are absent from Letterboxd. Monguen appears in [a member's 2026 reviews](https://letterboxd.com/elcobalto/reviews/for/2026/), but a film URL and director could not be verified through the available read routes.

All 21 component titles were searched. Nineteen remain unresolved: #Unboxing; El llamado; Cuando el sol se apague; Domingo; Grietas atraviesan este vidrio multicolor; El destello de las lágrimas; El viento gritó tu nombre; La culpa es del cine; La ciudad de los dioses; Que no te alcancen los lobos; Ruidos Molestos; Reina de Puerto; Réplica; Lejanía; Retrato de una memoria; Humedal; El vuelo de los cóndores; Angélica; A la orilla de los recuerdos.

Do not use [Humedal (2023), Jeannette Muñoz](https://letterboxd.com/film/humedal/) for Rossana Castillo Mendez's short: the director and runtime differ. Wilma also has a search-indexed English-title route, [Wilma or The Ghosts of Freedom](https://letterboxd.com/film/wilma-or-the-ghosts-of-freedom/details/); the selected German-title URL was directly opened and verified with the same director and 112-minute runtime.

Also unverified after title/director searches: Animales (Andrés Waissbluth), Bailando Solo (Gilberto González Penilla), El cuerpo como tiempo (Patricia Rivadeneira), and El Tigre del Este (Jorge Acevedo Carrasco). El vuelo de la cigüeña matches Soumaya Hidalgo and Berta Vicente Salas’s 2025 film, not Julián Pastor’s 1979 film of the same translated title. Amor es el Monstruo uses the 2026 feature, not the same director’s 2022 short.

## FIDOCS sources

### Single-film sources

| Existing film ID | Verified Letterboxd page |
| --- | --- |
| `48` | [48](https://letterboxd.com/film/48/) |
| `aqui-se-escucha-el-silencio` | [where-the-silence-is-heard-2026](https://letterboxd.com/film/where-the-silence-is-heard-2026/) |
| `az-zeeb` | [az-zeeb](https://letterboxd.com/film/az-zeeb/) |
| `los-ninos-sin-tierra` | [landless-children](https://letterboxd.com/film/landless-children/) |
| `no-money-no-honey` | [no-money-no-honey-2026](https://letterboxd.com/film/no-money-no-honey-2026/) |
| `obras-muertas` | [above-the-waterline](https://letterboxd.com/film/above-the-waterline/) |
| `dans-la-gueule-de-l-ogre` | [into-the-jaws-of-the-ogre](https://letterboxd.com/film/into-the-jaws-of-the-ogre/) |
| `hanabi` | [fire-flower-2026](https://letterboxd.com/film/fire-flower-2026/) |
| `krakatoa` | [krakatoa-2026](https://letterboxd.com/film/krakatoa-2026/) |
| `la-ilusion-de-un-verano-sin-fin` | [the-illusion-of-an-everlasting-summer](https://letterboxd.com/film/the-illusion-of-an-everlasting-summer/) |
| `plata-o-mierda` | [do-or-die-2025](https://letterboxd.com/film/do-or-die-2025/) |
| `the-kartli-kingdom` | [the-kartli-kingdom](https://letterboxd.com/film/the-kartli-kingdom/) |
| `barbara-forever` | [barbara-forever](https://letterboxd.com/film/barbara-forever/) |
| `biografia-de-jorge-luis-borges` | [life-of-jorge-luis-borges](https://letterboxd.com/film/life-of-jorge-luis-borges/) |
| `calle-santa-fe` | [calle-santa-fe](https://letterboxd.com/film/calle-santa-fe/) |
| `el-tren-fluvial` | [the-river-train](https://letterboxd.com/film/the-river-train/) |
| `imperium` | [imperium-2026](https://letterboxd.com/film/imperium-2026/) |
| `les-roches-rouges` | [red-rocks-2026](https://letterboxd.com/film/red-rocks-2026/) |
| `merci-d-etre-venu` | [thanks-for-coming-2026](https://letterboxd.com/film/thanks-for-coming-2026/) |
| `rehearsals-for-a-revolution` | [rehearsals-for-a-revolution](https://letterboxd.com/film/rehearsals-for-a-revolution/) |
| `revolutionaries-never-die` | [revolutionaries-never-die](https://letterboxd.com/film/revolutionaries-never-die/) |
| `donde-anida-la-lluvia` | [where-the-rain-nests](https://letterboxd.com/film/where-the-rain-nests/) |
| `intimate-stranger` | [intimate-stranger-1991](https://letterboxd.com/film/intimate-stranger-1991/) |
| `nobody-s-business` | [nobodys-business](https://letterboxd.com/film/nobodys-business/) |
| `letter-to-the-editor` | [letter-to-the-editor](https://letterboxd.com/film/letter-to-the-editor/) |
| `benita` | [benita](https://letterboxd.com/film/benita/) |
| `un-minuto-de-sombra-no-nos-ciega` | [one-minute-of-darkness-does-not-blind-us](https://letterboxd.com/film/one-minute-of-darkness-does-not-blind-us/) |
| `natureza-morta` | [still-life-2005-2](https://letterboxd.com/film/still-life-2005-2/) |
| `luz-obscura` | [obscure-light](https://letterboxd.com/film/obscure-light/) |
| `fordlandia-panacea` | [fordlandia-panacea](https://letterboxd.com/film/fordlandia-panacea/) |
| `las-piedras-que-se-esconden-en-el-rio` | [las-piedras-que-se-esconden-en-el-rio](https://letterboxd.com/film/las-piedras-que-se-esconden-en-el-rio/) |

### Component sources

| Existing programme ID | Exact existing component title | Verified Letterboxd page |
| --- | --- | --- |
| `foco-federico-luis` | La siesta | [the-nap-2019](https://letterboxd.com/film/the-nap-2019/) |
| `foco-federico-luis` | En el mismísimo momento | [at-that-very-moment](https://letterboxd.com/film/at-that-very-moment/) |
| `foco-federico-luis` | Quedate quieto o te amo | [stay-still-or-ill-love-you](https://letterboxd.com/film/stay-still-or-ill-love-you/) |
| `foco-federico-luis` | Cómo ser Pehuén Pedre | [how-to-be-pehuen-pedre](https://letterboxd.com/film/how-to-be-pehuen-pedre/) |
| `foco-federico-luis` | Para los contrincantes | [for-the-opponents](https://letterboxd.com/film/for-the-opponents/) |
| `pelechian-project` | The Beginning | [beginning](https://letterboxd.com/film/beginning/) |
| `pelechian-project` | Land of the People | [the-land-of-the-people](https://letterboxd.com/film/the-land-of-the-people/) |
| `pelechian-project` | We | [we-1969](https://letterboxd.com/film/we-1969/) |
| `pelechian-project` | The Seasons | [the-seasons-1975](https://letterboxd.com/film/the-seasons-1975/) |
| `pelechian-project` | The End | [end-1992](https://letterboxd.com/film/end-1992/) |
| `sergio-bravo` | Día de organillos | [day-of-the-organ-grinders](https://letterboxd.com/film/day-of-the-organ-grinders/) |
| `sergio-bravo` | Trilla | [trilla](https://letterboxd.com/film/trilla/) |
| `sergio-bravo` | Mimbre | [mimbre](https://letterboxd.com/film/mimbre/) |
| `cortos-emergentes-1` | Donde anida la lluvia | [where-the-rain-nests](https://letterboxd.com/film/where-the-rain-nests/) |
| `cortos-emergentes-2` | Las piedras que se esconden en el río | [las-piedras-que-se-esconden-en-el-rio](https://letterboxd.com/film/las-piedras-que-se-esconden-en-el-rio/) |

### Identity discrepancies and exclusions

- `48`: Letterboxd dates Susana de Sousa Dias's film to 2010; festival says 2009. Unique title/director and 93-minute duration identify the same work.
- `sergio-bravo` components: Letterboxd dates *Día de organillos* to 1961 (festival 1958) and *Mimbre* to 1958 (festival 1957). Exact directors, titles and 20/10-minute durations match. *Trilla* is 1959 in both.
- `las-piedras-que-se-esconden-en-el-rio`: Letterboxd has no year, but exact title, director Violeta Bernal A., Chile and 18-minute duration match.
- `pensaba-que-te-habias-olvidado-de-escribirme`: [Letterboxd's same-title Sofía Hansen film](https://letterboxd.com/film/pensaba-que-te-habias-olvidado-de-escribirme/) is 2023 and 3 minutes; festival lists 2026 and 18 minutes. Excluded because this may be another version.
- `por-dentro-somos-color-version-cine-expandido`: [Elena Pardo's Letterboxd filmography](https://letterboxd.com/director/elena-pardo/) includes the title, but the festival screening is a 40-minute expanded-cinema version. A 2024/12-minute version appears in [a FICUNAM list](https://letterboxd.com/jesus117/list/ficunam-2024/). No exact version verified; excluded.
- Trilogy film ID `la-batalla-de-chile-parte-i-ii-y-iii` intentionally unmapped. Individual [Part I (1975)](https://letterboxd.com/film/the-battle-of-chile-part-i/), [Part II (1976)](https://letterboxd.com/film/the-battle-of-chile-part-ii/) and [Part III (1979)](https://letterboxd.com/film/the-battle-of-chile-part-iii/) by Patricio Guzmán verified. Festival dates Part II to 1977. Each corresponding screening now has its own `letterboxd` identifier; the trilogy parent remains unmapped.
- `dans-la-gueule-de-l-ogre` uses current English-title slug `into-the-jaws-of-the-ogre`; older indexed French-title paths also exist.

### No exact match verified

Searched original titles and directors; lack of indexed evidence is not proof a Letterboxd entry does not exist. Public Letterboxd search routes were inaccessible to the web tool. Keep these records without a link/iframe until identity is verified:

- `ciudad-jardin` — Javier Zoro.
- `los-fantasmas-de-maria` — Nico Superby.
- `no-todas-las-ninas` — Carolina Astudillo Muñoz.
- `lo-que-en-nosotros-calla` — Carmen Castillo.
- `formas-de-ganar-el-cielo` — Antonella Huerta, Beatriz Hidalgo, Niel Vasquez Moreno.
- `jacinto` — Karina Angulo Morales.
- `norte-claro-sur-oscuro` — Francisca Amigo Moraga.
- `que-lejos-estan-las-fuentes-y-los-pajaros` — Manuela Thayer Requena.
- `quintil` — Esperanza Urrutia Mora.
- `un-verano-te-conoci` — Florencia García Osorio.
- `ya-no-hace-tanto-frio-en-la-primavera` — Sebastián Melo Romero.
- Two version exclusions described above: `pensaba-que-te-habias-olvidado-de-escribirme`, `por-dentro-somos-color-version-cine-expandido`.

The three `mejor-*` winner slots remain unannounced and unmapped.
