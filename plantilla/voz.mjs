// Genera una locución con las voces neuronales de Microsoft Edge (gratis, sin cuenta).
// Uso: node plantilla/voz.mjs "<texto>" <salida.mp3> [voz] [velocidad] [tono]
// Voces de España: es-ES-AlvaroNeural (hombre), es-ES-ElviraNeural (mujer), es-ES-XimenaNeural (mujer).
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import fs from 'node:fs';
import path from 'node:path';

const [texto, salida, voz = 'es-ES-AlvaroNeural', velocidad = '+15%', tono = '+4Hz'] = process.argv.slice(2);
if (!texto || !salida) { console.error('Uso: node plantilla/voz.mjs "<texto>" <salida.mp3> [voz] [velocidad]'); process.exit(1); }

const tts = new MsEdgeTTS();
await tts.setMetadata(voz, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
const dir = path.dirname(path.resolve(salida));
fs.mkdirSync(dir, { recursive: true });
const { audioFilePath } = await tts.toFile(dir, texto, { rate: velocidad, pitch: tono });
fs.renameSync(audioFilePath, path.resolve(salida));
tts.close();
console.log('OK', salida);
