#!/usr/bin/env node
import { createSign, createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const required = [
  'FIREBASE_DATABASE_URL',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
];

for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`Missing required env var: ${name}`);
  }
}

const databaseUrl = process.env.FIREBASE_DATABASE_URL.replace(/\/$/, '');
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
const backupDir = process.env.BACKUP_DIR || 'backups';
const keepCount = Number(process.env.BACKUP_KEEP || '1008'); // 7 days @ every 10 min

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const baseName = `firebase-rtdb-${timestamp}`;

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
  };

  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey, 'base64url');
  const jwt = `${unsigned}.${signature}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch access token (${response.status}): ${body}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function fetchBackup(token) {
  const endpoint = `${databaseUrl}/.json?format=export&access_token=${encodeURIComponent(token)}`;
  const response = await fetch(endpoint);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch database (${response.status}): ${body}`);
  }
  return response.text();
}

async function pruneOldBackups(dir, keep) {
  if (keep <= 0) return;

  const files = await fs.readdir(dir);
  const candidates = files
    .filter((name) => name.startsWith('firebase-rtdb-') && name.endsWith('.json.gz'))
    .sort();

  const deleteCount = Math.max(0, candidates.length - keep);
  await Promise.all(
    candidates.slice(0, deleteCount).map((name) => fs.unlink(path.join(dir, name)))
  );
}

async function main() {
  await fs.mkdir(backupDir, { recursive: true });

  const token = await getAccessToken();
  const json = await fetchBackup(token);
  const buffer = gzipSync(json);

  const filePath = path.join(backupDir, `${baseName}.json.gz`);
  await fs.writeFile(filePath, buffer);

  const sha256 = createHash('sha256').update(buffer).digest('hex');
  await fs.writeFile(`${filePath}.sha256`, `${sha256}  ${path.basename(filePath)}\n`);

  await pruneOldBackups(backupDir, keepCount);

  console.log(`Created backup: ${filePath}`);
  console.log(`SHA256: ${sha256}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
