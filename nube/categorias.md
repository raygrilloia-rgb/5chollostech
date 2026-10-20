# Categorías para los Top 5 (rotación)

Cada post trata **una sola categoría** y lleva un tope de precio en el título. La rutina de producción elige la que lleve más tiempo sin usarse (mira `episodios/*.json`) y tiene en cuenta las ideas de `comentarios/ideas.md`. No hay que repetir categoría en menos de 10 posts ni repetir productos ya publicados en los últimos 30 días.

| Categoría | Cómo buscar en Amazon (lector del workbench) | Tope de precio orientativo |
|---|---|---|
| Smartwatch y pulseras | `mas_vendidos("3457446031")` | 50 / 70 € |
| Auriculares inalámbricos | `buscar("auriculares inalambricos bluetooth")` y `buscar("auriculares cancelacion de ruido")` | 30 / 50 € |
| Auriculares de diadema | `buscar("auriculares diadema bluetooth")` | 40 / 60 € |
| Auriculares gaming | `buscar("auriculares gaming")` | 40 € |
| Altavoces Bluetooth | `buscar("altavoz bluetooth portatil")` y `buscar("altavoz bluetooth jbl")` | 50 / 80 € |
| Power banks | `buscar("power bank")` | 30 € |
| Cargadores rápidos | `buscar("cargador usb c 65w")` | 30 € |
| Cámaras de vigilancia WiFi | `mas_vendidos("930858031")` | 40 € |
| Accesorios de coche (soportes, cargadores, CarPlay) | `mas_vendidos("1461677031")` | 25 € |
| Streaming y TV (Fire TV, Chromecast…) | `mas_vendidos("934250031")` | 60 € |
| Ratones y teclados | `buscar("raton inalambrico")` y `buscar("teclado inalambrico")` | 30 € |
| Almacenamiento (microSD, pendrives, SSD) | `mas_vendidos("17478027031")` | 40 € |
| Hogar inteligente (enchufes, bombillas) | `buscar("enchufe inteligente wifi")` y `buscar("bombilla inteligente")` | 25 € |
| Proyectores portátiles | `mas_vendidos("934343031")` | 100 € |
| Cámaras deportivas y gimbals | `mas_vendidos("2929854031")` y `buscar("estabilizador movil gimbal")` | 100 € |
| Regalos tech (temporada: Navidad, Black Friday) | mezcla de los más vendidos con un tema | 20 / 30 € |

## Marcas con web oficial accesible desde la nube (fotos)
Funcionan bien: Xiaomi (mi.com), Huawei (consumer.huawei.com), Anker / Soundcore (anker.com), TP-Link / Tapo (tapo.com, static.tp-link.com), INIU (iniushop.com), Samsung (images.samsung.com), UGREEN, Baseus, Logitech, SanDisk.

Bloquean las descargas directas (403): JBL (jbl.com) y Sony (sony.es). Para esas marcas, prueba a descargar la foto desde el workbench de Composio (`requests` + `upload_local_file`). Si tampoco funciona, elige otro producto.
