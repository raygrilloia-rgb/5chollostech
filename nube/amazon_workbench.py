# Lector de Amazon España para el COMPOSIO_REMOTE_WORKBENCH (allí Amazon sí responde; desde la nube de Claude, no).
# Uso dentro del workbench: pega este archivo en una celda y luego llama a las funciones.
#   mas_vendidos("3457446031", paginas=2) -> lista de {rank, asin, titulo, precio, rating, resenas}
#   subcategorias("665477031")            -> lista de (nombre, nodo)
#   buscar("altavoz bluetooth jbl")       -> lista de resultados (sin patrocinados)
#   ficha("B0DYF82545")                   -> {titulo, marca, precio, vendido_por_amazon, rating, resenas, color, variantes, ventajas}
import re, json, time, requests
from html import unescape

_H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
      "Accept-Language": "es-ES,es;q=0.9", "Accept": "text/html,application/xhtml+xml"}
_S = requests.Session()

def _get(url):
    # Amazon corta la conexión o pide captcha si se le piden muchas páginas seguidas:
    # se espera, se cambia de sesión y se reintenta. Entre página y página hay siempre una pausa.
    global _S
    ultimo = None
    for i in range(5):
        try:
            r = _S.get(url, headers=_H, timeout=25)
            if r.status_code == 200 and "captcha" not in r.text.lower()[:20000]:
                time.sleep(1.5)
                return r.text
            ultimo = r.status_code
        except requests.RequestException as e:
            ultimo = str(e)[:80]
        _S = requests.Session()
        time.sleep([4, 10, 20, 40, 60][i])
    raise RuntimeError(f"Amazon no respondió bien: {url} ({ultimo})")

def _txt(s):
    return re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()

def mas_vendidos(nodo, paginas=2):
    out = []
    for pg in range(1, paginas + 1):
        h = _get(f"https://www.amazon.es/gp/bestsellers/electronics/{nodo}?pg={pg}")
        for bloque in h.split('id="gridItemRoot"')[1:]:
            b = bloque[:6000]
            asin = (re.search(r"/dp/([A-Z0-9]{10})", b) or [None, None])[1]
            rank = (re.search(r"#(\d+)", b) or [None, None])[1]
            titulo = (re.search(r'alt="([^"]+)"', b) or [None, ""])[1]
            precio = (re.search(r"(\d{1,4},\d{2})\s*€", _txt(b)) or [None, None])[1]
            rating = (re.search(r"(\d,\d) de 5 estrellas", b) or [None, None])[1]
            resenas = (re.search(r"estrellas[^<]*</span></i>\s*<span[^>]*>([\d\.]+)<", b) or re.search(r'aria-label="([\d\.]+) valoraciones', b) or [None, None])[1]
            if asin:
                out.append({"rank": int(rank) if rank else None, "asin": asin, "titulo": unescape(titulo)[:140], "precio": precio, "rating": rating, "resenas": resenas})
    return out

def subcategorias(nodo, raiz="electronics"):
    h = _get(f"https://www.amazon.es/gp/bestsellers/{raiz}/{nodo}" if nodo else f"https://www.amazon.es/gp/bestsellers/{raiz}")
    vistos, out = set(), []
    for href, nombre in re.findall(r'href="(/gp/bestsellers/' + raiz + r'/\d+)[^"]*"[^>]*>([^<]+)<', h):
        n = href.rsplit("/", 1)[1]
        if n not in vistos and n != nodo:
            vistos.add(n); out.append((_txt(nombre), n))
    return out

def buscar(q):
    h = _get("https://www.amazon.es/s?k=" + requests.utils.quote(q))
    out = []
    for b in h.split('data-component-type="s-search-result"')[1:]:
        b = b[:8000]
        if re.search(r"Patrocinado|sponsored", b[:3000], re.I):
            continue
        asin = (re.search(r'data-asin="([A-Z0-9]{10})"', b) or re.search(r"/dp/([A-Z0-9]{10})", b) or [None, None])[1]
        titulo = _txt((re.search(r"<h2[^>]*>(.*?)</h2>", b, re.S) or [None, ""])[1])
        precio = (re.search(r'a-offscreen">([\d\.]+,\d{2})', b) or [None, None])[1]
        rating = (re.search(r"(\d,\d) de 5 estrellas", b) or [None, None])[1]
        out.append({"asin": asin, "titulo": titulo[:140], "precio": precio, "rating": rating})
    return out[:15]

def ficha(asin):
    h = _get(f"https://www.amazon.es/dp/{asin}")
    g = lambda pat, flags=0: (re.search(pat, h, flags) or [None, None])[1]
    titulo = _txt(g(r'id="productTitle"[^>]*>(.*?)</span>', re.S))
    marca = _txt(g(r'id="bylineInfo"[^>]*>(.*?)</a>', re.S))
    # A los robots Amazon no les pinta el precio en la ficha: el precio fiable sale de mas_vendidos() o buscar().
    i = h.find('id="corePriceDisplay_desktop_feature_div"')
    precio = (re.search(r'a-offscreen">\s*([\d\.]+,\d{2})\s*€', h[i:i + 6000]) or [None, None])[1] if i >= 0 else None
    k = h.find('offer-display-feature')
    zona = _txt(h[k - 200:k + 4000]) if k >= 0 else ""
    vendedor = (re.search(r"Vendedor\s+([^\s<]+(?: [^\s<]+)?)", zona) or re.search(r"Vendido por\s+([^\s<]+(?: [^\s<]+)?)", zona) or [None, ""])[1]
    envio = (re.search(r"Remitente(?: / Vendedor)?\s+([^\s<]+)", zona) or [None, ""])[1]
    rating = g(r'id="acrPopover"[^>]*title="([^"]+)"')
    resenas = _txt(g(r'id="acrCustomerReviewText"[^>]*>(.*?)<'))
    color = _txt(g(r'id="variation_color_name".*?class="selection">(.*?)<', re.S) or g(r'id="inline-twister-expanded-dimension-text-color_name"[^>]*>(.*?)<', re.S) or "")
    var = g(r'"dimensionValuesDisplayData"\s*:\s*(\{[^}]*\})')
    ventajas = [_txt(x)[:180] for x in re.findall(r'<li[^>]*>\s*<span class="a-list-item">(.*?)</span>\s*</li>', g(r'id="feature-bullets"(.*?)</ul>', re.S) or "", re.S)][:6]
    return {"asin": asin, "titulo": titulo[:160], "marca": marca, "precio": precio,
            "vendido_por_amazon": vendedor.startswith("Amazon"), "enviado_por_amazon": envio.startswith("Amazon"),
            "vendedor": vendedor[:60], "rating": rating, "resenas": resenas.strip("()"), "color": color,
            "variantes": json.loads(var) if var else {}, "ventajas": ventajas}
