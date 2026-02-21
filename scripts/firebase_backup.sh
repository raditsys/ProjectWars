#!/usr/bin/env bash
set -euo pipefail

DATABASE_URL="${FIREBASE_DATABASE_URL:-https://projectwars-60a92-default-rtdb.firebaseio.com}"
AUTH_QUERY=""

if [[ -n "${FIREBASE_DATABASE_SECRET:-}" ]]; then
  AUTH_QUERY="?auth=${FIREBASE_DATABASE_SECRET}"
fi

timestamp="$(date -u +"%Y-%m-%dT%H-%M-%SZ")"
backup_dir="backups/firebase"
mkdir -p "$backup_dir"

tmp_json="$(mktemp)"

curl --fail --silent --show-error \
  "${DATABASE_URL}/.json${AUTH_QUERY}" \
  -o "$tmp_json"

python - "$tmp_json" <<'PY'
import json
import sys
path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)
with open(path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False, sort_keys=True)
    f.write('\n')
PY

latest_file="${backup_dir}/latest.json"
versioned_file="${backup_dir}/backup-${timestamp}.json"

cp "$tmp_json" "$latest_file"
cp "$tmp_json" "$versioned_file"
rm -f "$tmp_json"

# Keep the most recent 432 backups (~3 days at 10-minute intervals) to avoid unbounded growth.
ls -1t "$backup_dir"/backup-*.json 2>/dev/null | tail -n +433 | xargs -r rm -f

echo "Saved backup to ${versioned_file}"
