#!/usr/bin/env bash
# RestaurOS — corre las migraciones del roadmap omnicanal (35-40) contra la
# base de datos indicada, en orden.
#
# Todas son idempotentes (usan INFORMATION_SCHEMA antes de cada ALTER y
# CREATE TABLE IF NOT EXISTS), así que correr este script dos veces no rompe
# nada — las que ya se aplicaron simplemente se saltan sin duplicar nada.
#
# Uso:
#   DB_HOST=localhost DB_NAME=tallerch_restauros DB_USER=... DB_PASS=... \
#     ./php-backend/migrations/run-pending.sh
#
#   (o exporta esas 4 variables antes, o pásalas inline como arriba)
#
# Con --dry-run solo muestra qué se ejecutaría, sin tocar la base de datos.

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FILES=(
  "$DIR/35-inventory-warehouses-units.sql"
  "$DIR/36-recipe-costing-waste.sql"
  "$DIR/37-purchases-partial-transfers.sql"
  "$DIR/38-delivery-zones-tracking.sql"
  "$DIR/39-crm-loyalty-ledger-reviews.sql"
  "$DIR/40-station-item-delivered.sql"
)

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
fi

for f in "${FILES[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "✗ No se encontró $f" >&2
    exit 1
  fi
done

echo "Migraciones a aplicar:"
for f in "${FILES[@]}"; do echo "  - $(basename "$f")"; done
echo

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "(--dry-run: no se ejecuta nada, no se requieren credenciales)"
  exit 0
fi

: "${DB_HOST:?Falta DB_HOST — export DB_HOST=... o pásalo inline}"
: "${DB_NAME:?Falta DB_NAME — export DB_NAME=... o pásalo inline}"
: "${DB_USER:?Falta DB_USER — export DB_USER=... o pásalo inline}"
: "${DB_PASS:?Falta DB_PASS — export DB_PASS=... o pásalo inline}"

echo "Base de datos: ${DB_USER}@${DB_HOST}/${DB_NAME}"
read -r -p "¿Continuar y aplicar estas migraciones? [s/N] " CONFIRM
if [[ ! "$CONFIRM" =~ ^[sS]$ ]]; then
  echo "Cancelado."
  exit 1
fi

for f in "${FILES[@]}"; do
  echo "→ Aplicando $(basename "$f")…"
  mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$f"
  echo "  ✓ listo"
done

echo
echo "Migraciones 35-40 aplicadas correctamente."
