import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const COLLECTION = 'matches';
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
// AUDIT
// ─────────────────────────────────────────────────────────────────────────────

async function auditMatches(): Promise<{
  totalDocs: number;
  missingDeletedAt: FirebaseFirestore.QueryDocumentSnapshot[];
}> {
  const snap = await db.collection(COLLECTION).get();
  const missingDeletedAt: FirebaseFirestore.QueryDocumentSnapshot[] = [];

  snap.docs.forEach((doc) => {
    if (doc.data().deletedAt === undefined) missingDeletedAt.push(doc);
  });

  return { totalDocs: snap.size, missingDeletedAt };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('====================================================');
  console.log('MATCHES BACKFILL — deletedAt');
  console.log('====================================================');
  console.log(`Firebase Project ID: ${projectId}`);
  console.log('Targeting PRODUCTION Firebase project.');
  console.log(`Mode: ${isApply ? '🚀 APPLY (Writing to database)' : '🔍 DRY-RUN (No writes)'}`);
  console.log('====================================================\n');

  const audit = await auditMatches();

  console.log('--- AUDIT PHASE ---');
  console.log(`  • matches: ${audit.totalDocs} total docs | ${audit.missingDeletedAt.length} missing 'deletedAt'\n`);

  if (!isApply) {
    console.log('====================================================');
    console.log('DRY-RUN SUMMARY');
    console.log('====================================================');
    console.log('No changes were made to production.');
    console.log(`  - matches: would set deletedAt → null on ${audit.missingDeletedAt.length} docs`);
    console.log('\nTo execute the backfill on production, re-run with:');
    console.log('  node node_modules\\jiti\\lib\\jiti-cli.mjs scripts\\backfillMatchesDeletedAt.ts --apply');
    console.log('====================================================\n');
    return;
  }

  // ── BACKFILL ──────────────────────────────────────────────────────────────
  console.log('--- BACKFILL PHASE ---');

  if (audit.missingDeletedAt.length === 0) {
    console.log('  No docs to backfill.');
  } else {
    for (let i = 0; i < audit.missingDeletedAt.length; i += BATCH_LIMIT) {
      const chunk = audit.missingDeletedAt.slice(i, i + BATCH_LIMIT);
      const batch = db.batch();
      chunk.forEach((doc) => batch.update(doc.ref, { deletedAt: null }));
      await batch.commit();
      console.log(`    - Committed batch of ${chunk.length} docs (${Math.min(i + BATCH_LIMIT, audit.missingDeletedAt.length)}/${audit.missingDeletedAt.length})`);
    }
  }

  // ── VERIFICATION ─────────────────────────────────────────────────────────
  console.log('\n--- VERIFICATION PHASE ---');

  const verify = await auditMatches();
  console.log(`  • matches: ${verify.missingDeletedAt.length} remaining docs missing 'deletedAt'`);

  console.log('\n====================================================');
  console.log('FINAL REPORT');
  console.log('====================================================');
  if (verify.missingDeletedAt.length === 0) {
    console.log(`✅ VERIFICATION PASSED: all ${audit.missingDeletedAt.length} docs backfilled with deletedAt: null.`);
  } else {
    console.error(`⚠️ VERIFICATION FAILURE: ${verify.missingDeletedAt.length} docs still missing 'deletedAt'.`);
    process.exitCode = 1;
  }
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('Fatal error executing backfill:', err);
  process.exit(1);
});