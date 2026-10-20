// Plantilla de carrusel de 5ChollosTech (1080x1350).
// Uso: node plantilla/render_carrusel.mjs episodios/<slug>.json
// Salida: salida/<slug>/slide1.jpg ... slide7.jpg
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = 1080, H = 1350;
const C = {
  fondo1: '#0A0F24', fondo2: '#161E45', naranja: '#FF6A00', amarillo: '#FFC93C',
  blanco: '#FFFFFF', texto: '#D9DEFA', gris: '#8C93B8',
};
const MARCA = '@5chollostech';

GlobalFonts.registerFromPath('C:/Windows/Fonts/ariblk.ttf', 'ABK');
GlobalFonts.registerFromPath('C:/Windows/Fonts/segoeuib.ttf', 'SB');
GlobalFonts.registerFromPath('C:/Windows/Fonts/seguibl.ttf', 'SBL');

const archivo = process.argv[2];
if (!archivo) { console.error('Falta el JSON del episodio'); process.exit(1); }
const EP = JSON.parse(fs.readFileSync(path.resolve(RAIZ, archivo), 'utf8'));
const OUT = path.join(RAIZ, 'salida', EP.slug);
fs.mkdirSync(OUT, { recursive: true });

const emo = {};
for (const n of ['2b50', '1f525', '1f447', '2705', '1f3c6']) emo[n] = await loadImage(path.join(RAIZ, 'emoji', `emoji_u${n}.png`));
const fotos = await Promise.all(EP.productos.map(p => loadImage(path.resolve(RAIZ, p.foto))));
const TOTAL = EP.productos.length + 2;

// ---------- utilidades ----------
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function fondoMarca(ctx) {
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, C.fondo2); g.addColorStop(1, C.fondo1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const r = ctx.createRadialGradient(W, 0, 0, W, 0, 700); r.addColorStop(0, 'rgba(255,106,0,0.35)'); r.addColorStop(1, 'rgba(255,106,0,0)');
  ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
}
function imagenCubre(ctx, img, x, y, w, h, foco = 0.5) {
  const s = Math.max(w / img.width, h / img.height), sw = w / s, sh = h / s;
  ctx.drawImage(img, (img.width - sw) * foco, (img.height - sh) / 2, sw, sh, x, y, w, h);
}
function imagenCabe(ctx, img, x, y, w, h) {
  const s = Math.min(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}
function lineas(ctx, texto, maxW) {
  const out = []; let l = '';
  for (const p of texto.split(' ')) { const t = l ? l + ' ' + p : p; if (ctx.measureText(t).width > maxW && l) { out.push(l); l = p; } else l = t; }
  if (l) out.push(l); return out;
}
function ajusta(ctx, texto, fuente, size, maxW) {
  let t = size; ctx.font = `${t}px ${fuente}`;
  while (ctx.measureText(texto).width > maxW && t > 20) { t -= 2; ctx.font = `${t}px ${fuente}`; }
  return t;
}
function pastilla(ctx, texto, x, y, fondo, color, size = 30, alinear = 'left') {
  ctx.font = `${size}px ABK`; const w = ctx.measureText(texto).width + size * 1.4, h = size * 1.75;
  const x0 = alinear === 'center' ? x - w / 2 : x;
  ctx.fillStyle = fondo; rrect(ctx, x0, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(texto, x0 + size * 0.7, y + h / 2 + 1);
  return w;
}
function logo(ctx, x, y) {
  ctx.fillStyle = C.naranja; ctx.beginPath(); ctx.arc(x + 26, y + 26, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.blanco; ctx.font = '34px ABK'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('5', x + 26, y + 28);
  ctx.textAlign = 'left'; ctx.font = '30px ABK'; ctx.fillText('CHOLLOS', x + 64, y + 28);
  const w = ctx.measureText('CHOLLOS').width; ctx.fillStyle = C.naranja; ctx.fillText('TECH', x + 64 + w + 6, y + 28);
}
function cabecera(ctx, n) {
  logo(ctx, 60, 48);
  ctx.font = '28px SB'; ctx.fillStyle = C.gris; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(`${n}/${TOTAL}`, W - 60, 76);
}
function guardar(canvas, n) {
  const f = path.join(OUT, `slide${n}.jpg`); fs.writeFileSync(f, canvas.toBuffer('image/jpeg', 92)); console.log('OK', f);
}

// ---------- portada ----------
async function portada() {
  const cv = createCanvas(W, H), ctx = cv.getContext('2d'), P = EP.portada;
  imagenCubre(ctx, await loadImage(path.join(RAIZ, 'plantilla', 'fondo_portada.jpg')), 0, 0, W, H);
  const v = ctx.createLinearGradient(0, 0, 0, H); v.addColorStop(0, 'rgba(10,15,36,0.75)'); v.addColorStop(0.45, 'rgba(10,15,36,0.25)'); v.addColorStop(1, 'rgba(10,15,36,0.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  logo(ctx, 60, 48);
  pastilla(ctx, P.etiqueta, W / 2, 150, C.amarillo, C.fondo1, 30, 'center');
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = C.blanco;
  ajusta(ctx, P.linea1, 'ABK', 112, 960); ctx.fillText(P.linea1, W / 2, 340);
  ajusta(ctx, P.linea2, 'ABK', 72, 960); ctx.fillText(P.linea2, W / 2, 440);
  ctx.save(); ctx.shadowColor = 'rgba(255,106,0,0.9)'; ctx.shadowBlur = 50; ctx.fillStyle = C.amarillo; ctx.font = '250px ABK'; ctx.fillText(P.precio, W / 2, 680); ctx.restore();
  ctx.font = '44px SB'; ctx.fillStyle = C.blanco; const sw = ctx.measureText(P.sub).width;
  ctx.fillText(P.sub, W / 2 - 30, 770); ctx.drawImage(emo['1f525'], W / 2 + sw / 2 - 12, 722, 58, 58);
  // las 5 fotos como "pegatinas" sobre el escenario
  const t = 178, gap = 18, x0 = (W - (t * 5 + gap * 4)) / 2, giros = [-0.08, 0.05, -0.03, 0.06, -0.06];
  [...EP.productos].reverse().forEach((p, i) => {
    const img = fotos[EP.productos.indexOf(p)], cx = x0 + i * (t + gap) + t / 2, cy = 960 + (i % 2) * 40;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(giros[i]);
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    ctx.fillStyle = C.blanco; rrect(ctx, -t / 2, -t / 2, t, t, 30); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.save(); rrect(ctx, -t / 2, -t / 2, t, t, 30); ctx.clip();
    if (p.ajuste === 'cover') imagenCubre(ctx, img, -t / 2, -t / 2, t, t, p.foco ?? 0.5); else imagenCabe(ctx, img, -t / 2 + 14, -t / 2 + 14, t - 28, t - 28);
    ctx.restore();
    ctx.fillStyle = C.naranja; ctx.beginPath(); ctx.arc(-t / 2 + 10, -t / 2 + 10, 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.blanco; ctx.font = '30px ABK'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(p.puesto), -t / 2 + 10, -t / 2 + 12);
    ctx.restore();
  });
  // llamada a deslizar
  ctx.fillStyle = C.naranja; rrect(ctx, W / 2 - 200, 1170, 400, 92, 46); ctx.fill();
  ctx.fillStyle = C.blanco; ctx.font = '40px ABK'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('DESLIZA  →', W / 2, 1218);
  guardar(cv, 1);
}

// ---------- producto ----------
function producto(p, img, n) {
  const cv = createCanvas(W, H), ctx = cv.getContext('2d');
  fondoMarca(ctx); cabecera(ctx, n);
  // tarjeta blanca con la foto
  const cx = 60, cy = 130, cw = 960, ch = 620;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
  ctx.fillStyle = C.blanco; rrect(ctx, cx, cy, cw, ch, 44); ctx.fill(); ctx.restore();
  ctx.save(); rrect(ctx, cx, cy, cw, ch, 44); ctx.clip();
  if (p.ajuste === 'cover') imagenCubre(ctx, img, cx, cy, cw, ch, p.foco ?? 0.5); else imagenCabe(ctx, img, cx + 60, cy + 40, cw - 120, ch - 80);
  ctx.restore();
  // número de puesto
  ctx.save(); ctx.shadowColor = 'rgba(255,106,0,0.7)'; ctx.shadowBlur = 30;
  ctx.fillStyle = C.naranja; ctx.beginPath(); ctx.arc(cx + 95, cy + 95, 70, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.fillStyle = C.blanco; ctx.font = '66px ABK'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`#${p.puesto}`, cx + 95, cy + 100);
  if (p.puesto === 1) ctx.drawImage(emo['1f3c6'], cx + cw - 130, cy + 20, 110, 110);
  // texto
  let y = 790;
  pastilla(ctx, p.categoria, 60, y, 'rgba(255,106,0,0.18)', C.naranja, 26);
  y += 72;
  ctx.fillStyle = C.blanco; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  // el nombre va en una sola línea: se reduce la letra hasta que quepa
  ajusta(ctx, p.nombre, 'ABK', 60, 960); ctx.fillText(p.nombre, 60, y); y += 72;
  y += 14;
  ctx.font = '38px SB';
  for (const v of p.ventajas) { ctx.drawImage(emo['2705'], 60, y - 2, 44, 44); ctx.fillStyle = C.texto; ctx.fillText(v, 122, y); y += 60; }
  // valoración
  y += 10; ctx.drawImage(emo['2b50'], 60, y - 4, 48, 48);
  ctx.font = '40px ABK'; ctx.fillStyle = C.amarillo; ctx.fillText(p.rating, 120, y);
  const rw = ctx.measureText(p.rating).width; ctx.font = '34px SB'; ctx.fillStyle = C.gris;
  ctx.fillText(`·  ${p.resenas} reseñas en Amazon`, 136 + rw, y + 4);
  // pie
  ctx.fillStyle = C.naranja; ctx.fillRect(0, H - 96, W, 96);
  ctx.fillStyle = C.blanco; ctx.font = '36px ABK'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText('LINK EN LA BIO', 60, H - 47);
  ctx.textAlign = 'right'; ctx.font = '26px SB'; ctx.fillText(`Foto: fabricante · datos a ${EP.fecha_datos}`, W - 60, H - 47);
  guardar(cv, n);
}

// ---------- cierre ----------
function cierre(n) {
  const cv = createCanvas(W, H), ctx = cv.getContext('2d'), K = EP.cierre;
  fondoMarca(ctx); cabecera(ctx, n);
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = C.blanco; ajusta(ctx, K.pregunta, 'ABK', 96, 920);
  ctx.fillText(K.pregunta, W / 2, 270);
  ctx.font = '50px SB'; ctx.fillStyle = C.amarillo; const tw = ctx.measureText(K.cta).width;
  ctx.fillText(K.cta, W / 2 - 34, 360); ctx.drawImage(emo['1f447'], W / 2 + tw / 2 - 20, 308, 66, 66);
  // resumen de los 5
  let y = 430;
  for (const p of [...EP.productos].sort((a, b) => a.puesto - b.puesto)) {
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; rrect(ctx, 90, y, 900, 96, 48); ctx.fill();
    ctx.fillStyle = C.naranja; ctx.beginPath(); ctx.arc(138, y + 48, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.blanco; ctx.font = '36px ABK'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(p.puesto), 138, y + 50);
    ctx.textAlign = 'left'; ctx.font = '36px SB'; ctx.fillText(p.nombre, 196, y + 50);
    y += 116;
  }
  y += 20;
  ctx.fillStyle = C.naranja; rrect(ctx, 90, y, 900, 110, 55); ctx.fill();
  ctx.fillStyle = C.blanco; ctx.font = '44px ABK'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('TODOS LOS LINKS EN LA BIO', W / 2, y + 57);
  y += 160;
  ctx.font = '36px SB'; ctx.fillStyle = C.texto; ctx.fillText(`Guarda el post y sígueme: ${MARCA}`, W / 2, y);
  ctx.font = '24px SB'; ctx.fillStyle = C.gris;
  ctx.fillText('Como afiliado de Amazon, obtengo ingresos por las compras adscritas', W / 2, H - 78);
  ctx.fillText(`que cumplen los requisitos aplicables. Precios y reseñas a ${EP.fecha_datos}.`, W / 2, H - 44);
  guardar(cv, n);
}

await portada();
EP.productos.forEach((p, i) => producto(p, fotos[i], i + 2));
cierre(TOTAL);
