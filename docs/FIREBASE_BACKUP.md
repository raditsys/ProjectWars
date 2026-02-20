# Free Firebase Realtime Database backups every 10 minutes

This repository includes a GitHub Actions workflow that backs up your entire Firebase Realtime Database every 10 minutes for free.

## What it does

- Runs on `*/10 * * * *` via GitHub Actions.
- Authenticates with a Firebase service account (no interactive login required).
- Downloads the full RTDB export (`/.json?format=export`).
- Compresses backup files as `*.json.gz`.
- Generates a SHA256 checksum per backup.
- Uploads backups as a workflow artifact retained for 7 days.

## One-time setup

1. In Firebase Console, create (or reuse) a **service account** with read access to Realtime Database.
2. Generate a JSON key for that service account.
3. In your GitHub repo, add these Actions secrets:
   - `FIREBASE_DATABASE_URL` (example: `https://projectwars-60a92-default-rtdb.firebaseio.com`)
   - `FIREBASE_CLIENT_EMAIL` (from service account key `client_email`)
   - `FIREBASE_PRIVATE_KEY` (from service account key `private_key`, including line breaks)
4. Enable Actions in the repository.

## Run manually

Use **Actions → Firebase RTDB Backup → Run workflow** to verify setup before waiting for the 10-minute schedule.

## Restore guide (quick)

1. Download the artifact from a successful run.
2. Decompress:

   ```bash
   gunzip firebase-rtdb-YYYY-MM-DDTHH-MM-SS-sssZ.json.gz
   ```

3. Restore using Firebase CLI (replace URL):

   ```bash
   firebase database:set / firebase-rtdb-YYYY-MM-DDTHH-MM-SS-sssZ.json --project <your-project-id>
   ```

## Cost and limits notes

- GitHub Actions scheduled runs are free for public repos (and quota-limited for private repos).
- Artifact retention is set to 7 days to avoid storage growth.
- If you need long-term retention, forward the `backups/` directory to external object storage.
