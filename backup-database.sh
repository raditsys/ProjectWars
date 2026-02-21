#!/usr/bin/env bash
set -euo pipefail

DB_URL="${DB_URL:-https://projectwars-60a92-default-rtdb.firebaseio.com}"
BACKUP_DIR="${1:-backups}"
AUTH_TOKEN="${FIREBASE_AUTH_TOKEN:-}"
TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
OUT_FILE="$BACKUP_DIR/firebase-backup-$TIMESTAMP.json"

mkdir -p "$BACKUP_DIR"

TMP_FILE="$(mktemp)"
cleanup() {
  rm -f "$TMP_FILE"
}
trap cleanup EXIT

URL="$DB_URL/.json?print=pretty"
if [ -n "$AUTH_TOKEN" ]; then
  URL="$URL&auth=$AUTH_TOKEN"
fi

echo "Creating Firebase backup from: $DB_URL"
set +e
HTTP_CODE="$(curl -sS -w "%{http_code}" "$URL" -o "$TMP_FILE")"
CURL_EXIT=$?
set -e

if [ "$CURL_EXIT" -ne 0 ]; then
  echo "Backup failed: curl could not reach Firebase (exit $CURL_EXIT)." >&2
  echo "If you are behind a proxy/firewall, retry from your local machine shell." >&2
  exit 1
fi

if [ "$HTTP_CODE" != "200" ]; then
  echo "Backup failed (HTTP $HTTP_CODE)." >&2
  if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    echo "Tip: export FIREBASE_AUTH_TOKEN=<your token> and run again." >&2
  fi
  exit 1
fi

if [ ! -s "$TMP_FILE" ]; then
  echo "Backup failed: Firebase response was empty." >&2
  exit 1
fi

mv "$TMP_FILE" "$OUT_FILE"
BYTES="$(wc -c < "$OUT_FILE")"

echo "Backup complete: $OUT_FILE ($BYTES bytes)"
