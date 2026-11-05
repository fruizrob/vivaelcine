// Exact film IDs, or programme ID/component title. Parts use their screening ID.
// Verified sources, identities and premiere evidence: docs/festival-history-sources.md.
const sanficSource = 'https://sanfic.com/mauricio-pesutic-josefina-montane-y-daniel-munoz-encabezan-la-competencia-de-cine-chileno-de-sanfic22/';
const sanfic = premiere => ({
  festival: 'SANFIC', festivalId: 'sanfic-2026', edition: '22ª edición',
  date: '2026-11-02', endDate: '2026-11-08', premiere, source: sanficSource,
});

export default {
  'sanfic-2026/animales': [sanfic('Estreno mundial')],
  'sanfic-2026/la-muerte-te-vio-volver': [sanfic('Estreno mundial')],
  'sanfic-2026/latir': [sanfic('Estreno mundial')],
  'sanfic-2026/monguen': [sanfic('Estreno mundial')],
  'sanfic-2026/rebelion-interior': [sanfic('Estreno mundial')],
  'sanfic-2026/bloques-erraticos': [sanfic('Estreno latinoamericano')],
  'sanfic-2026/poblacion-flotante': [sanfic('Estreno latinoamericano')],
  'sanfic-2026/el-tigre-del-este': [sanfic('Estreno nacional (Chile)')],
  'sanfic-2026/cuadro-negro': [
    {
      festival: 'Punto de Vista', edition: '19ª edición', date: '2025',
      source: 'https://www.puntodevistafestival.com/es/noticias/2025/la-chilena-cuadro-negro-de-jose-luis-sepulveda-y-carolina-adriazola-ganadora-del-gran-premio-a-la-mejor-pelicula-de-la-seccion-oficial-este-ano',
    },
    sanfic('Estreno latinoamericano'),
  ],
  'sanfic-2026/a-useful-ghost': [{
    festival: 'Cannes · Semaine de la Critique', edition: '64ª edición', date: '2025-05-17',
    premiere: 'Estreno mundial',
    source: 'https://www.semainedelacritique.com/en/edition/2025/movie/pee-chai-dai-ka',
  }],
  'fidocs-2026/foco-federico-luis/La siesta': [{
    festival: 'Cannes', edition: 'Competencia de cortometrajes', date: '2019',
    premiere: 'Estreno internacional',
    source: 'https://cinemadedemain.festival-cannes.com/en/2025/six-new-filmmakers-at-the-residency-of-the-festival-de-cannes/',
  }],
  'fidocs-2026/aqui-se-escucha-el-silencio': [
    {
      festival: 'Guadalajara', edition: '41ª edición', date: '2026-04-17', endDate: '2026-04-25',
      source: 'https://ficg.mx/ficg-41-una-clausura-que-mira-al-pasado-y-celebra-el-presente-del-cine/',
    },
    {
      festival: 'EDOC', date: '2026-09-25',
      source: 'https://festivaledoc.org/etn/aqui-se-escucha-el-silencio/',
    },
  ],
};
