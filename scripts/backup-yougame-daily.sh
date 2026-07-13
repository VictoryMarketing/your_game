#!/usr/bin/env bash
set -euo pipefail

STAMP="$(date -u +%Y%m%d-%H%M%S)"
BASE="${YOUGAME_BACKUP_DIR:-/root/backups/yougame}"
export BACKUP_ROOT="$BASE/daily-$STAMP"

/root/your_game/scripts/backup-yougame.sh

# Daily copies are retained for two weeks. Manual backups elsewhere are untouched.
find "$BASE" -mindepth 1 -maxdepth 1 -type d -name 'daily-*' -mtime +14 -print -exec rm -rf -- {} +
