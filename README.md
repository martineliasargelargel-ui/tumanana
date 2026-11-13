# ☀️ Tu Mañana

**El resumen diario más bonito, instalable como app.** Clima en vivo de tu ciudad, Real Madrid, tecnología, negocios, economía de Colombia (dólar TRM en vivo), música, videojuegos, ciencia e ingeniería industrial. Se renueva todos los días a las 7:00 a. m. (hora de Colombia).

👉 **Ábrela:** https://martineliasargelargel-ui.github.io/tumanana/

## Cómo instalarla
- **Android (Chrome):** abre el enlace y toca **Instalar**, o el menú ⋮ → *Instalar app*.
- **iPhone (Safari):** botón **Compartir** → *Agregar a inicio*.

## Cómo funciona
- App web progresiva (PWA): `index.html` + `styles.css` + `app.js` + `sw.js` (funciona sin internet con la última edición).
- Cada edición es un JSON en `data/ediciones/AAAA-MM-DD.json`; `data/hoy.json` es la edición actual y `data/ediciones.json` el índice (más reciente primero).
- El clima se pide en vivo a [Open-Meteo](https://open-meteo.com/) (por defecto Cereté, Córdoba; cada usuario puede usar su ubicación).
- El dólar TRM se pide en vivo a [datos.gov.co](https://www.datos.gov.co/) (Superintendencia Financiera).
- Una tarea programada de Claude investiga las noticias cada madrugada, escribe el JSON del día y hace commit aquí.

## Publicar una edición nueva
1. Crear `data/ediciones/AAAA-MM-DD.json` con el mismo formato que las anteriores.
2. Copiarlo a `data/hoy.json`.
3. Agregarlo al inicio de `data/ediciones.json`.
4. Commit y push a `main`. GitHub Pages lo publica en 1–2 minutos.
