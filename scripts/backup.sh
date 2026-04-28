#!/usr/bin/env bash
# ── CPR Sales Tracker — Local Database Backup Script ─────────────────────────
# Usage:   bash scripts/backup.sh
# Cron:    0 2 * * * bash /path/to/CPR-Sales-Tracker/scripts/backup.sh
#
# Creates a timestamped copy of the SQLite database in ./backups/
# Keeps only the 30 most recent backups automatically.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DB_FILE="${DB_PATH:-$PROJECT_DIR/cpr_sales.db}"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
DEST="$BACKUP_DIR/cpr_backup_${TIMESTAMP}.db"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_FILE" ]; then
  echo "ERROR: Database not found at $DB_FILE"
  exit 1
fi

# Use sqlite3 .backup command if available — this is WAL-safe
if command -v sqlite3 &>/dev/null; then
  sqlite3 "$DB_FILE" ".backup '$DEST'"
else
  # Fallback: simple copy (safe when server is not writing at this exact moment)
  cp "$DB_FILE" "$DEST"
fi

SIZE=$(du -sh "$DEST" | cut -f1)
echo "✅  Backup saved: $DEST ($SIZE)"

# Keep only the 30 most recent backups
cd "$BACKUP_DIR"
ls -1t cpr_backup_*.db 2>/dev/null | tail -n +31 | xargs -r rm --
KEPT=$(ls -1 cpr_backup_*.db 2>/dev/null | wc -l)
echo "    $KEPT backup(s) kept in $BACKUP_DIR"
