// Utilidades compartidas por las plantillas.
import { createCanvas, loadImage } from '@napi-rs/canvas';

// Carga una foto de producto y le recorta los márgenes vacíos (transparentes o casi blancos),
// para que el producto ocupe toda la tarjeta aunque el fabricante deje mucho aire alrededor.
export async function cargarFoto(ruta, { recortar = true } = {}) {
  const img = await loadImage(ruta);
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
