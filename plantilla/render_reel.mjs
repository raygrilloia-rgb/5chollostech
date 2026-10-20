// Reel vertical de 5ChollosTech (1080x1920, 30 fps) a partir de un episodio:
// intro con el título, del #5 al #1 con la foto en movimiento, cierre con pregunta.
// Lleva voz (Edge neural, del campo "guion" del JSON) y música de musica/ que baja sola cuando habla la voz.
// Uso: node plantilla/render_reel.mjs episodios/<slug>.json [--preview]
// Salida: salida/<slug>/reel.mp4 (o fotogramas de muestra en salida/<slug>/reel_preview/ con --preview)
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { cargarFoto } from './util.mjs';
import { registrarFuentes, ffmpeg, CODEC_VIDEO } from './util.mjs';
registrarFuentes();

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FF = ffmpeg();
const W = 1080, H = 1920, FPS = 30;
const C = { fondo1: '#0A0F24', fondo2: '#161E45', naranja: '#FF6A00', amarillo: '#FFC93C', blanco: '#FFFFFF', texto: '#D9DEFA', gris: '#8C93B8' };
const VOZ = { nombre: 'es-ES-AlvaroNeural', rate: '+18%', pitch: '+3Hz' };


const args = process.argv.slice(2);
const PREVIEW = args.includes('--preview');
const EP = JSON.parse(fs.readFileSync(path.resolve(RAIZ, args.find(a => !a.startsWith('--'))), 'utf8'));
const OUT = path.join(RAIZ, 'salida', EP.slug);
const TMP = path.join(OUT, 'reel_tmp');
fs.mkdirSync(TMP, { recursive: true });
if (!EP.guion) { console.error('El episodio no tiene "guion" (intro, productos{puesto: frase}, cierre)'); process.exit(1); }

// ---------- voz: una locución por bloque, para sincronizar cada slide con lo que se dice ----------
function duracion(f) {
  const r = spawnSync(FF, ['-hide_banner', '-i', f], { encoding: 'utf8' });
  const m = (r.stderr || '').match(/Duration: (\d+):(\d+):([\d.]+)/);
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
}
async function locucion(texto, nombre) {
  const mp3 = path.join(TMP, nombre + '.mp3'), wav = path.join(TMP, nombre + '.wav');
  const firma = path.join(TMP, nombre + '.txt'), clave = `${VOZ.nombre}|${VOZ.rate}|${VOZ.pitch}|${texto}`;
  if (fs.existsSync(wav) && fs.existsSync(firma) && fs.readFileSync(firma, 'utf8') === clave) return wav;
  // el servicio de voz limita las peticiones seguidas (429): se reintenta con esperas crecientes
  for (let intento = 1; ; intento++) {
    try {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(VOZ.nombre, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
      const { audioFilePath } = await tts.toFile(TMP, texto, { rate: VOZ.rate, pitch: VOZ.pitch });
      fs.renameSync(audioFilePath, mp3); tts.close();
      break;
    } catch (e) {
      if (intento >= 5) throw e;
      const espera = [4, 10, 25, 60][intento - 1];
      console.log(`voz: ${String(e.message || e).slice(0, 80)} → reintento en ${espera}s`);
      await new Promise(r => setTimeout(r, espera * 1000));
    }
  }
  await new Promise(r => setTimeout(r, 700));
  // la voz deja ~1 s de pausa en los ":" y "…" y otro al final: se acortan a 0,2 s para que el reel tenga ritmo
  const r = spawnSync(FF, ['-y', '-hide_banner', '-loglevel', 'error', '-i', mp3, '-af',
    'silenceremove=start_periods=1:start_threshold=-42dB:stop_periods=-1:stop_duration=0.2:stop_threshold=-42dB:stop_silence=0.18,aresample=48000',
    wav], { encoding: 'utf8' });
  if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
  fs.writeFileSync(firma, clave);
  return wav;
}
const ordenados = [...EP.productos].sort((a, b) => b.puesto - a.puesto); // 5 → 1
// gancho opcional: una pregunta de 1-2 s antes del título (los primeros segundos deciden si la gente se queda)
const bloques = EP.guion.gancho ? [{ tipo: 'gancho', texto: EP.guion.gancho }] : [];
bloques.push({ tipo: 'intro', texto: EP.guion.intro });
for (const p of ordenados) bloques.push({ tipo: 'producto', p, texto: EP.guion.productos[String(p.puesto)] });
bloques.push({ tipo: 'cierre', texto: EP.guion.cierre });
let t = 0;
for (const [i, b] of bloques.entries()) {
  b.audio = await locucion(b.texto, `voz_${i}`);
  b.voz = duracion(b.audio);
  b.ini = t;
  b.dur = b.tipo === 'gancho' ? b.voz + 0.3 : Math.max(b.tipo === 'cierre' ? 3.4 : 2.6, b.voz + (b.tipo === 'intro' ? 0.45 : 0.35));
  b.vozIni = t + (b.tipo === 'gancho' ? 0.05 : b.tipo === 'intro' ? 0.25 : 0.2);
  t += b.dur;
}
const TOTAL = t + 0.4, NFRAMES = Math.ceil(TOTAL * FPS);

// ---------- recursos ----------
const fondo = await loadImage(path.join(RAIZ, 'plantilla', 'fondo_portada.jpg'));
const fotos = new Map();
// estilo "flotante" (por defecto): producto en PNG sin tarjeta. "tarjeta": foto sobre tarjeta blanca (el del primer reel).
const FLOTANTE = (EP.reel_estilo || 'flotante') === 'flotante';
for (const p of EP.productos) {
  const foto = FLOTANTE ? (p.foto_reel || p.foto) : p.foto;
  fotos.set(p.puesto, await cargarFoto(path.resolve(RAIZ, foto), FLOTANTE ? { transparente: true } : { recortar: p.ajuste !== 'cover' }));
}
const emo = {};
for (const n of ['2b50', '1f525', '1f447', '2705', '1f3c6']) emo[n] = await loadImage(path.join(RAIZ, 'emoji', `emoji_u${n}.png`));

// ---------- utilidades de dibujo ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t, ini, dur) => clamp((t - ini) / dur);
const easeOut = x => 1 - Math.pow(1 - x, 3);
const easeBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function ajusta(ctx, texto, fuente, size, maxW) { let s = size; ctx.font = `${s}px ${fuente}`; while (ctx.measureText(texto).width > maxW && s > 20) { s -= 2; ctx.font = `${s}px ${fuente}`; } return s; }
function cubre(ctx, img, x, y, w, h, foco = 0.5, zoom = 1) {
  const s = Math.max(w / img.width, h / img.height) * zoom, sw = w / s, sh = h / s;
  ctx.drawImage(img, (img.width - sw) * foco, (img.height - sh) / 2, sw, sh, x, y, w, h);
}
function cabe(ctx, img, x, y, w, h, zoom = 1) {
  const s = Math.min(w / img.width, h / img.height) * zoom, dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}
function fondoMarca(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, C.fondo2); g.addColorStop(1, C.fondo1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const gx = W * (0.8 + 0.15 * Math.sin(t * 0.6)), gy = H * (0.12 + 0.05 * Math.cos(t * 0.5));
  const r = ctx.createRadialGradient(gx, gy, 0, gx, gy, 900); r.addColorStop(0, 'rgba(255,106,0,0.32)'); r.addColorStop(1, 'rgba(255,106,0,0)');
  ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
}
function logo(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = C.naranja; ctx.beginPath(); ctx.arc(28, 28, 28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.blanco; ctx.font = '36px ABK'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('5', 28, 30);
  ctx.textAlign = 'left'; ctx.font = '32px ABK'; ctx.fillText('CHOLLOS', 70, 30);
  const w = ctx.measureText('CHOLLOS').width; ctx.fillStyle = C.naranja; ctx.fillText('TECH', 76 + w, 30);
  ctx.restore();
}
function pastilla(ctx, texto, cx, y, fondo, color, size) {
  ctx.font = `${size}px ABK`; const w = ctx.measureText(texto).width + size * 1.4, h = size * 1.8;
  ctx.fillStyle = fondo; rrect(ctx, cx - w / 2, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(texto, cx, y + h / 2 + 1);
}
function sticker(ctx, img, p, cx, cy, t, giro, escala) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(giro); ctx.scale(escala, escala);
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
  ctx.fillStyle = C.blanco; rrect(ctx, -t / 2, -t / 2, t, t, 32); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.save(); rrect(ctx, -t / 2, -t / 2, t, t, 32); ctx.clip();
  if (p.ajuste === 'cover') cubre(ctx, img, -t / 2, -t / 2, t, t, p.foco ?? 0.5); else cabe(ctx, img, -t / 2 + 16, -t / 2 + 16, t - 32, t - 32);
  ctx.restore();
  ctx.fillStyle = C.naranja; ctx.beginPath(); ctx.arc(-t / 2 + 12, -t / 2 + 12, 32, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.blanco; ctx.font = '32px ABK'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(p.puesto), -t / 2 + 12, -t / 2 + 14);
  ctx.restore();
}

// ---------- escenas ----------
function intro(ctx, lt) {
  cubre(ctx, fondo, 0, 0, W, H, 0.5, 1.05 + lt * 0.02);
  ctx.fillStyle = 'rgba(10,15,36,0.45)'; ctx.fillRect(0, 0, W, H);
  logo(ctx, 70, 120);
  const P = EP.portada;
  const a = easeBack(prog(lt, 0.05, 0.4)), b = easeBack(prog(lt, 0.25, 0.4)), c = easeBack(prog(lt, 0.45, 0.5));
  ctx.save(); ctx.globalAlpha = clamp(a * 2); pastilla(ctx, P.etiqueta, W / 2, 250, C.amarillo, C.fondo1, 32); ctx.restore();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = C.blanco;
  ctx.save(); ctx.translate(W / 2, 470); ctx.scale(a, a); ajusta(ctx, P.linea1, 'ABK', 120, 980); ctx.fillText(P.linea1, 0, 0); ctx.restore();
  ctx.save(); ctx.translate(W / 2, 580); ctx.scale(b, b); ajusta(ctx, P.linea2, 'ABK', 78, 980); ctx.fillText(P.linea2, 0, 0); ctx.restore();
  const pulso = 1 + 0.03 * Math.sin(lt * 7);
  ctx.save(); ctx.translate(W / 2, 870); ctx.scale(c * pulso, c * pulso);
  ctx.shadowColor = 'rgba(255,106,0,0.95)'; ctx.shadowBlur = 60; ctx.fillStyle = C.amarillo; ctx.font = '300px ABK'; ctx.fillText(P.precio, 0, 0); ctx.restore();
  // los 5 productos caen uno a uno
  const t0 = 0.8, tam = 186, gap = 14, x0 = (W - (tam * 5 + gap * 4)) / 2, giros = [-0.08, 0.05, -0.03, 0.06, -0.06];
  ordenados.forEach((p, i) => {
    const e = easeBack(prog(lt, t0 + i * 0.12, 0.35)); if (e <= 0) return;
    const cx = x0 + i * (tam + gap) + tam / 2, cy = 1130 + (i % 2) * 40 - (1 - e) * 200;
    sticker(ctx, fotos.get(p.puesto), p, cx, cy, tam, giros[i] + Math.sin(lt * 2 + i) * 0.02, e);
  });
  // flash de entrada
  const fl = 1 - prog(lt, 0, 0.25); if (fl > 0) { ctx.fillStyle = `rgba(255,255,255,${fl * 0.8})`; ctx.fillRect(0, 0, W, H); }
}

function producto(ctx, b, lt, tGlobal) {
  const p = b.p, img = fotos.get(p.puesto);
  fondoMarca(ctx, tGlobal);
  logo(ctx, 70, 110, 0.9);
  const P = EP.portada;
  pastilla(ctx, `${P.linea1} · MENOS DE ${P.precio}`, W / 2, 190, 'rgba(255,255,255,0.10)', C.blanco, 28);
  // progreso: 5 puntos del #5 al #1
  ordenados.forEach((q, i) => {
    const activo = q.puesto === p.puesto, hecho = q.puesto > p.puesto;
    const x = W / 2 + (i - 2) * 120, y = 310;
    ctx.fillStyle = activo ? C.naranja : hecho ? 'rgba(255,106,0,0.45)' : 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.arc(x, y, activo ? 30 : 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.blanco; ctx.font = `${activo ? 30 : 22}px ABK`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(q.puesto), x, y + 2);
  });
  const e = easeOut(prog(lt, 0, 0.35)), cw = 820, ch = 780, cx = (W - cw) / 2 + (FLOTANTE ? 0 : (1 - e) * 700), cy = 380;
  if (FLOTANTE) {
    // producto en PNG flotando: halo de luz que gira, sombra en el suelo, balanceo suave y destellos
    const mx = W / 2, my = cy + ch / 2, pop = easeBack(prog(lt, 0, 0.45));
    ctx.save(); ctx.globalAlpha = e;
    const halo = ctx.createRadialGradient(mx, my, 40, mx, my, 470);
    halo.addColorStop(0, 'rgba(255,201,60,0.55)'); halo.addColorStop(0.45, 'rgba(255,106,0,0.28)'); halo.addColorStop(1, 'rgba(255,106,0,0)');
    ctx.fillStyle = halo; ctx.fillRect(0, cy - 120, W, ch + 240);
    ctx.translate(mx, my); ctx.rotate(tGlobal * 0.35);
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      const rg = ctx.createLinearGradient(0, 0, 0, -520); rg.addColorStop(0, 'rgba(255,220,150,0.16)'); rg.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.lineTo(90, -520); ctx.lineTo(-90, -520); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    const bob = Math.sin(tGlobal * 2.2) * 16, giro = Math.sin(tGlobal * 1.6) * 0.035, z = (0.62 + 0.38 * pop) * (1 + 0.05 * prog(lt, 0, b.dur));
    // sombra elíptica: se encoge cuando el producto sube
    ctx.save(); ctx.globalAlpha = 0.45 * e; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(mx, cy + ch - 40, 260 * (1 - bob / 120), 34, 0, 0, Math.PI * 2); ctx.filter = 'blur(14px)'; ctx.fill(); ctx.restore();
    ctx.save(); ctx.globalAlpha = clamp(e * 1.4); ctx.translate(mx, my + bob - 20); ctx.rotate(giro); ctx.scale(z, z);
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
    cabe(ctx, img, -cw / 2 + 60, -ch / 2 + 60, cw - 120, ch - 160);
    ctx.restore();
    // destellos
    for (let i = 0; i < 7; i++) {
      const ang = i * 0.9 + tGlobal * (0.6 + i * 0.07), rad = 330 + 60 * Math.sin(tGlobal * 1.3 + i);
      const sx = mx + Math.cos(ang) * rad, sy = my + Math.sin(ang) * rad * 0.8, s = 10 + 8 * Math.sin(tGlobal * 5 + i * 2);
      if (s <= 0) continue;
      ctx.save(); ctx.globalAlpha = 0.85 * e; ctx.fillStyle = i % 2 ? C.amarillo : C.blanco; ctx.translate(sx, sy); ctx.rotate(tGlobal * 2 + i);
      ctx.beginPath(); for (let k = 0; k < 8; k++) { const r = k % 2 ? s * 0.28 : s; ctx.lineTo(Math.cos(k * Math.PI / 4) * r, Math.sin(k * Math.PI / 4) * r); } ctx.closePath(); ctx.fill(); ctx.restore();
    }
  } else {
    // tarjeta blanca con la foto: entra desde la derecha y hace un zoom lento
    ctx.save(); ctx.globalAlpha = e;
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
    ctx.fillStyle = C.blanco; rrect(ctx, cx, cy, cw, ch, 52); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.save(); rrect(ctx, cx, cy, cw, ch, 52); ctx.clip();
    const z = 1 + 0.07 * prog(lt, 0, b.dur);
    if (p.ajuste === 'cover') cubre(ctx, img, cx, cy, cw, ch, p.foco ?? 0.5, z); else cabe(ctx, img, cx + 70, cy + 70, cw - 140, ch - 140, z);
    ctx.restore(); ctx.restore();
  }
  // número
  const n = easeBack(prog(lt, 0.2, 0.4));
  if (n > 0) {
    ctx.save(); ctx.translate(cx + 110, cy + 110); ctx.scale(n, n);
    ctx.shadowColor = 'rgba(255,106,0,0.8)'; ctx.shadowBlur = 40;
    ctx.fillStyle = C.naranja; ctx.beginPath(); ctx.arc(0, 0, 92, 0, Math.PI * 2); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.fillStyle = C.blanco; ctx.font = '84px ABK'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`#${p.puesto}`, 0, 8);
    ctx.restore();
  }
  if (p.puesto === 1) { const k = easeBack(prog(lt, 0.45, 0.4)); if (k > 0) { ctx.save(); ctx.translate(cx + cw - 100, cy + 100); ctx.scale(k, k); ctx.rotate(Math.sin(tGlobal * 4) * 0.08); ctx.drawImage(emo['1f3c6'], -75, -75, 150, 150); ctx.restore(); } }
  // textos
  const tx = easeOut(prog(lt, 0.3, 0.35));
  ctx.save(); ctx.globalAlpha = tx; ctx.translate(0, (1 - tx) * 40);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = '28px ABK'; const cat = p.categoria, cwid = ctx.measureText(cat).width + 40;
  ctx.fillStyle = 'rgba(255,106,0,0.2)'; rrect(ctx, 90, 1195, cwid, 52, 26); ctx.fill();
  ctx.fillStyle = C.naranja; ctx.textBaseline = 'middle'; ctx.fillText(cat, 110, 1222);
  ctx.textBaseline = 'top'; ctx.fillStyle = C.blanco; ajusta(ctx, p.nombre, 'ABK', 70, 900); ctx.fillText(p.nombre, 90, 1270);
  ctx.restore();
  p.ventajas.slice(0, 2).forEach((v, i) => {
    const a = easeOut(prog(lt, 0.55 + i * 0.25, 0.3)); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.translate((1 - a) * -60, 0);
    ctx.drawImage(emo['2705'], 90, 1372 + i * 72, 50, 50);
    ctx.fillStyle = C.texto; ctx.textBaseline = 'top'; ctx.textAlign = 'left'; ajusta(ctx, v, 'SB', 44, 760); ctx.fillText(v, 156, 1374 + i * 72);
    ctx.restore();
  });
  const r = easeOut(prog(lt, 1.05, 0.3));
  if (r > 0) {
    ctx.save(); ctx.globalAlpha = r;
    ctx.drawImage(emo['2b50'], 90, 1530, 54, 54);
    ctx.font = '46px ABK'; ctx.fillStyle = C.amarillo; ctx.textBaseline = 'top'; ctx.textAlign = 'left'; ctx.fillText(p.rating, 156, 1532);
    const rw = ctx.measureText(p.rating).width; ctx.font = '36px SB'; ctx.fillStyle = C.gris; ctx.fillText(`·  ${p.resenas} reseñas en Amazon`, 176 + rw, 1540);
    ctx.restore();
  }
}

function cierre(ctx, lt, tGlobal) {
  fondoMarca(ctx, tGlobal);
  logo(ctx, 70, 110, 0.9);
  const a = easeBack(prog(lt, 0.05, 0.45));
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = C.blanco;
  ctx.save(); ctx.translate(W / 2, 400); ctx.scale(a, a); ajusta(ctx, EP.cierre.pregunta, 'ABK', 104, 960); ctx.fillText(EP.cierre.pregunta, 0, 0); ctx.restore();
  const b = easeOut(prog(lt, 0.3, 0.4));
  ctx.save(); ctx.globalAlpha = b; ctx.font = '56px SB'; ctx.fillStyle = C.amarillo; const tw = ctx.measureText(EP.cierre.cta).width;
  ctx.fillText(EP.cierre.cta, W / 2 - 40, 500); ctx.drawImage(emo['1f447'], W / 2 + tw / 2 - 20, 440, 76, 76); ctx.restore();
  const tam = 180, gap = 18, x0 = (W - (tam * 5 + gap * 4)) / 2;
  [...EP.productos].sort((x, y) => x.puesto - y.puesto).forEach((p, i) => {
    const e = easeBack(prog(lt, 0.4 + i * 0.1, 0.35)); if (e <= 0) return;
    sticker(ctx, fotos.get(p.puesto), p, x0 + i * (tam + gap) + tam / 2, 760 + Math.sin(tGlobal * 3 + i) * 8, tam, 0, e);
  });
  const c = easeBack(prog(lt, 0.9, 0.4));
  if (c > 0) {
    ctx.save(); ctx.translate(W / 2, 1060); ctx.scale(c, c);
    ctx.fillStyle = C.naranja; rrect(ctx, -430, -70, 860, 140, 70); ctx.fill();
    ctx.fillStyle = C.blanco; ctx.font = '50px ABK'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('LINKS EN LA BIO', 0, 4);
    ctx.restore();
  }
  const d = easeOut(prog(lt, 1.2, 0.4));
  ctx.save(); ctx.globalAlpha = d; ctx.textAlign = 'center'; ctx.font = '44px SB'; ctx.fillStyle = C.texto;
  ctx.fillText('Sígueme para más chollos: @5chollostech', W / 2, 1260); ctx.restore();
}

function gancho(ctx, b, lt, tGlobal) {
  fondoMarca(ctx, tGlobal);
  const texto = EP.guion.gancho_texto || b.texto;
  ctx.font = '92px ABK';
  const pal = texto.split(' '), lineas = [[]];
  for (const w of pal) { const l = lineas[lineas.length - 1]; if (ctx.measureText([...l, w].join(' ')).width > 940 && l.length) lineas.push([w]); else l.push(w); }
  // las palabras aparecen al ritmo de la voz
  const total = pal.length, visibles = Math.ceil(total * clamp((lt - 0.05) / Math.max(0.6, b.voz * 0.85)));
  let k = 0; const y0 = H * 0.42 - (lineas.length - 1) * 58;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  lineas.forEach((l, i) => {
    const anchoL = ctx.measureText(l.join(' ')).width; let x = W / 2 - anchoL / 2;
    for (const w of l) {
      const ww = ctx.measureText(w + ' ').width;
      if (k < visibles) { const a = easeBack(clamp((lt - k * (b.voz * 0.85 / total)) / 0.18)); ctx.save(); ctx.translate(x + ww / 2, y0 + i * 116); ctx.scale(a, a);
        ctx.fillStyle = /d|€/.test(w) ? C.amarillo : C.blanco; ctx.fillText(w, -ww / 2, 0); ctx.restore(); }
      x += ww; k++;
    }
  });
  const fl = 1 - prog(lt, 0, 0.2); if (fl > 0) { ctx.fillStyle = `rgba(255,255,255,${fl * 0.6})`; ctx.fillRect(0, 0, W, H); }
}

function frame(ctx, t) {
  const b = bloques.find(x => t >= x.ini && t < x.ini + x.dur) || bloques[bloques.length - 1];
  const lt = t - b.ini;
  if (b.tipo === 'gancho') gancho(ctx, b, lt, t);
  else if (b.tipo === 'intro') intro(ctx, lt);
  else if (b.tipo === 'producto') producto(ctx, b, lt, t);
  else cierre(ctx, lt, t);
  // barra de progreso arriba
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(0, 0, W, 10);
  ctx.fillStyle = C.naranja; ctx.fillRect(0, 0, W * clamp(t / TOTAL), 10);
  // fundido final
  const f = prog(t, TOTAL - 0.35, 0.35); if (f > 0) { ctx.fillStyle = `rgba(10,15,36,${f})`; ctx.fillRect(0, 0, W, H); }
}

const cv = createCanvas(W, H), ctx = cv.getContext('2d');
if (PREVIEW) {
  const pd = path.join(OUT, 'reel_preview'); fs.rmSync(pd, { recursive: true, force: true }); fs.mkdirSync(pd, { recursive: true });
  const marcas = bloques.map(x => x.ini + Math.min(x.tipo === 'intro' ? 1.4 : 1.6, x.dur - 0.2));
  marcas.forEach((m, i) => { frame(ctx, m); fs.writeFileSync(path.join(pd, `f${i}.jpg`), cv.toBuffer('image/jpeg', 80)); });
  console.log('preview', pd, TOTAL.toFixed(1) + 's');
  process.exit(0);
}

// ---------- audio: voces colocadas en su momento + música que baja cuando habla la voz ----------
const pistas = fs.readdirSync(path.join(RAIZ, 'musica')).filter(f => f.endsWith('.mp3')).sort();
const musica = EP.musica ? path.join(RAIZ, 'musica', EP.musica)
  : path.join(RAIZ, 'musica', pistas[[...EP.slug].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % pistas.length]);
const inicioMusica = EP.musica_inicio ?? 0;
const vozWav = path.join(TMP, 'voz.wav');
{
  const ins = bloques.flatMap(x => ['-i', x.audio]);
  const fil = bloques.map((x, i) => `[${i}:a]aresample=48000,adelay=${Math.round(x.vozIni * 1000)}|${Math.round(x.vozIni * 1000)}[v${i}]`).join(';')
    + ';' + bloques.map((_, i) => `[v${i}]`).join('') + `amix=inputs=${bloques.length}:normalize=0,apad,atrim=0:${TOTAL.toFixed(2)}[v]`;
  const r = spawnSync(FF, ['-y', '-hide_banner', '-loglevel', 'error', ...ins, '-filter_complex', fil, '-map', '[v]', '-ac', '1', vozWav], { encoding: 'utf8' });
  if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
}
// efectos sintetizados: "whoosh" en cada cambio de escena y "ding" al llegar al #1
const sfxWav = path.join(TMP, 'sfx.wav');
{
  const SR = 48000, N = Math.ceil(TOTAL * SR), buf = new Float32Array(N);
  const whoosh = (t0, dur = 0.42, gain = 0.5) => { let lp = 0, i0 = Math.floor(t0 * SR); for (let i = 0; i < dur * SR && i0 + i < N; i++) { const x = i / (dur * SR), env = Math.sin(Math.PI * x) ** 2, k = 0.02 + 0.25 * x; lp += k * ((Math.random() * 2 - 1) - lp); buf[i0 + i] += lp * env * gain * 2.2; } };
  const ding = (t0, gain = 0.35) => { const i0 = Math.floor(t0 * SR); for (let i = 0; i < 1.1 * SR && i0 + i < N; i++) { const tt = i / SR, env = Math.exp(-tt * 4.5); buf[i0 + i] += gain * env * (Math.sin(2 * Math.PI * 1318.5 * tt) + 0.5 * Math.sin(2 * Math.PI * 2637 * tt) + 0.25 * Math.sin(2 * Math.PI * 3955 * tt)) / 1.75; } };
  const pop = (t0, gain = 0.4) => { const i0 = Math.floor(t0 * SR); let ph = 0; for (let i = 0; i < 0.12 * SR && i0 + i < N; i++) { const x = i / (0.12 * SR); ph += 2 * Math.PI * (700 - 500 * x) / SR; buf[i0 + i] += gain * Math.sin(ph) * (1 - x); } };
  for (const b of bloques) {
    if (b.tipo === 'gancho') pop(b.ini + 0.02);
    else if (b.ini > 0) whoosh(Math.max(0, b.ini - 0.2));
    if (b.tipo === 'producto' && b.p.puesto === 1) ding(b.ini + 0.25);
  }
  const pcm = Buffer.alloc(44 + N * 2);
  pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + N * 2, 4); pcm.write('WAVEfmt ', 8); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22);
  pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36); pcm.writeUInt32LE(N * 2, 40);
  for (let i = 0; i < N; i++) pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2);
  fs.writeFileSync(sfxWav, pcm);
}
const mp4 = path.join(OUT, 'reel.mp4');
const filtro = `[1:a]atrim=${inicioMusica}:${(inicioMusica + TOTAL).toFixed(2)},asetpts=PTS-STARTPTS,aresample=48000,volume=0.55,afade=t=in:d=0.3,afade=t=out:st=${(TOTAL - 1.2).toFixed(2)}:d=1.2[m];`
  + `[2:a]aresample=48000,volume=1.6,asplit[va][vb];[m][va]sidechaincompress=threshold=0.03:ratio=9:attack=15:release=350[md];`
  + `[3:a]volume=${EP.sfx === false ? 0 : 0.8}[sx];[md][vb][sx]amix=inputs=3:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[a]`;
const ff = spawn(FF, ['-y', '-hide_banner', '-loglevel', 'error',
  '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
  '-i', musica, '-i', vozWav, '-i', sfxWav, '-filter_complex', filtro, '-map', '0:v', '-map', '[a]',
  ...CODEC_VIDEO, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
  '-t', TOTAL.toFixed(2), '-movflags', '+faststart', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
const t0 = Date.now();
for (let f = 0; f < NFRAMES; f++) {
  frame(ctx, f / FPS);
  const d = ctx.getImageData(0, 0, W, H).data;
  if (!ff.stdin.write(Buffer.from(d.buffer, d.byteOffset, d.byteLength))) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 150 === 0) console.log(`frame ${f}/${NFRAMES} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
console.log('listo:', mp4, TOTAL.toFixed(1) + 's', 'música:', path.basename(musica));
