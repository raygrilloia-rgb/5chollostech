// Genera la web estática de 5ChollosTech en docs/ (GitHub Pages sirve esa carpeta) a partir de episodios/*.json
// Uso: node plantilla/generar_web.mjs
// Todos los enlaces son relativos, así funciona en GitHub Pages (/5chollostech/) y en local.
import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(RAIZ, 'docs');
const CFG = JSON.parse(fs.readFileSync(path.join(RAIZ, 'config.json'), 'utf8'));
const TAG = CFG.amazon_tag;
const AVISO = 'Como afiliado de Amazon, obtengo ingresos por las compras adscritas que cumplen los requisitos aplicables.';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const enlace = asin => `https://www.amazon.es/dp/${asin}?tag=${TAG}`;
const escribe = (rel, txt) => { const f = path.join(WEB, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, txt); };

// Foto del producto en un cuadrado blanco de 800 px (JPEG ligero)
async function fotoWeb(p, destino) {
  const img = await loadImage(path.resolve(RAIZ, p.foto)), T = 800, cv = createCanvas(T, T), ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, T, T);
  if (p.ajuste === 'cover') {
    const s = Math.max(T / img.width, T / img.height), sw = T / s, sh = T / s;
    ctx.drawImage(img, (img.width - sw) * (p.foco ?? 0.5), (img.height - sh) / 2, sw, sh, 0, 0, T, T);
  } else {
    const m = 60, s = Math.min((T - 2 * m) / img.width, (T - 2 * m) / img.height), w = img.width * s, h = img.height * s;
    ctx.drawImage(img, (T - w) / 2, (T - h) / 2, w, h);
  }
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, cv.toBuffer('image/jpeg', 85));
}
// Portada del carrusel reducida a 540x675 para las tarjetas del inicio
async function miniatura(slug, destino) {
  const src = path.join(RAIZ, 'salida', slug, 'slide1.jpg');
  if (!fs.existsSync(src)) return false;
  const img = await loadImage(src), cv = createCanvas(540, 675);
  cv.getContext('2d').drawImage(img, 0, 0, 540, 675);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, cv.toBuffer('image/jpeg', 82));
  return true;
}

function plantilla({ titulo, descripcion, base, cuerpo, og }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
${og ? `<meta property="og:image" content="${esc(og)}">` : ''}
<meta name="theme-color" content="#0A0F24">
<link rel="icon" href="${base}assets/icono.svg" type="image/svg+xml">
<link rel="stylesheet" href="${base}assets/estilo.css">
</head>
<body>
<header class="barra">
  <a class="logo" href="${base}index.html"><span class="logo-5">5</span>CHOLLOS<b>TECH</b></a>
  <a class="ig" href="https://www.instagram.com/${CFG.instagram}/" target="_blank" rel="noopener">@${CFG.instagram}</a>
</header>
${cuerpo}
<footer class="pie">
  <p class="aviso">${AVISO} Los precios y las reseñas pueden cambiar: consulta siempre el precio actual en Amazon.</p>
  <nav><a href="${base}aviso-legal/index.html">Aviso legal</a> · <a href="${base}privacidad/index.html">Privacidad</a> · <a href="https://www.instagram.com/${CFG.instagram}/" target="_blank" rel="noopener">Instagram</a></nav>
  <p>© ${new Date().getFullYear()} 5ChollosTech</p>
</footer>
</body>
</html>
`;
}

const episodios = fs.readdirSync(path.join(RAIZ, 'episodios')).filter(f => f.endsWith('.json')).sort().reverse()
  .map(f => JSON.parse(fs.readFileSync(path.join(RAIZ, 'episodios', f), 'utf8')));

fs.rmSync(WEB, { recursive: true, force: true });
fs.cpSync(path.join(RAIZ, 'plantilla', 'web_assets'), path.join(WEB, 'assets'), { recursive: true });

const tarjetasInicio = [];
for (const [i, EP] of episodios.entries()) {
  const P = EP.portada;
  const tituloBonito = EP.titulo_web || `${P.linea1} ${P.linea2} ${P.precio}`.toLowerCase();
  const dir = `top/${EP.slug}/`;
  const tieneMini = await miniatura(EP.slug, path.join(WEB, dir, 'portada.jpg'));
  const ordenados = [...EP.productos].sort((a, b) => a.puesto - b.puesto);
  for (const p of ordenados) await fotoWeb(p, path.join(WEB, dir, `${p.puesto}.jpg`));

  const tarjetas = ordenados.map(p => `
  <article class="producto${p.puesto === 1 ? ' top1' : ''}" id="p${p.puesto}">
    <div class="foto"><span class="puesto">#${p.puesto}</span>${p.puesto === 1 ? '<span class="corona">🏆 El mejor</span>' : ''}<img src="${p.puesto}.jpg" alt="${esc(p.nombre)}" loading="lazy" width="800" height="800"></div>
    <div class="info">
      <span class="cat">${esc(p.categoria)}</span>
      <h2>${esc(p.nombre)}</h2>
      <ul>${p.ventajas.map(v => `<li>${esc(v)}</li>`).join('')}</ul>
      <p class="rating"><span class="estrellas">★ ${esc(p.rating)}</span> · ${esc(p.resenas)} reseñas en Amazon</p>
      <a class="boton" href="${enlace(p.asin)}" target="_blank" rel="sponsored nofollow noopener">Ver precio en Amazon →</a>
    </div>
  </article>`).join('\n');

  const indice = ordenados.map(p => `<a href="#p${p.puesto}"><b>${p.puesto}</b> ${esc(p.nombre)}</a>`).join('');
  escribe(dir + 'index.html', plantilla({
    titulo: `${tituloBonito} | 5ChollosTech`,
    descripcion: `${tituloBonito}: ${ordenados.map(p => p.nombre).join(', ')}. Seleccionados entre los más vendidos de Amazon España.`,
    base: '../../', og: tieneMini ? 'portada.jpg' : '',
    cuerpo: `
<main class="pagina">
  <a class="volver" href="../../index.html">← Todos los Top 5</a>
  <section class="hero">
    <span class="etiqueta">${esc(P.etiqueta)}</span>
    <h1>${esc(P.linea1)} <span>${esc(P.linea2)}</span> <em>${esc(P.precio)}</em></h1>
    <p>Elegidos entre los más vendidos de Amazon España, todos con valoraciones altas y miles de reseñas. Datos consultados el ${esc(EP.fecha_datos)}.</p>
    <nav class="indice">${indice}</nav>
  </section>
  <section class="lista">${tarjetas}
  </section>
</main>`,
  }));

  tarjetasInicio.push(`
  <a class="post${i === 0 ? ' nuevo' : ''}" href="${dir}index.html">
    ${tieneMini ? `<img src="${dir}portada.jpg" alt="${esc(tituloBonito)}" width="540" height="675" loading="lazy">` : ''}
    <div><span class="fecha">${i === 0 ? '🆕 Nuevo · ' : ''}${esc(EP.fecha_datos)}</span><h2>${esc(tituloBonito)}</h2><span class="ver">Ver los 5 →</span></div>
  </a>`);
}

escribe('index.html', plantilla({
  titulo: '5ChollosTech | Los mejores chollos tech de Amazon',
  descripcion: 'Top 5 de tecnología barata y bien valorada en Amazon España: auriculares, smartwatch, cargadores y más.',
  base: '',
  cuerpo: `
<main class="pagina">
  <section class="hero inicio">
    <span class="etiqueta">AMAZON ESPAÑA</span>
    <h1>Los mejores <em>chollos tech</em>, de 5 en 5</h1>
    <p>Cada semana elegimos los 5 mejores productos de una categoría entre los más vendidos de Amazon. Pulsa en un post para ver los enlaces.</p>
  </section>
  <section class="posts">${tarjetasInicio.join('\n')}
  </section>
</main>`,
}));

const legal = (titulo, html) => plantilla({ titulo: `${titulo} | 5ChollosTech`, descripcion: titulo, base: '../', cuerpo: `<main class="pagina texto"><a class="volver" href="../index.html">← Inicio</a><h1>${titulo}</h1>${html}</main>` });
escribe('aviso-legal/index.html', legal('Aviso legal', `
<p><b>Titular:</b> ${esc(CFG.titular)}<br><b>Contacto:</b> ${esc(CFG.email)}</p>
<p>Esta web recomienda productos de tecnología. Los enlaces a Amazon son <b>enlaces de afiliado</b>: si compras a través de ellos, 5ChollosTech recibe una pequeña comisión, sin que a ti te cueste más. ${AVISO}</p>
<p>Los precios, la disponibilidad y las valoraciones son los de Amazon en la fecha indicada en cada página y pueden cambiar. El precio válido es siempre el que muestre Amazon en el momento de la compra.</p>
<p>Las imágenes de producto proceden de las webs oficiales de cada fabricante y pertenecen a sus respectivos dueños. Las marcas citadas pertenecen a sus propietarios.</p>`));
escribe('privacidad/index.html', legal('Privacidad', `
<p>Esta web no usa cookies, no tiene formularios y no recoge datos personales. No usamos herramientas de analítica ni de publicidad.</p>
<p>Al pulsar un enlace a Amazon sales de esta web: a partir de ahí se aplica la política de privacidad y de cookies de Amazon.</p>
<p>Para cualquier consulta: ${esc(CFG.email)}</p>`));
escribe('.nojekyll', '');
console.log(`Web generada en ${WEB} con ${episodios.length} post(s)`);
