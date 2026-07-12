#!/usr/bin/env bash
set -euo pipefail

STAMP="$(date -u +%Y%m%d%H%M%S)"
BACKUP_ROOT="${BACKUP_ROOT:-/root/backups/yougame-manual-${STAMP}}"
DB_PATH="${YOUGAME_DB_PATH:-/root/my_game/data/game.db}"
MEDIA_DIR="${YOUGAME_MEDIA_DIR:-/root/my_game/data/media}"

mkdir -p "$BACKUP_ROOT"

if [[ ! -f "$DB_PATH" ]]; then
  echo "Database not found: $DB_PATH" >&2
  exit 1
fi

sqlite3 "$DB_PATH" ".backup '$BACKUP_ROOT/game.db'"

if [[ -d "$MEDIA_DIR" ]]; then
  tar -C "$(dirname "$MEDIA_DIR")" -czf "$BACKUP_ROOT/media.tgz" "$(basename "$MEDIA_DIR")"
fi

cat > "$BACKUP_ROOT/manifest.txt" <<EOF
created_at_utc=$STAMP
db_path=$DB_PATH
media_dir=$MEDIA_DIR
EOF

echo "$BACKUP_ROOT"
