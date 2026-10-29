#!/usr/bin/env bash
# Runs the production build against the separate acceptance database (drphynex_acceptance) on port 3002.
# The connection string is derived from .env at runtime and never printed or written to disk.
set -euo pipefail
url="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '\r')"
export DATABASE_URL="$(printf '%s' "$url" | sed -E 's#/([^/?]+)(\?|$)#/drphynex_acceptance\2#')"
case "$DATABASE_URL" in *"/drphynex_acceptance"*) ;; *) echo "refusing: not the acceptance database" >&2; exit 1 ;; esac
exec npx next start -p "${PORT:-3002}"
