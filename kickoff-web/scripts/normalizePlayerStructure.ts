import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PLAYERS_COLLECTION = 'players';
const BACKFILL_LEAGUE_ID = 'MWFePlubN1q0O5WH0Ih3';
const EXPECTED_MISSING_LEAGUE_ID = 4;
const EXPECTED_MISSING_DELETED_AT = 4;
const FLAGGED_DELETED_AT_TIMESTAMP_DOC_ID = 'pYKpLlDl8rVu7CXCkAF7';
const BATCH_LIMIT = 400;

type AuditResult = {
  totalDocs: number;
  missingLeagueIdDocs: FirebaseFirestore.QueryDocumentSnapshot[];
  missingDeletedAtDocs: FirebaseFirestore.QueryDocumentSnapshot[];
  flaggedDoc: FirebaseFirestore.DocumentSnapshot | null;
};

// Load credentials from .env, matching the project's existing backfill scripts.
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envText = fs.readFileSync(envPath, 'utf8');
  for (const line of envText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const k = trimmed.slice(0, eqIdx).trim();
    let v = trimmed.slice(eqIdx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) {
      process.env[k] = v;
    }
  }
}

const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || '';
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';

if (!rawKey || !clientEmail || !projectId) {
  console.error('Missing Firebase Admin credentials in .env');
  process.exit(1);
}

const privateKey = rawKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');

const app = getApps().length > 0 ? getApps()[0] : initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
});
const db = getFirestore(app);

const isApply = process.argv.includes('--apply');

async function auditPlayers(): Promise<AuditResult> {
  const snap = await db.collection(PLAYERS_COLLECTION).get();
  const missingLeagueIdDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  const missingDeletedAtDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.leagueId === undefined) missingLeagueIdDocs.push(doc);
    if (data.deletedAt === undefined) missingDeletedAtDocs.push(doc);
  }

  const flaggedDoc = await db.collection(PLAYERS_COLLECTION)
    .doc(FLAGGED_DELETED_AT_TIMESTAMP_DOC_ID)
    .get();

  return {
    totalDocs: snap.size,
    missingLeagueIdDocs,
    missingDeletedAtDocs,
    flaggedDoc: flaggedDoc.exists ? flaggedDoc : null,
  };
}

function formatDocIds(docs: FirebaseFirestore.DocumentSnapshot[]): string {
  return docs.length > 0 ? docs.map((doc) => doc.id).join(', ') : 'none';
}

function printAudit(audit: AuditResult): boolean {
  const missingLeagueIdCount = audit.missingLeagueIdDocs.length;
  const missingDeletedAtCount = audit.missingDeletedAtDocs.length;
  const countsMatch =
    missingLeagueIdCount === EXPECTED_MISSING_LEAGUE_ID &&
    missingDeletedAtCount === EXPECTED_MISSING_DELETED_AT;

  console.log('--- AUDIT PHASE ---');
  console.log(`Total player documents read: ${audit.totalDocs}`);
  console.log(`Missing leagueId: ${missingLeagueIdCount} docs (expected ${EXPECTED_MISSING_LEAGUE_ID})`);
  console.log(`Missing deletedAt: ${missingDeletedAtCount} docs (expected ${EXPECTED_MISSING_DELETED_AT})`);
  console.log(`Missing leagueId doc IDs: ${formatDocIds(audit.missingLeagueIdDocs)}`);
  console.log(`Missing deletedAt doc IDs: ${formatDocIds(audit.missingDeletedAtDocs)}`);
  console.log('');

  const flaggedData = audit.flaggedDoc?.data();
  console.log('Manual decision flag:');
  if (!audit.flaggedDoc || !flaggedData) {
    console.log(`  ${FLAGGED_DELETED_AT_TIMESTAMP_DOC_ID}: NOT FOUND`);
  } else {
    const deletedAt = flaggedData.deletedAt;
    const deletedAtType = deletedAt?.toDate instanceof Function ? 'timestamp' : deletedAt === null ? 'null' : typeof deletedAt;
    console.log(`  ${FLAGGED_DELETED_AT_TIMESTAMP_DOC_ID}: deletedAt is ${deletedAtType}; script will not modify this document.`);
  }
  console.log('');

  if (!countsMatch) {
    console.error('Expected-count guard failed. The data has changed since the last audit, so no backfill will run.');
    console.error(`Expected missing leagueId=${EXPECTED_MISSING_LEAGUE_ID}, actual=${missingLeagueIdCount}`);
    console.error(`Expected missing deletedAt=${EXPECTED_MISSING_DELETED_AT}, actual=${missingDeletedAtCount}`);
    return false;
  }

  console.log('Expected-count guard passed. Data shape matches the last audit counts.');
  console.log('');
  return true;
}

async function applyBackfill(audit: AuditResult): Promise<void> {
  console.log('--- BACKFILL PHASE ---');
  console.log(`Backfilling missing leagueId with: ${BACKFILL_LEAGUE_ID}`);
  console.log('Backfilling only documents where deletedAt is missing entirely with: null');
  console.log(`Explicitly not touching flagged document: ${FLAGGED_DELETED_AT_TIMESTAMP_DOC_ID}`);

  const docsToUpdate = new Map<string, { doc: FirebaseFirestore.QueryDocumentSnapshot; updates: Record<string, unknown> }>();

  for (const doc of audit.missingLeagueIdDocs) {
    docsToUpdate.set(doc.id, { doc, updates: { leagueId: BACKFILL_LEAGUE_ID } });
  }

  for (const doc of audit.missingDeletedAtDocs) {
    const entry = docsToUpdate.get(doc.id) || { doc, updates: {} };
    entry.updates.deletedAt = null;
    docsToUpdate.set(doc.id, entry);
  }

  const entries = Array.from(docsToUpdate.values());
  for (let i = 0; i < entries.length; i += BATCH_LIMIT) {
    const chunk = entries.slice(i, i + BATCH_LIMIT);
    const batch = db.batch();
    for (const entry of chunk) {
      batch.update(entry.doc.ref, entry.updates);
    }
    await batch.commit();
    console.log(`  Committed ${chunk.length} player document updates (${Math.min(i + BATCH_LIMIT, entries.length)}/${entries.length})`);
  }

  if (entries.length === 0) {
    console.log('  No player document updates were needed.');
  }
  console.log('');
}

function printDryRunSummary(audit: AuditResult): void {
  const allDocIds = new Set<string>([
    ...audit.missingLeagueIdDocs.map((doc) => doc.id),
    ...audit.missingDeletedAtDocs.map((doc) => doc.id),
  ]);

  console.log('====================================================');
  console.log('DRY-RUN SUMMARY');
  console.log('====================================================');
  console.log('No changes were made to production.');
  console.log(`Would set leagueId="${BACKFILL_LEAGUE_ID}" on ${audit.missingLeagueIdDocs.length} player docs.`);
  console.log(`Would set deletedAt=null on ${audit.missingDeletedAtDocs.length} player docs where deletedAt is missing entirely.`);
  console.log(`Total unique player docs that would be updated: ${allDocIds.size}`);
  console.log(`Docs missing leagueId: ${formatDocIds(audit.missingLeagueIdDocs)}`);
  console.log(`Docs missing deletedAt: ${formatDocIds(audit.missingDeletedAtDocs)}`);
  console.log(`Flagged manual-decision doc left untouched: ${FLAGGED_DELETED_AT_TIMESTAMP_DOC_ID}`);
  console.log('');
  console.log('To execute the production backfill, re-run with:');
  console.log('  node node_modules\\jiti\\lib\\jiti-cli.mjs scripts\\normalizePlayerStructure.ts --apply');
  console.log('');
}

async function verifyAfterApply(): Promise<void> {
  console.log('--- VERIFICATION PHASE ---');
  const audit = await auditPlayers();
  console.log(`Remaining docs missing leagueId: ${audit.missingLeagueIdDocs.length}`);
  console.log(`Remaining docs missing deletedAt: ${audit.missingDeletedAtDocs.length}`);
  console.log(`Flagged manual-decision doc left untouched: ${FLAGGED_DELETED_AT_TIMESTAMP_DOC_ID}`);

  if (audit.missingLeagueIdDocs.length === 0 && audit.missingDeletedAtDocs.length === 0) {
    console.log('VERIFICATION PASSED: zero player documents remain missing leagueId or deletedAt.');
  } else {
    console.error('VERIFICATION FAILED: some player documents still miss leagueId or deletedAt.');
    console.error(`Docs still missing leagueId: ${formatDocIds(audit.missingLeagueIdDocs)}`);
    console.error(`Docs still missing deletedAt: ${formatDocIds(audit.missingDeletedAtDocs)}`);
    process.exitCode = 1;
  }
  console.log('');
}

async function main() {
  console.log('====================================================');
  console.log('PLAYER STRUCTURE NORMALIZATION');
  console.log('====================================================');
  console.log(`Firebase Project ID: ${projectId}`);
  console.log('Targeting PRODUCTION Firebase project.');
  console.log(`Mode: ${isApply ? 'APPLY (Writing to database)' : 'DRY-RUN (No writes)'}`);
  console.log('====================================================\n');

  const audit = await auditPlayers();
  const canProceed = printAudit(audit);
  if (!canProceed) return;

  if (!isApply) {
    printDryRunSummary(audit);
    return;
  }

  await applyBackfill(audit);
  await verifyAfterApply();

  console.log('====================================================');
  console.log('FINAL REPORT');
  console.log('====================================================');
  console.log(`Flagged manual-decision doc was not modified by this script: ${FLAGGED_DELETED_AT_TIMESTAMP_DOC_ID}`);
  console.log('====================================================');
}

main().catch((err) => {
  console.error('Fatal error executing player structure normalization:', err);
  process.exit(1);
});
