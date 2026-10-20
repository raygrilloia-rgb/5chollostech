// Servidor local para previsualizar docs/ en http://localhost:4321
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.png': 'image/png' };

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel.endsWith('/')) rel += 'index.html';
  const f = path.join(WEB, rel);
  if (!f.startsWith(WEB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('No encontrado'); }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(4321, () => console.log('Web en http://localhost:4321'));
