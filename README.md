# 5ChollosTech

Top 5 de tecnología de Amazon España para Instagram (@5chollostech), con su web en GitHub Pages.

- `episodios/<slug>.json`: los datos de cada post (productos, ASIN, ventajas, valoraciones).
- `node plantilla/render_carrusel.mjs episodios/<slug>.json`: genera las slides en `salida/<slug>/`.
- `node plantilla/generar_web.mjs`: regenera la web en `docs/` con todos los episodios.
- `node plantilla/servir.mjs`: previsualiza la web en http://localhost:4321.

Como afiliado de Amazon, 5ChollosTech obtiene ingresos por las compras adscritas que cumplen los requisitos aplicables.
