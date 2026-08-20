import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

type FieldTypeExample = {
  count: number;
  exampleId: string;
};

type DuplicatePairReport = {
  snake: string;
  camel: string;
  bothCount: number;
  snakeOnlyCount: number;
  camelOnlyCount: number;
  bothExamples: string[];
};

const COLLECTION_NAME = 'players';
const EXAMPLE_LIMIT = 3;

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

function toCamelCase(fieldName: string): string {
  return fieldName.replace(/_([a-zA-Z0-9])/g, (_, char: string) => char.toUpperCase());
}

function detectValueType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';

  const primitiveType = typeof value;
  if (primitiveType !== 'object') return primitiveType;

  const objectValue = value as { constructor?: { name?: string }; toDate?: unknown };
  const constructorName = objectValue.constructor?.name;

  if (constructorName === 'Timestamp' || typeof objectValue.toDate === 'function') {
    return 'timestamp';
  }
  if (constructorName === 'DocumentReference') return 'documentReference';
  if (constructorName === 'GeoPoint') return 'geoPoint';

  return 'object';
}

function formatPercent(count: number, total: number): string {
  if (total === 0) return '0.0%';
  return `${((count / total) * 100).toFixed(1)}%`;
}

function formatExamples(ids: string[]): string {
  return ids.length > 0 ? ids.join(', ') : 'none';
}

function addExample(examples: string[], id: string): void {
  if (examples.length < EXAMPLE_LIMIT) examples.push(id);
}

function collectDuplicatePairReports(
  fields: Set<string>,
  docs: Array<{ id: string; keys: Set<string> }>,
): DuplicatePairReport[] {
  const reports: DuplicatePairReport[] = [];
  const seen = new Set<string>();

  for (const field of fields) {
    if (!field.includes('_')) continue;

    const camel = toCamelCase(field);
    if (camel === field || !fields.has(camel)) continue;

    const pairKey = `${field}\0${camel}`;
    if (seen.has(pairKey)) continue;
    seen.add(pairKey);

    let bothCount = 0;
    let snakeOnlyCount = 0;
    let camelOnlyCount = 0;
    const bothExamples: string[] = [];

    for (const doc of docs) {
      const hasSnake = doc.keys.has(field);
      const hasCamel = doc.keys.has(camel);

      if (hasSnake && hasCamel) {
        bothCount += 1;
        addExample(bothExamples, doc.id);
      } else if (hasSnake) {
        snakeOnlyCount += 1;
      } else if (hasCamel) {
        camelOnlyCount += 1;
      }
    }

    reports.push({
      snake: field,
      camel,
      bothCount,
      snakeOnlyCount,
      camelOnlyCount,
      bothExamples,
    });
  }

  return reports.sort((a, b) => {
    if (a.snake === 'team_id' && a.camel === 'teamId') return -1;
    if (b.snake === 'team_id' && b.camel === 'teamId') return 1;
    return `${a.snake}/${a.camel}`.localeCompare(`${b.snake}/${b.camel}`);
  });
}

async function main() {
  const snap = await db.collection(COLLECTION_NAME).get();
  const totalDocs = snap.size;

  const signatureGroups = new Map<string, { count: number; examples: string[]; fields: string[] }>();
  const fieldPresence = new Map<string, { count: number; examples: string[] }>();
  const fieldTypes = new Map<string, Map<string, FieldTypeExample>>();
  const docs: Array<{ id: string; keys: Set<string> }> = [];
  const allFields = new Set<string>();

  for (const doc of snap.docs) {
    const data = doc.data();
    const keys = Object.keys(data).sort();
    const keySet = new Set(keys);
    const signature = keys.join(', ');

    docs.push({ id: doc.id, keys: keySet });

    const group = signatureGroups.get(signature) || { count: 0, examples: [], fields: keys };
    group.count += 1;
    addExample(group.examples, doc.id);
    signatureGroups.set(signature, group);

    for (const key of keys) {
      allFields.add(key);

      const presence = fieldPresence.get(key) || { count: 0, examples: [] };
      presence.count += 1;
      addExample(presence.examples, doc.id);
      fieldPresence.set(key, presence);

      const typeName = detectValueType(data[key]);
      const typeMap = fieldTypes.get(key) || new Map<string, FieldTypeExample>();
      const typeEntry = typeMap.get(typeName) || { count: 0, exampleId: doc.id };
      typeEntry.count += 1;
      typeMap.set(typeName, typeEntry);
      fieldTypes.set(key, typeMap);
    }
  }

  const sortedSignatureGroups = Array.from(signatureGroups.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.fields.join(', ').localeCompare(b.fields.join(', '));
  });

  const sortedFieldPresence = Array.from(fieldPresence.entries()).sort(([a], [b]) => a.localeCompare(b));
  const duplicatePairReports = collectDuplicatePairReports(allFields, docs);
  const varyingTypeReports = Array.from(fieldTypes.entries())
    .filter(([field, typeMap]) => {
      const presence = fieldPresence.get(field);
      return Boolean(presence && presence.count > 1 && typeMap.size > 1);
    })
    .sort(([a], [b]) => a.localeCompare(b));

  console.log('====================================================');
  console.log('PLAYER STRUCTURE AUDIT');
  console.log('====================================================');
  console.log(`Firebase Project ID: ${projectId}`);
  console.log(`Collection: ${COLLECTION_NAME}`);
  console.log(`Total documents read: ${totalDocs}`);
  console.log('Mode: READ-ONLY AUDIT (No writes)');
  console.log('====================================================\n');

  console.log('FIELD-NAME SIGNATURE GROUPS');
  console.log('----------------------------------------------------');
  if (sortedSignatureGroups.length === 0) {
    console.log('No player documents found.\n');
  } else {
    sortedSignatureGroups.forEach((group, index) => {
      console.log(`${index + 1}. ${group.count} docs (${formatPercent(group.count, totalDocs)})`);
      console.log(`   Examples: ${formatExamples(group.examples)}`);
      console.log(`   Fields (${group.fields.length}): ${group.fields.length > 0 ? group.fields.join(', ') : '(no fields)'}`);
    });
    console.log('');
  }

  console.log('DUPLICATE NAMING RISK CHECKS');
  console.log('----------------------------------------------------');
  const knownTeamPair = duplicatePairReports.find((report) => report.snake === 'team_id' && report.camel === 'teamId');
  if (knownTeamPair) {
    console.log(`Known pair team_id / teamId: FOUND`);
    console.log(`  Docs with both: ${knownTeamPair.bothCount} (${formatPercent(knownTeamPair.bothCount, totalDocs)})`);
    console.log(`  Docs with only team_id: ${knownTeamPair.snakeOnlyCount} (${formatPercent(knownTeamPair.snakeOnlyCount, totalDocs)})`);
    console.log(`  Docs with only teamId: ${knownTeamPair.camelOnlyCount} (${formatPercent(knownTeamPair.camelOnlyCount, totalDocs)})`);
    console.log(`  Examples with both: ${formatExamples(knownTeamPair.bothExamples)}`);
  } else {
    const hasTeamId = allFields.has('teamId');
    const hasTeamSnake = allFields.has('team_id');
    console.log(`Known pair team_id / teamId: not found as a pair`);
    console.log(`  team_id present anywhere: ${hasTeamSnake ? 'yes' : 'no'}`);
    console.log(`  teamId present anywhere: ${hasTeamId ? 'yes' : 'no'}`);
  }

  const otherPairs = duplicatePairReports.filter((report) => !(report.snake === 'team_id' && report.camel === 'teamId'));
  if (otherPairs.length === 0) {
    console.log('\nOther snake_case / camelCase pairs: none found');
  } else {
    console.log('\nOther snake_case / camelCase pairs:');
    for (const report of otherPairs) {
      console.log(`  - ${report.snake} / ${report.camel}`);
      console.log(`    Docs with both: ${report.bothCount} (${formatPercent(report.bothCount, totalDocs)})`);
      console.log(`    Docs with only ${report.snake}: ${report.snakeOnlyCount} (${formatPercent(report.snakeOnlyCount, totalDocs)})`);
      console.log(`    Docs with only ${report.camel}: ${report.camelOnlyCount} (${formatPercent(report.camelOnlyCount, totalDocs)})`);
      console.log(`    Examples with both: ${formatExamples(report.bothExamples)}`);
    }
  }
  console.log('');

  console.log('FIELD PRESENCE REPORT');
  console.log('----------------------------------------------------');
  if (sortedFieldPresence.length === 0) {
    console.log('No fields found.\n');
  } else {
    for (const [field, presence] of sortedFieldPresence) {
      console.log(`${field}: ${presence.count}/${totalDocs} docs (${formatPercent(presence.count, totalDocs)})`);
    }
    console.log('');
  }

  console.log('FIELD TYPE CONSISTENCY REPORT');
  console.log('----------------------------------------------------');
  if (varyingTypeReports.length === 0) {
    console.log('No fields present in more than one document have varying value types.');
  } else {
    for (const [field, typeMap] of varyingTypeReports) {
      const presence = fieldPresence.get(field);
      console.log(`${field}: ${presence?.count ?? 0}/${totalDocs} docs have this field, with varying types`);
      for (const [typeName, example] of Array.from(typeMap.entries()).sort(([a], [b]) => a.localeCompare(b))) {
        console.log(`  - ${typeName}: ${example.count} docs; example: ${example.exampleId}`);
      }
    }
  }
  console.log('\n====================================================');
  console.log('END PLAYER STRUCTURE AUDIT');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('Fatal error executing player structure audit:', err);
  process.exit(1);
});
