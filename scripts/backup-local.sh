#!/usr/bin/env bash
# Local backup outside Git: database dump + upload folders + brand-assets, with checksums.
# Usage (from the project root, Postgres running): bash scripts/backup-local.sh [target-root]
# Default target: ../drphynex-backups/<timestamp>. Never prints credentials.
set -euo pipefail
root="${1:-../drphynex-backups}"
dest="$root/$(date +%Y-%m-%d_%H%M)"
mkdir -p "$dest"
docker exec drphynex-postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$dest/drphynex-db.dump"
for dir in media private-uploads brand-assets; do
  if [ -d "$dir" ]; then cp -r "$dir" "$dest/$dir"; fi
done
( cd "$dest" && find . -type f ! -name drphynex-db.dump ! -name files.sha256 -print0 | sort -z | xargs -0 -r sha256sum > files.sha256 )
# Quick integrity check of the dump without restoring it.
docker exec -i drphynex-postgres pg_restore --list < "$dest/drphynex-db.dump" > /dev/null
echo "Backup written to $dest"
