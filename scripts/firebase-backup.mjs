import admin from 'firebase-admin';
import { gzipSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function getCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON secret.');
  }

  return admin.credential.cert(JSON.parse(raw));
}

async function dumpDocument(docRef) {
  const snapshot = await docRef.get();
  const data = snapshot.exists ? snapshot.data() : null;
  const children = {};

  for (const subCollection of await docRef.listCollections()) {
    children[subCollection.id] = await dumpCollection(subCollection);
  }

  return {
    id: docRef.id,
    path: docRef.path,
    data,
    subcollections: children
  };
}

async function dumpCollection(collectionRef) {
  const docs = await collectionRef.listDocuments();
  const output = {};

  for (const docRef of docs) {
    output[docRef.id] = await dumpDocument(docRef);
  }

  return output;
}

async function dumpFirestore(db) {
  const result = {};

  for (const collectionRef of await db.listCollections()) {
    result[collectionRef.id] = await dumpCollection(collectionRef);
  }

  return result;
}

function ensureOutputDir() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = join('backups', timestamp);

  mkdirSync(outputDir, { recursive: true });
  return outputDir;
}

function writeJsonGz(outputDir, name, content) {
  const pretty = JSON.stringify(content, null, 2);
  const gz = gzipSync(pretty);
  writeFileSync(join(outputDir, `${name}.json.gz`), gz);
}

async function main() {
  const app = admin.initializeApp({
    credential: getCredential(),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });

  const outputDir = ensureOutputDir();

  const firestoreDump = await dumpFirestore(admin.firestore(app));
  writeJsonGz(outputDir, 'firestore', firestoreDump);

  const dbUrl = process.env.FIREBASE_DATABASE_URL;
  if (dbUrl) {
    const rtdb = await admin.database(app).ref('/').once('value');
    writeJsonGz(outputDir, 'rtdb', rtdb.val());
  }

  const metadata = {
    generatedAt: new Date().toISOString(),
    firestoreCollections: Object.keys(firestoreDump).length,
    rtdbIncluded: Boolean(dbUrl)
  };

  writeJsonGz(outputDir, 'metadata', metadata);
  app.delete();

  console.log(`Backup complete: ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
