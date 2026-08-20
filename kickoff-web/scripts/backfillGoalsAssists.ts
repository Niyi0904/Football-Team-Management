import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const AFFECTED_COLLECTIONS = ['goals', 'assists'];
const BACKFILL_LEAGUE_ID = 'MWFePlubN1q0O5WH0Ih3';
const BATCH_LIMIT = 400;

// ─────────────────────────────────────────────────────────────────────────────
// CREDENTIAL LOADING — identical pattern to other backfill scripts
// ─────────────────────────────────────────────────────────────────────────────

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

const rawKey      = process.env.FIREBASE_PRIVATE_KEY            || '';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL           || '';
const projectId   = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';

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

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type DocSnapshot = FirebaseFirestore.QueryDocumentSnapshot;

interface CollectionAudit {
  totalDocs: number;
  missingLeagueId: DocSnapshot[];
  missingDeletedAt: DocSnapshot[];
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT PHASE
// ─────────────────────────────────────────────────────────────────────────────

async function auditCollection(colName: string): Promise<CollectionAudit> {
  const snap = await db.collection(colName).get();
  const missingLeagueId: DocSnapshot[] = [];
  const missingDeletedAt: DocSnapshot[] = [];

  snap.docs.forEach((doc) => {
    const data = doc.data();
    if (data.leagueId === undefined) missingLeagueId.push(doc);
    if (data.deletedAt === undefined) missingDeletedAt.push(doc);
  });

  return {
    totalDocs: snap.size,
    missingLeagueId,
    missingDeletedAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKFILL PHASE
// ─────────────────────────────────────────────────────────────────────────────

async function commitBatches(
  entries: Array<{ ref: FirebaseFirestore.DocumentReference; updates: Record<string, unknown> }>,
  label: string,
): Promise<void> {
  if (entries.length === 0) {
    console.log(`  No ${label} updates needed.`);
    return;
  }
  for (let i = 0; i < entries.length; i += BATCH_LIMIT) {
    const chunk = entries.slice(i, i + BATCH_LIMIT);
    const batch = db.batch();
    for (const { ref, updates } of chunk) {
      batch.update(ref, updates);
    }
    await batch.commit();
    console.log(
      `    - Committed ${chunk.length} ${label} updates (${Math.min(i + BATCH_LIMIT, entries.length)}/${entries.length})`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('====================================================');
  console.log('GOALS & ASSISTS BACKFILL — leagueId + deletedAt');
  console.log('====================================================');
  console.log(`Firebase Project ID: ${projectId}`);
  console.log('Targeting PRODUCTION Firebase project.');
  console.log(`Mode: ${isApply ? '🚀 APPLY (Writing to database)' : '🔍 DRY-RUN (No writes)'}`);
  console.log('====================================================\n');

  // ── AUDIT ─────────────────────────────────────────────────────────────────
  console.log('--- AUDIT PHASE ---');
  const auditResults: Record<string, CollectionAudit> = {};
  let totalMissingLeagueId = 0;
  let totalMissingDeletedAt = 0;

  for (const col of AFFECTED_COLLECTIONS) {
    const result = await auditCollection(col);
    auditResults[col] = result;
    totalMissingLeagueId += result.missingLeagueId.length;
    totalMissingDeletedAt += result.missingDeletedAt.length;
    console.log(`  • ${col}: ${result.totalDocs} total docs | ${result.missingLeagueId.length} missing leagueId | ${result.missingDeletedAt.length} missing deletedAt`);
  }

  console.log(`\nTotal docs missing 'leagueId': ${totalMissingLeagueId}`);
  console.log(`Total docs missing 'deletedAt': ${totalMissingDeletedAt}\n`);

  if (!isApply) {
    console.log('====================================================');
    console.log('DRY-RUN SUMMARY');
    console.log('====================================================');
    console.log('No changes were made to production.');
    console.log('Planned updates:');
    for (const col of AFFECTED_COLLECTIONS) {
      console.log(`  - ${col}:`);
      console.log(`      leagueId  → "${BACKFILL_LEAGUE_ID}" on ${auditResults[col].missingLeagueId.length} docs`);
      console.log(`      deletedAt → null on ${auditResults[col].missingDeletedAt.length} docs`);
    }
    console.log('\nTo execute the backfill on production, re-run with:');
    console.log('  node node_modules\\jiti\\lib\\jiti-cli.mjs scripts\\backfillGoalsAssists.ts --apply');
    console.log('====================================================\n');
    return;
  }

  // ── BACKFILL ──────────────────────────────────────────────────────────────
  console.log('--- BACKFILL PHASE ---');

  for (const col of AFFECTED_COLLECTIONS) {
    const result = auditResults[col];

    const entries: Array<{ ref: FirebaseFirestore.DocumentReference; updates: Record<string, unknown> }> = [];

    for (const doc of result.missingLeagueId) {
      entries.push({ ref: doc.ref, updates: { leagueId: BACKFILL_LEAGUE_ID } });
    }
    for (const doc of result.missingDeletedAt) {
      const existing = entries.find((e) => e.ref.id === doc.id);
      if (existing) {
        existing.updates.deletedAt = null;
      } else {
        entries.push({ ref: doc.ref, updates: { deletedAt: null } });
      }
    }

    console.log(`  • Backfilling '${col}': ${result.missingLeagueId.length} leagueId + ${result.missingDeletedAt.length} deletedAt updates...`);
    await commitBatches(entries, `${col}`);
    console.log('');
  }

  // ── VERIFICATION ─────────────────────────────────────────────────────────
  console.log('--- VERIFICATION PHASE ---');
  console.log('Re-auditing collections to confirm zero docs are missing the fields...\n');

  let remainingMissingLeagueId = 0;
  let remainingMissingDeletedAt = 0;

  for (const col of AFFECTED_COLLECTIONS) {
    const result = await auditCollection(col);
    remainingMissingLeagueId += result.missingLeagueId.length;
    remainingMissingDeletedAt += result.missingDeletedAt.length;
    console.log(`  • ${col}: ${result.missingLeagueId.length} remaining missing leagueId | ${result.missingDeletedAt.length} remaining missing deletedAt`);
  }

  console.log('\n====================================================');
  console.log('FINAL REPORT');
  console.log('====================================================');
  const passed = remainingMissingLeagueId === 0 && remainingMissingDeletedAt === 0;
  if (passed) {
    console.log('✅ VERIFICATION PASSED: all docs backfilled.');
    console.log(`  leagueId: ${totalMissingLeagueId} docs → "${BACKFILL_LEAGUE_ID}"`);
    console.log(`  deletedAt: ${totalMissingDeletedAt} docs → null`);
  } else {
    console.error('⚠️ VERIFICATION FAILURE: some docs still missing fields.');
    console.error(`  Remaining missing leagueId: ${remainingMissingLeagueId}`);
    console.error(`  Remaining missing deletedAt: ${remainingMissingDeletedAt}`);
    process.exitCode = 1;
  }
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('Fatal error executing backfill:', err);
  process.exit(1);
});
