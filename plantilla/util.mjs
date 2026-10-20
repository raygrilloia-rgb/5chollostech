// Utilidades compartidas por las plantillas.
import { createCanvas, loadImage } from '@napi-rs/canvas';

export function tieneTransparencia(img) {
  const cv = createCanvas(img.width, img.height), ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, img.width, img.height).data;
  let t = 0;
  for (let i = 3; i < d.length; i += 16) if (d[i] < 20) t++;
  return t / (d.length / 16) > 0.1;
}

// Quita el fondo claro de una foto (blanco o degradado suave) rellenando desde los bordes:
// avanza por píxeles claros que se parecen a su vecino, así no se come un producto blanco con contorno.
// Devuelve un canvas con transparencia y un borde suavizado de 1 px.
export function quitarFondo(img, { claro = 200, salto = 7 } = {}) {
  const w = img.width, h = img.height, cv = createCanvas(w, h), ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, w, h), d = id.data;
  const fondo = new Uint8Array(w * h), pila = [];
  const lum = i => (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3;
  const parecido = (a, b) => Math.abs(d[a * 4] - d[b * 4]) + Math.abs(d[a * 4 + 1] - d[b * 4 + 1]) + Math.abs(d[a * 4 + 2] - d[b * 4 + 2]) <= salto;
  for (let x = 0; x < w; x++) { pila.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y++) { pila.push(y * w, y * w + w - 1); }
  for (const p of pila) if (lum(p) >= claro) fondo[p] = 1;
  while (pila.length) {
    const p = pila.pop(); if (!fondo[p]) continue;
    const x = p % w, y = (p / w) | 0;
    for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
      if (q < 0 || fondo[q]) continue;
      if (lum(q) >= claro && parecido(p, q)) { fondo[q] = 1; pila.push(q); }
    }
  }
  for (let p = 0; p < w * h; p++) {
    if (fondo[p]) { d[p * 4 + 3] = 0; continue; }
    const x = p % w, y = (p / w) | 0;
    const borde = (x > 0 && fondo[p - 1]) || (x < w - 1 && fondo[p + 1]) || (y > 0 && fondo[p - w]) || (y < h - 1 && fondo[p + w]);
    if (borde) d[p * 4 + 3] = 150;
  }
  ctx.putImageData(id, 0, 0);
  return cv;
}

// Carga una foto de producto y le recorta los márgenes vacíos (transparentes o casi blancos),
// para que el producto ocupe toda la tarjeta aunque el fabricante deje mucho aire alrededor.
// Con transparente: true, si la foto no trae transparencia se le quita el fondo claro (para el estilo "flotante").
export async function cargarFoto(ruta, { recortar = true, transparente = false } = {}) {
  let img = await loadImage(ruta);
  if (transparente && !tieneTransparencia(img)) img = quitarFondo(img);
  if (!recortar) return img;
  const cv = createCanvas(img.width, img.height), ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, img.width, img.height).data;
  let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    const i = (y * img.width + x) * 4;
    if (d[i + 3] > 16 && !(d[i] > 244 && d[i + 1] > 244 && d[i + 2] > 244)) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return img;
  const m = Math.round(Math.max(x1 - x0, y1 - y0) * 0.04);
  x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(img.width - 1, x1 + m); y1 = Math.min(img.height - 1, y1 + m);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  if (w > img.width * 0.95 && h > img.height * 0.95) return img;
  const out = createCanvas(w, h);
  out.getContext('2d').drawImage(img, x0, y0, w, h, 0, 0, w, h);
  return out;
}

// ---------- entorno: igual en el PC de Ray (Windows) y en la nube (Linux) ----------
import { GlobalFonts } from '@napi-rs/canvas';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ_UTIL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Fuentes libres (OFL) guardadas en fuentes/: así las slides salen idénticas en cualquier máquina.
// ABK = titulares (Archivo Black), SB = texto (Lato Bold).
export function registrarFuentes() {
  GlobalFonts.registerFromPath(path.join(RAIZ_UTIL, 'fuentes', 'ArchivoBlack-Regular.ttf'), 'ABK');
  GlobalFonts.registerFromPath(path.join(RAIZ_UTIL, 'fuentes', 'Lato-Bold.ttf'), 'SB');
  GlobalFonts.registerFromPath(path.join(RAIZ_UTIL, 'fuentes', 'Lato-Black.ttf'), 'SBL');
}

// ffmpeg: el de la variable FFMPEG si existe; si no, el de ffmpeg-static (trae libx264).
export function ffmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  return createRequire(import.meta.url)('ffmpeg-static');
}
export const CODEC_VIDEO = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-maxrate', '4000k', '-bufsize', '8000k', '-pix_fmt', 'yuv420p', '-profile:v', 'high'];
