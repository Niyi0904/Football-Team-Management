import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const MATCHES_COLLECTION = 'matches';
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

interface DateAudit {
  hasDateOnly:          DocSnapshot[]; // has date, no scheduledDate → copy date → scheduledDate, then delete date
  hasBoth_agree:        DocSnapshot[]; // has both, values agree    → delete date only
  hasBoth_disagree:     { doc: DocSnapshot; dateVal: string; scheduledDateVal: string }[]; // conflict, report only
  hasScheduledDateOnly: DocSnapshot[]; // already clean
  hasNeither:           DocSnapshot[]; // missing both — unusual, reported
}

interface IdAudit {
  missing:  DocSnapshot[];                                          // id field absent entirely
  mismatch: { doc: DocSnapshot; storedId: string }[];              // id field present but ≠ doc.id
}

interface LeagueAudit {
  missingLeagueId:    DocSnapshot[];
  leagueValueCounts:  Map<string, DocSnapshot[]>;                  // distinct league text → docs
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────────────────────

function formatDocIds(docs: { id: string }[]): string {
  return docs.length > 0 ? docs.map(d => d.id).join(', ') : 'none';
}

function coerceToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  // Firestore Timestamp
  const v = value as { toDate?: () => Date; seconds?: number };
  if (typeof v.toDate === 'function') return v.toDate().toISOString().split('T')[0];
  if (typeof v.seconds === 'number') return new Date(v.seconds * 1000).toISOString().split('T')[0];
  return String(value);
}

async function commitBatches(
  db: FirebaseFirestore.Firestore,
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
      `  Committed ${chunk.length} ${label} updates (${Math.min(i + BATCH_LIMIT, entries.length)}/${entries.length})`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT PHASE
// ─────────────────────────────────────────────────────────────────────────────

async function auditMatches(): Promise<{
  docs: DocSnapshot[];
  dateAudit: DateAudit;
  idAudit: IdAudit;
  leagueAudit: LeagueAudit;
}> {
  const snap = await db.collection(MATCHES_COLLECTION).get();
  const docs = snap.docs;

  const dateAudit: DateAudit = {
    hasDateOnly:          [],
    hasBoth_agree:        [],
    hasBoth_disagree:     [],
    hasScheduledDateOnly: [],
    hasNeither:           [],
  };

  const idAudit: IdAudit = {
    missing:  [],
    mismatch: [],
  };

  const leagueAudit: LeagueAudit = {
    missingLeagueId:   [],
    leagueValueCounts: new Map(),
  };

  for (const doc of docs) {
    const data = doc.data();

    // ── date / scheduledDate ─────────────────────────────────────────────────
    const hasDate          = data.date          !== undefined;
    const hasScheduledDate = data.scheduledDate !== undefined;

    if (hasDate && !hasScheduledDate) {
      dateAudit.hasDateOnly.push(doc);
    } else if (hasDate && hasScheduledDate) {
      const dateStr          = coerceToString(data.date);
      const scheduledDateStr = coerceToString(data.scheduledDate);
      // Normalize to YYYY-MM-DD prefix for comparison (handles ISO strings with time component)
      const dateNorm          = dateStr.split('T')[0].substring(0, 10);
      const scheduledDateNorm = scheduledDateStr.split('T')[0].substring(0, 10);
      if (dateNorm === scheduledDateNorm) {
        dateAudit.hasBoth_agree.push(doc);
      } else {
        dateAudit.hasBoth_disagree.push({ doc, dateVal: dateStr, scheduledDateVal: scheduledDateStr });
      }
    } else if (!hasDate && hasScheduledDate) {
      dateAudit.hasScheduledDateOnly.push(doc);
    } else {
      dateAudit.hasNeither.push(doc);
    }

    // ── id field ─────────────────────────────────────────────────────────────
    if (data.id === undefined) {
      idAudit.missing.push(doc);
    } else if (data.id !== doc.id) {
      idAudit.mismatch.push({ doc, storedId: String(data.id) });
    }

    // ── league / leagueId ─────────────────────────────────────────────────
    if (data.leagueId === undefined) {
      leagueAudit.missingLeagueId.push(doc);
    }

    const leagueVal = data.league !== undefined ? String(data.league) : '__MISSING__';
    const existing  = leagueAudit.leagueValueCounts.get(leagueVal) ?? [];
    existing.push(doc);
    leagueAudit.leagueValueCounts.set(leagueVal, existing);
  }

  return { docs, dateAudit, idAudit, leagueAudit };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRINT AUDIT
// ─────────────────────────────────────────────────────────────────────────────

function printAudit(
  docs: DocSnapshot[],
  dateAudit: DateAudit,
  idAudit: IdAudit,
  leagueAudit: LeagueAudit,
): void {
  const total = docs.length;
  console.log('--- AUDIT PHASE ---');
  console.log(`Total match documents read: ${total}\n`);

  // ── Normalization 1: scheduledDate / date ──────────────────────────────────
  console.log('NORMALIZATION 1 — scheduledDate / date');
  console.log('--------------------------------------');
  console.log(`  Clean (scheduledDate only, no date):   ${dateAudit.hasScheduledDateOnly.length} docs`);
  console.log(`  Has date only (missing scheduledDate): ${dateAudit.hasDateOnly.length} docs`);
  console.log(`    → Will copy date → scheduledDate, then delete date`);
  if (dateAudit.hasDateOnly.length > 0) {
    console.log(`    Doc IDs: ${formatDocIds(dateAudit.hasDateOnly)}`);
  }
  console.log(`  Has both, values AGREE:                ${dateAudit.hasBoth_agree.length} docs`);
  console.log(`    → Will delete date (scheduledDate already correct)`);
  if (dateAudit.hasBoth_agree.length > 0) {
    console.log(`    Doc IDs: ${formatDocIds(dateAudit.hasBoth_agree)}`);
  }
  console.log(`  Has both, values DISAGREE:             ${dateAudit.hasBoth_disagree.length} docs`);
  if (dateAudit.hasBoth_disagree.length > 0) {
    console.log('    ⚠️  CONFLICTS — will NOT be auto-fixed. Manual review required:');
    for (const { doc, dateVal, scheduledDateVal } of dateAudit.hasBoth_disagree) {
      console.log(`      Doc ${doc.id}: date="${dateVal}" vs scheduledDate="${scheduledDateVal}"`);
    }
  }
  console.log(`  Has neither field:                     ${dateAudit.hasNeither.length} docs`);
  if (dateAudit.hasNeither.length > 0) {
    console.log(`    Doc IDs: ${formatDocIds(dateAudit.hasNeither)}`);
  }
  console.log('');

  // ── Normalization 2: id field ──────────────────────────────────────────────
  console.log('NORMALIZATION 2 — id field');
  console.log('--------------------------');
  console.log(`  Missing id field entirely:  ${idAudit.missing.length} docs`);
  if (idAudit.missing.length > 0) {
    console.log(`    Doc IDs: ${formatDocIds(idAudit.missing)}`);
  }
  console.log(`  id field present but WRONG: ${idAudit.mismatch.length} docs`);
  if (idAudit.mismatch.length > 0) {
    console.log('    ⚠️  MISMATCHES (id field will be corrected to Firestore doc ID):');
    for (const { doc, storedId } of idAudit.mismatch) {
      console.log(`      Doc ${doc.id}: stored id="${storedId}"`);
    }
  }
  console.log('');

  // ── Normalization 3: league / leagueId ────────────────────────────────────
  console.log('NORMALIZATION 3 — league and leagueId');
  console.log('--------------------------------------');
  console.log(`  Missing leagueId: ${leagueAudit.missingLeagueId.length} docs`);
  if (leagueAudit.missingLeagueId.length > 0) {
    console.log(`    → Will backfill to "${BACKFILL_LEAGUE_ID}"`);
  }
  console.log(`  Distinct league text values found: ${leagueAudit.leagueValueCounts.size}`);

  // Sort by doc count descending for display
  const sortedLeagueValues = Array.from(leagueAudit.leagueValueCounts.entries())
    .sort(([, a], [, b]) => b.length - a.length);

  for (const [val, valDocs] of sortedLeagueValues) {
    const displayVal = val === '__MISSING__' ? '(field absent)' : `"${val}"`;
    console.log(`    ${displayVal}: ${valDocs.length} docs`);
  }

  const { canonical, minorityDocs } = resolveCanonicalLeague(leagueAudit);
  if (canonical !== null) {
    console.log(`  Canonical league value: "${canonical}"`);
    console.log(`    (majority by document count)`);
    console.log(`  Minority-value docs to normalize: ${minorityDocs.length}`);
    if (minorityDocs.length > 0) {
      console.log(`    Doc IDs: ${formatDocIds(minorityDocs)}`);
    }
  } else {
    console.log('  All docs share the same league value — no normalization needed.');
  }
  console.log('');
}

// ─────────────────────────────────────────────────────────────────────────────
// LEAGUE CANONICAL RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

function resolveCanonicalLeague(leagueAudit: LeagueAudit): {
  canonical: string | null;
  minorityDocs: DocSnapshot[];
} {
  const counts = leagueAudit.leagueValueCounts;

  // Only real values (not the missing sentinel) compete for canonical
  const realValues = Array.from(counts.entries())
    .filter(([val]) => val !== '__MISSING__')
    .sort(([, a], [, b]) => b.length - a.length);

  if (realValues.length <= 1) {
    // Nothing to normalize
    return { canonical: null, minorityDocs: [] };
  }

  const [canonicalValue] = realValues[0];
  const minorityDocs: DocSnapshot[] = [];

  for (const [val, valDocs] of counts.entries()) {
    if (val !== canonicalValue) {
      minorityDocs.push(...valDocs);
    }
  }

  return { canonical: canonicalValue, minorityDocs };
}

// ─────────────────────────────────────────────────────────────────────────────
// DRY-RUN SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

function printDryRunSummary(
  dateAudit: DateAudit,
  idAudit: IdAudit,
  leagueAudit: LeagueAudit,
): void {
  const { canonical, minorityDocs } = resolveCanonicalLeague(leagueAudit);

  const dateDocsToWrite =
    dateAudit.hasDateOnly.length + dateAudit.hasBoth_agree.length;

  const idDocsToWrite =
    idAudit.missing.length + idAudit.mismatch.length;

  const leagueDocsToWrite =
    leagueAudit.missingLeagueId.length + minorityDocs.length;

  console.log('====================================================');
  console.log('DRY-RUN SUMMARY');
  console.log('====================================================');
  console.log('No changes were made to production.\n');

  console.log('Normalization 1 — scheduledDate / date:');
  console.log(`  Would copy date → scheduledDate + delete date on: ${dateAudit.hasDateOnly.length} docs`);
  console.log(`  Would delete date only (scheduledDate already set): ${dateAudit.hasBoth_agree.length} docs`);
  console.log(`  Would SKIP (conflict, needs manual review): ${dateAudit.hasBoth_disagree.length} docs`);
  console.log(`  Would SKIP (already clean): ${dateAudit.hasScheduledDateOnly.length} docs`);
  console.log(`  Total docs touched by this normalization: ${dateDocsToWrite}`);
  console.log('');

  console.log('Normalization 2 — id field:');
  console.log(`  Would stamp id = doc.id on docs missing id:  ${idAudit.missing.length} docs`);
  console.log(`  Would correct mismatched id field:           ${idAudit.mismatch.length} docs`);
  console.log(`  Total docs touched by this normalization: ${idDocsToWrite}`);
  console.log('');

  console.log('Normalization 3 — league and leagueId:');
  console.log(`  Would backfill leagueId="${BACKFILL_LEAGUE_ID}" on: ${leagueAudit.missingLeagueId.length} docs`);
  if (canonical !== null) {
    console.log(`  Would normalize league to "${canonical}" on: ${minorityDocs.length} docs`);
  } else {
    console.log('  league field: all docs already share the same value, no changes needed.');
  }
  console.log(`  Total docs touched by this normalization: ${leagueDocsToWrite}`);
  console.log('');

  console.log('To execute the production backfill, re-run with:');
  console.log('  node node_modules\\jiti\\lib\\jiti-cli.mjs scripts\\normalizeMatchStructure.ts --apply');
  console.log('====================================================\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKFILL PHASE
// ─────────────────────────────────────────────────────────────────────────────

async function applyBackfill(
  dateAudit: DateAudit,
  idAudit: IdAudit,
  leagueAudit: LeagueAudit,
): Promise<void> {
  console.log('--- BACKFILL PHASE ---\n');

  // ── Normalization 1: scheduledDate / date ──────────────────────────────────
  console.log('Normalization 1 — scheduledDate / date:');

  const dateEntries: Array<{ ref: FirebaseFirestore.DocumentReference; updates: Record<string, unknown> }> = [];

  // Docs that have date but no scheduledDate: copy date value, then delete date
  for (const doc of dateAudit.hasDateOnly) {
    const data = doc.data();
    const scheduledDate = coerceToString(data.date);
    dateEntries.push({
      ref: doc.ref,
      updates: {
        scheduledDate,
        date: FieldValue.delete(),
      },
    });
  }

  // Docs that have both and agree: delete date, scheduledDate is already correct
  for (const doc of dateAudit.hasBoth_agree) {
    dateEntries.push({
      ref: doc.ref,
      updates: { date: FieldValue.delete() },
    });
  }

  await commitBatches(db, dateEntries, 'scheduledDate/date');

  if (dateAudit.hasBoth_disagree.length > 0) {
    console.log(
      `  ⚠️  Skipped ${dateAudit.hasBoth_disagree.length} docs with conflicting date/scheduledDate values — manual review required.`,
    );
    for (const { doc, dateVal, scheduledDateVal } of dateAudit.hasBoth_disagree) {
      console.log(`    Doc ${doc.id}: date="${dateVal}" vs scheduledDate="${scheduledDateVal}"`);
    }
  }
  console.log('');

  // ── Normalization 2: id field ──────────────────────────────────────────────
  console.log('Normalization 2 — id field:');

  const idEntries: Array<{ ref: FirebaseFirestore.DocumentReference; updates: Record<string, unknown> }> = [];

  for (const doc of idAudit.missing) {
    idEntries.push({ ref: doc.ref, updates: { id: doc.id } });
  }

  for (const { doc, storedId } of idAudit.mismatch) {
    console.log(`  Correcting id on doc ${doc.id}: was "${storedId}", setting to "${doc.id}"`);
    idEntries.push({ ref: doc.ref, updates: { id: doc.id } });
  }

  await commitBatches(db, idEntries, 'id field');
  console.log('');

  // ── Normalization 3: league / leagueId ────────────────────────────────────
  console.log('Normalization 3 — league and leagueId:');

  const { canonical, minorityDocs } = resolveCanonicalLeague(leagueAudit);

  // Build a unified map of doc ID → updates so one batch handles both
  const leagueUpdateMap = new Map<string, { ref: FirebaseFirestore.DocumentReference; updates: Record<string, unknown> }>();

  for (const doc of leagueAudit.missingLeagueId) {
    leagueUpdateMap.set(doc.id, {
      ref: doc.ref,
      updates: { leagueId: BACKFILL_LEAGUE_ID },
    });
  }

  if (canonical !== null) {
    console.log(`  Canonical league value: "${canonical}"`);
    for (const doc of minorityDocs) {
      const existing = leagueUpdateMap.get(doc.id);
      if (existing) {
        existing.updates.league = canonical;
      } else {
        leagueUpdateMap.set(doc.id, {
          ref: doc.ref,
          updates: { league: canonical },
        });
      }
      const data = doc.data();
      const oldLeague = data.league !== undefined ? `"${String(data.league)}"` : '(field absent)';
      console.log(`  Doc ${doc.id}: league ${oldLeague} → "${canonical}"`);
    }
  } else {
    console.log('  league field: all docs already share the same value — no normalization needed.');
  }

  await commitBatches(db, Array.from(leagueUpdateMap.values()), 'league/leagueId');
  console.log('');
}

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION PHASE
// ─────────────────────────────────────────────────────────────────────────────

async function verifyAfterApply(): Promise<void> {
  console.log('--- VERIFICATION PHASE ---');

  const { dateAudit, idAudit, leagueAudit, docs } = await auditMatches();
  const total = docs.length;

  let passed = true;

  // Normalization 1
  const remainingDateOnly = dateAudit.hasDateOnly.length;
  const remainingConflicts = dateAudit.hasBoth_disagree.length;
  const remainingDateField =
    remainingDateOnly + dateAudit.hasBoth_agree.length + remainingConflicts;

  if (remainingDateOnly > 0) {
    console.error(`  FAIL: ${remainingDateOnly} docs still have date but no scheduledDate.`);
    console.error(`    Doc IDs: ${formatDocIds(dateAudit.hasDateOnly)}`);
    passed = false;
  } else {
    console.log(`  OK: 0 docs remain with date but no scheduledDate.`);
  }

  if (dateAudit.hasBoth_agree.length > 0) {
    // These should have been cleaned up
    console.error(`  FAIL: ${dateAudit.hasBoth_agree.length} docs still have both date and scheduledDate (agreeing values not cleaned).`);
    passed = false;
  } else {
    console.log(`  OK: 0 docs still have an unconflicted date field alongside scheduledDate.`);
  }

  if (remainingConflicts > 0) {
    console.log(`  NOTE: ${remainingConflicts} docs with date/scheduledDate conflicts remain — skipped intentionally, require manual review.`);
  }

  // Normalization 2
  const remainingMissingId  = idAudit.missing.length;
  const remainingMismatchId = idAudit.mismatch.length;

  if (remainingMissingId > 0) {
    console.error(`  FAIL: ${remainingMissingId} docs still missing id field.`);
    console.error(`    Doc IDs: ${formatDocIds(idAudit.missing)}`);
    passed = false;
  } else {
    console.log(`  OK: 0 docs missing id field.`);
  }

  if (remainingMismatchId > 0) {
    console.error(`  FAIL: ${remainingMismatchId} docs still have mismatched id field.`);
    for (const { doc, storedId } of idAudit.mismatch) {
      console.error(`    Doc ${doc.id}: stored id="${storedId}"`);
    }
    passed = false;
  } else {
    console.log(`  OK: 0 docs have mismatched id field.`);
  }

  // Normalization 3
  const remainingMissingLeagueId = leagueAudit.missingLeagueId.length;
  const { canonical: postCanonical, minorityDocs: postMinority } = resolveCanonicalLeague(leagueAudit);

  if (remainingMissingLeagueId > 0) {
    console.error(`  FAIL: ${remainingMissingLeagueId} docs still missing leagueId.`);
    console.error(`    Doc IDs: ${formatDocIds(leagueAudit.missingLeagueId)}`);
    passed = false;
  } else {
    console.log(`  OK: 0 docs missing leagueId.`);
  }

  if (postMinority.length > 0) {
    console.error(`  FAIL: ${postMinority.length} docs still have non-canonical league values.`);
    passed = false;
  } else {
    console.log(`  OK: league field is uniform across all ${total} docs.`);
  }

  console.log('');
  console.log('====================================================');
  console.log('FINAL REPORT');
  console.log('====================================================');
  if (passed) {
    console.log('VERIFICATION PASSED: all three normalizations are clean.');
  } else {
    console.error('VERIFICATION FAILED: see errors above.');
    process.exitCode = 1;
  }
  console.log('====================================================\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('====================================================');
  console.log('MATCH STRUCTURE NORMALIZATION');
  console.log('====================================================');
  console.log(`Firebase Project ID: ${projectId}`);
  console.log('Targeting PRODUCTION Firebase project.');
  console.log(`Mode: ${isApply ? 'APPLY (Writing to database)' : 'DRY-RUN (No writes)'}`);
  console.log('====================================================\n');

  const { docs, dateAudit, idAudit, leagueAudit } = await auditMatches();
  printAudit(docs, dateAudit, idAudit, leagueAudit);

  if (!isApply) {
    printDryRunSummary(dateAudit, idAudit, leagueAudit);
    return;
  }

  await applyBackfill(dateAudit, idAudit, leagueAudit);
  await verifyAfterApply();
}

main().catch((err) => {
  console.error('Fatal error executing match structure normalization:', err);
  process.exit(1);
});
