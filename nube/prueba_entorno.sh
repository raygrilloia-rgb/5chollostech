#!/usr/bin/env bash
# Prueba qué funciona en la nube: dependencias, render de slides y vídeo, voz, y acceso a Amazon / fabricantes.
set -u
cd "$(dirname "$0")/.."
echo "== node $(node -v) / npm $(npm -v)"
bash nube/descargar_musica.sh | tail -3
npm ci --silent >/tmp/npm.log 2>&1 && echo "npm ci OK" || { echo "npm ci FALLO"; tail -20 /tmp/npm.log; }
node -e "const p=require('ffmpeg-static');console.log('ffmpeg-static', p, require('fs').existsSync(p))"
node -e "const fs=require('fs');const e=JSON.parse(fs.readFileSync('episodios/2026-10-21_smartwatch-menos-70.json','utf8'));e.slug='zz_prueba';fs.writeFileSync('/tmp/zz.json',JSON.stringify(e))"
cp /tmp/zz.json episodios/zz_prueba.json
node plantilla/render_carrusel.mjs episodios/zz_prueba.json >/tmp/c.log 2>&1 && echo "CARRUSEL OK" || { echo "CARRUSEL FALLO"; tail -5 /tmp/c.log; }
timeout 600 node plantilla/render_reel.mjs episodios/zz_prueba.json >/tmp/r.log 2>&1 && echo "REEL OK: $(tail -1 /tmp/r.log)" || { echo "REEL FALLO"; tail -8 /tmp/r.log; }
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
for u in "https://www.amazon.es/gp/bestsellers/electronics/3457446031" "https://www.amazon.es/dp/B0DYF82545" "https://www.amazon.es/s?k=altavoz+bluetooth"; do
  code=$(curl -s -o /tmp/a.html -w "%{http_code}" -A "$UA" -H "Accept-Language: es-ES,es;q=0.9" "$u"); n=$(grep -o 'gridItemRoot\|productTitle\|s-search-result' /tmp/a.html | wc -l); cap=$(grep -ci 'captcha' /tmp/a.html); echo "AMAZON $code marcadores=$n captcha=$cap $u"; done
for u in "https://www.mi.com/es/product/xiaomi-smart-band-10/" "https://www.jbl.com/GO-5.html" "https://consumer.huawei.com/es/wearables/band10/" "https://www.anker.com/eu-de/products/a2667" "https://www.sony.es/headphones/products/wh-ch520"; do
  echo "FABRICANTE $(curl -s -o /dev/null -w "%{http_code}" -A "$UA" "$u") $u"; done
rm -rf episodios/zz_prueba.json salida/zz_prueba
