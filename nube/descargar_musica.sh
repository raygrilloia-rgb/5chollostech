#!/usr/bin/env bash
# Descarga las pistas de Pixabay (licencia Pixabay: se usan en los vídeos, pero no se redistribuyen en el repo).
cd "$(dirname "$0")/../musica"
while read -r nombre url; do
  [ -z "$nombre" ] && continue
  [ -s "$nombre" ] || curl -sSL -A "Mozilla/5.0" -e "https://pixabay.com/" -o "$nombre" "$url"
  echo "$nombre $(stat -c %s "$nombre" 2>/dev/null || echo 0) bytes"
done < pistas.txt
