#!/usr/bin/env bash
# FoodIX - Agente de impresion local (macOS / Linux)
# Ejecuta:  ./iniciar-agente.sh   (o doble clic en algunos entornos)

cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "  [ERROR] No se encontro Node.js."
  echo "  Instalalo desde https://nodejs.org (version LTS) y vuelve a intentar."
  echo
  exit 1
fi

exec node agent.js
