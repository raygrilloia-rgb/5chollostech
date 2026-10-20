// Foto de perfil de 5ChollosTech (1080x1080, pensada para verse en círculo y pequeña).
// Uso: node plantilla/render_perfil.mjs
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
GlobalFonts.registerFromPath('C:/Windows/Fonts/ariblk.ttf', 'ABK');
const T = 1080, cv = createCanvas(T, T), ctx = cv.getContext('2d'), c = T / 2;

// fondo azul marca con brillo naranja
const g = ctx.createRadialGradient(c, c * 0.8, 50, c, c, T * 0.75);
g.addColorStop(0, '#1E2858'); g.addColorStop(1, '#0A0F24');
ctx.fillStyle = g; ctx.fillRect(0, 0, T, T);

// aro de luz
ctx.save(); ctx.shadowColor = 'rgba(255,106,0,0.85)'; ctx.shadowBlur = 90;
ctx.fillStyle = '#FF6A00'; ctx.beginPath(); ctx.arc(c, c, 360, 0, Math.PI * 2); ctx.fill(); ctx.restore();
const n = ctx.createLinearGradient(c - 360, c - 360, c + 360, c + 360);
n.addColorStop(0, '#FF8A2B'); n.addColorStop(1, '#F25500');
ctx.fillStyle = n; ctx.beginPath(); ctx.arc(c, c, 360, 0, Math.PI * 2); ctx.fill();

// el 5
ctx.save(); ctx.shadowColor = 'rgba(80,20,0,0.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14;
ctx.fillStyle = '#FFFFFF'; ctx.font = '560px ABK'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
ctx.fillText('5', c - 10, c + 30); ctx.restore();

// etiqueta de precio amarilla con €
ctx.save(); ctx.translate(c + 250, c + 235); ctx.rotate(-0.35);
ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 25; ctx.shadowOffsetY = 10;
ctx.fillStyle = '#FFC93C';
ctx.beginPath(); ctx.moveTo(-95, -70); ctx.lineTo(60, -70); ctx.lineTo(125, 0); ctx.lineTo(60, 70); ctx.lineTo(-95, 70);
ctx.arcTo(-125, 70, -125, 40, 30); ctx.lineTo(-125, -40); ctx.arcTo(-125, -70, -95, -70, 30); ctx.closePath(); ctx.fill();
ctx.shadowColor = 'transparent';
ctx.fillStyle = '#0A0F24'; ctx.beginPath(); ctx.arc(70, 0, 15, 0, Math.PI * 2); ctx.fill();
ctx.font = '110px ABK'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('€', -30, 8);
ctx.restore();

const out = path.join(RAIZ, 'perfil'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'foto_perfil.jpg'), cv.toBuffer('image/jpeg', 95));
// vista previa en pequeño y en círculo, como se ve en Instagram
const p = createCanvas(220, 220), pc = p.getContext('2d');
pc.fillStyle = '#fff'; pc.fillRect(0, 0, 220, 220);
pc.save(); pc.beginPath(); pc.arc(110, 110, 100, 0, Math.PI * 2); pc.clip(); pc.drawImage(cv, 10, 10, 200, 200); pc.restore();
fs.writeFileSync(path.join(out, 'vista_previa_circulo.png'), p.toBuffer('image/png'));
console.log('OK', out);
