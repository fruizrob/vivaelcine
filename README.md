# ¡Viva el Cine!

SANFIC22, 2–8 de noviembre de 2026. Una grilla: tiempo horizontal, salas verticales, bloques proporcionales al metraje. 100 funciones, siete salas. Búsqueda, filtros, zoom y fichas.

## Desarrollo

Sin dependencias ni compilación. Desde la raíz:

```sh
python3 -m http.server 4174 --bind 127.0.0.1
```

Abre http://127.0.0.1:4174/. Con Node.js 20+, `npm test` verifica datos, filtros y proporciones. `npm run dev` inicia la misma vista local.

## Archivos

- `data.js`: programación y metadatos; las fuentes están en `assets/`.
- `core.js`: tiempos y búsqueda, sin DOM.
- `timeline.js`: genera la grilla, sin DOM.
- `app.js`: estado e interacciones; `index.html` y `styles.css`: estructura y diseño.

Los cambios de día actualizan `?dia=AAAA-MM-DD`. Los filtros y el zoom viven en memoria. Sin cuentas, almacenamiento ni servicios externos.

## Publicación

GitHub Pages: **Settings → Pages → Deploy from a branch → main → /(root)**. Se publican estos mismos archivos.

## Datos

Agenda independiente. Datos consultados el 28 de octubre de 2026. [Fuentes](assets/fuentes.json) y [programa oficial](assets/programacion-sanfic22.pdf). Los finales se calculan por metraje; presentaciones y conversatorios pueden extender las funciones.
