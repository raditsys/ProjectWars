# Free Firebase backup every 10 minutes (GitHub Actions)

This repository includes an automated backup flow that runs every 10 minutes using GitHub Actions and stores compressed snapshots in `backups/`.

## Why this is free

- No paid Firebase extensions required.
- No Google Cloud Scheduler required.
- Uses a normal GitHub Actions scheduled workflow (`*/10 * * * *`).

> Note: GitHub cron is best-effort and may occasionally run late.

## What gets backed up

- **Cloud Firestore**: recursively exports all collections and subcollections.
- **Realtime Database** (optional): exports the full root path when `FIREBASE_DATABASE_URL` is provided.
- **Metadata**: timestamp and basic counts.

Each run writes:

- `backups/<timestamp>/firestore.json.gz`
- `backups/<timestamp>/rtdb.json.gz` (only if RTDB URL secret is set)
- `backups/<timestamp>/metadata.json.gz`

The workflow keeps the latest **144** backup folders (~24 hours at 10-minute intervals).

## Setup

1. Create a Firebase service account with read access to Firestore and/or RTDB.
2. In GitHub repo **Settings → Secrets and variables → Actions**, add:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` (Name) with full service account JSON in Secret value.
   - `FIREBASE_DATABASE_URL` (Name) with RTDB URL in Secret value (optional for Firestore-only).
3. Push this branch and enable GitHub Actions.
4. Optionally run once manually from **Actions → Firebase backup → Run workflow**.

## Restore strategy

- Download and unzip a backup file.
- Write a restore script for your target DB (Firestore vs RTDB) using `firebase-admin`.
- Test restores in a staging Firebase project first.

## Troubleshooting

- If GitHub Actions reports `Dependencies lock file is not found`, ensure npm cache is not enabled in `actions/setup-node` unless you commit a lockfile.
