# Project Wars

## Automated Firebase backup (every 10 minutes)

This repo now includes a zero-maintenance backup workflow for your Firebase Realtime Database.

### What it does
- Runs automatically every 10 minutes via GitHub Actions (`.github/workflows/firebase-backup.yml`).
- Downloads the full database JSON snapshot.
- Saves two files in `backups/firebase/`:
  - `latest.json` (always the newest snapshot)
  - `backup-YYYY-MM-DDTHH-MM-SSZ.json` (timestamped archive)
- Auto-commits and pushes backup changes to this repository.
- Keeps only the latest 432 timestamped files (~3 days) to prevent unbounded growth.

### Why this is “free” and no-setup
- Uses GitHub Actions + the repository’s built-in `GITHUB_TOKEN`.
- No server, cron VM, or local machine setup needed.
- If your Firebase DB allows read access already, it works as-is.

### Optional (only if your DB becomes locked)
If you later require auth for reads, add a repository secret:
- Name: `FIREBASE_DATABASE_SECRET`
- Value: your Firebase database secret/token

No code changes are needed; the same workflow will start using it automatically.
