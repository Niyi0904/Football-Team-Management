import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

type FieldTypeExample = {
  count: number;
  exampleId: string;
  samples: string[];
};

type DuplicatePairReport = {
  snake: string;
  camel: string;
  bothCount: number;
  snakeOnlyCount: number;
  camelOnlyCount: number;
  bothExamples: string[];
};

type CollectionAudit = {
  collectionName: string;
  totalDocs: number;
  signatureGroups: Array<{ count: number; examples: string[]; fields: string[] }>;
  fieldPresence: Array<[string, { count: number; examples: string[] }]>;
  duplicatePairReports: DuplicatePairReport[];
  varyingTypeReports: Array<[string, Map<string, FieldTypeExample>]>;
  allFields: Set<string>;
  docs: Array<{ id: string; data: FirebaseFirestore.DocumentData; keys: Set<string> }>;
  fieldTypes: Map<string, Map<string, FieldTypeExample>>;
};

const COLLECTIONS = ['matches', 'goals', 'assists', 'yellow_cards', 'red_cards'];
const EVENT_COLLECTIONS = new Set(['goals', 'assists', 'yellow_cards', 'red_cards']);
const EXAMPLE_LIMIT = 3;
const SAMPLE_LIMIT = 3;

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

function formatValueSample(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[array length ${value.length}]`;

  const objectValue = value as { constructor?: { name?: string }; toDate?: () => Date };
  if (objectValue?.constructor?.name === 'Timestamp' || typeof objectValue?.toDate === 'function') {
    try {
      const toDate = objectValue.toDate;
      return typeof toDate === 'function' ? `Timestamp(${toDate.call(objectValue).toISOString()})` : 'Timestamp';
    } catch {
      return 'Timestamp';
    }
  }

  return `[${objectValue?.constructor?.name || 'object'}]`;
}

function addExample(examples: string[], id: string): void {
  if (examples.length < EXAMPLE_LIMIT) examples.push(id);
}

function addSample(samples: string[], value: unknown): void {
  const sample = formatValueSample(value);
  if (samples.length < SAMPLE_LIMIT && !samples.includes(sample)) {
    samples.push(sample);
  }
}

function formatCollectionLabel(collectionName: string): string {
  return collectionName.replace(/[_-]+/g, ' ').toUpperCase();
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

  return reports.sort((a, b) => `${a.snake}/${a.camel}`.localeCompare(`${b.snake}/${b.camel}`));
}

function collectFieldNameVariants(fields: Set<string>, canonicalField: string): string[] {
  const normalizedCanonical = canonicalField.toLowerCase().replace(/[_-]/g, '');
  return Array.from(fields)
    .filter((field) => field !== canonicalField)
    .filter((field) => field.toLowerCase().replace(/[_-]/g, '') === normalizedCanonical)
    .sort();
}

function countDocsWithField(docs: CollectionAudit['docs'], field: string): { count: number; examples: string[] } {
  const examples: string[] = [];
  let count = 0;

  for (const doc of docs) {
    if (doc.keys.has(field)) {
      count += 1;
      addExample(examples, doc.id);
    }
  }

  return { count, examples };
}

async function auditCollection(collectionName: string): Promise<CollectionAudit> {
  const snap = await db.collection(collectionName).get();
  const totalDocs = snap.size;

  const signatureGroups = new Map<string, { count: number; examples: string[]; fields: string[] }>();
  const fieldPresence = new Map<string, { count: number; examples: string[] }>();
  const fieldTypes = new Map<string, Map<string, FieldTypeExample>>();
  const docs: CollectionAudit['docs'] = [];
  const allFields = new Set<string>();

  for (const doc of snap.docs) {
    const data = doc.data();
    const keys = Object.keys(data).sort();
    const keySet = new Set(keys);
    const signature = keys.join(', ');

    docs.push({ id: doc.id, data, keys: keySet });

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
      const typeEntry = typeMap.get(typeName) || { count: 0, exampleId: doc.id, samples: [] };
      typeEntry.count += 1;
      addSample(typeEntry.samples, data[key]);
      typeMap.set(typeName, typeEntry);
      fieldTypes.set(key, typeMap);
    }
  }

  return {
    collectionName,
    totalDocs,
    signatureGroups: Array.from(signatureGroups.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.fields.join(', ').localeCompare(b.fields.join(', '));
    }),
    fieldPresence: Array.from(fieldPresence.entries()).sort(([a], [b]) => a.localeCompare(b)),
    duplicatePairReports: collectDuplicatePairReports(allFields, docs),
    varyingTypeReports: Array.from(fieldTypes.entries())
      .filter(([field, typeMap]) => {
        const presence = fieldPresence.get(field);
        return Boolean(presence && presence.count > 1 && typeMap.size > 1);
      })
      .sort(([a], [b]) => a.localeCompare(b)),
    allFields,
    docs,
    fieldTypes,
  };
}

function printSignatureGroups(audit: CollectionAudit): void {
  console.log('FIELD-NAME SIGNATURE GROUPS');
  console.log('----------------------------------------------------');
  if (audit.signatureGroups.length === 0) {
    console.log(`No ${audit.collectionName} documents found.\n`);
    return;
  }

  audit.signatureGroups.forEach((group, index) => {
    console.log(`${index + 1}. ${group.count} docs (${formatPercent(group.count, audit.totalDocs)})`);
    console.log(`   Examples: ${formatExamples(group.examples)}`);
    console.log(`   Fields (${group.fields.length}): ${group.fields.length > 0 ? group.fields.join(', ') : '(no fields)'}`);
  });
  console.log('');
}

function printDuplicateNamingChecks(audit: CollectionAudit): void {
  console.log('DUPLICATE NAMING AND KNOWN RISK CHECKS');
  console.log('----------------------------------------------------');

  const knownFields = audit.collectionName === 'matches'
    ? ['matchDay', 'homeTeamId', 'scheduledDate']
    : ['matchId', 'playerId', 'teamId'];

  for (const field of knownFields) {
    const presence = countDocsWithField(audit.docs, field);
    const variants = collectFieldNameVariants(audit.allFields, field);
    console.log(`${field}: ${presence.count}/${audit.totalDocs} docs (${formatPercent(presence.count, audit.totalDocs)})`);
    console.log(`  Examples: ${formatExamples(presence.examples)}`);
    console.log(`  Alternate naming variants found: ${variants.length > 0 ? variants.join(', ') : 'none'}`);
  }

  if (audit.collectionName === 'matches') {
    const matchDayLikeFields = Array.from(audit.allFields)
      .filter((field) => field !== 'matchDay' && field.toLowerCase().includes('matchday'))
      .sort();
    console.log(`matchDay embedded/related field-name scan: ${matchDayLikeFields.length > 0 ? matchDayLikeFields.join(', ') : 'none found'}`);

    const statusPresence = countDocsWithField(audit.docs, 'status');
    const statusTypes = audit.fieldTypes.get('status');
    console.log(`status: ${statusPresence.count}/${audit.totalDocs} docs (${formatPercent(statusPresence.count, audit.totalDocs)})`);
    if (!statusTypes) {
      console.log('  Status values: field not present');
    } else {
      const valueCounts = new Map<string, { count: number; examples: string[] }>();
      for (const doc of audit.docs) {
        if (!doc.keys.has('status')) continue;
        const value = formatValueSample(doc.data.status);
        const entry = valueCounts.get(value) || { count: 0, examples: [] };
        entry.count += 1;
        addExample(entry.examples, doc.id);
        valueCounts.set(value, entry);
      }
      console.log('  Status values:');
      for (const [value, entry] of Array.from(valueCounts.entries()).sort(([a], [b]) => a.localeCompare(b))) {
        console.log(`    - ${value}: ${entry.count} docs; examples: ${formatExamples(entry.examples)}`);
      }
    }

    const dateFields = Array.from(audit.allFields)
      .filter((field) => /date|time|day|kickoff|start|end/i.test(field))
      .sort();
    console.log(`Date/time-related fields found: ${dateFields.length > 0 ? dateFields.join(', ') : 'none'}`);
  }

  if (audit.duplicatePairReports.length === 0) {
    console.log('\nSnake_case / camelCase pairs: none found');
  } else {
    console.log('\nSnake_case / camelCase pairs:');
    for (const report of audit.duplicatePairReports) {
      console.log(`  - ${report.snake} / ${report.camel}`);
      console.log(`    Docs with both: ${report.bothCount} (${formatPercent(report.bothCount, audit.totalDocs)})`);
      console.log(`    Docs with only ${report.snake}: ${report.snakeOnlyCount} (${formatPercent(report.snakeOnlyCount, audit.totalDocs)})`);
      console.log(`    Docs with only ${report.camel}: ${report.camelOnlyCount} (${formatPercent(report.camelOnlyCount, audit.totalDocs)})`);
      console.log(`    Examples with both: ${formatExamples(report.bothExamples)}`);
    }
  }
  console.log('');
}

function printFieldPresence(audit: CollectionAudit): void {
  console.log('FIELD PRESENCE REPORT');
  console.log('----------------------------------------------------');
  if (audit.fieldPresence.length === 0) {
    console.log('No fields found.\n');
    return;
  }

  for (const [field, presence] of audit.fieldPresence) {
    console.log(`${field}: ${presence.count}/${audit.totalDocs} docs (${formatPercent(presence.count, audit.totalDocs)})`);
  }
  console.log('');
}

function printTypeConsistency(audit: CollectionAudit): void {
  console.log('FIELD TYPE CONSISTENCY REPORT');
  console.log('----------------------------------------------------');
  if (audit.varyingTypeReports.length === 0) {
    console.log('No fields present in more than one document have varying value types.');
  } else {
    for (const [field, typeMap] of audit.varyingTypeReports) {
      const presence = audit.fieldPresence.find(([presenceField]) => presenceField === field)?.[1];
      const isDateField = /date|time|day|kickoff|start|end/i.test(field);
      const suffix = isDateField ? ' (date/time field)' : '';
      console.log(`${field}${suffix}: ${presence?.count ?? 0}/${audit.totalDocs} docs have this field, with varying types`);
      for (const [typeName, example] of Array.from(typeMap.entries()).sort(([a], [b]) => a.localeCompare(b))) {
        console.log(`  - ${typeName}: ${example.count} docs; example: ${example.exampleId}; samples: ${example.samples.join(', ')}`);
      }
    }
  }
  console.log('');
}

function printCollectionAudit(audit: CollectionAudit): void {
  console.log('====================================================');
  console.log(`${formatCollectionLabel(audit.collectionName)} STRUCTURE AUDIT`);
  console.log('====================================================');
  console.log(`Collection: ${audit.collectionName}`);
  console.log(`Total documents read: ${audit.totalDocs}`);
  console.log('Mode: READ-ONLY AUDIT (No writes)');
  console.log('====================================================\n');

  printSignatureGroups(audit);
  printDuplicateNamingChecks(audit);
  printFieldPresence(audit);
  printTypeConsistency(audit);
}

async function main() {
  console.log('====================================================');
  console.log('MATCHES AND EVENTS STRUCTURE AUDIT');
  console.log('====================================================');
  console.log(`Firebase Project ID: ${projectId}`);
  console.log(`Collections: ${COLLECTIONS.join(', ')}`);
  console.log('Mode: READ-ONLY AUDIT (No writes)');
  console.log('====================================================\n');

  for (const collectionName of COLLECTIONS) {
    const audit = await auditCollection(collectionName);
    printCollectionAudit(audit);

    if (EVENT_COLLECTIONS.has(collectionName)) {
      console.log('RELATED EVENT COLLECTION NOTE');
      console.log('----------------------------------------------------');
      console.log('This event collection is reported separately because it shares the matchId/playerId/teamId relationship pattern.');
      console.log('');
    }
  }

  console.log('====================================================');
  console.log('END MATCHES AND EVENTS STRUCTURE AUDIT');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('Fatal error executing matches/events structure audit:', err);
  process.exit(1);
});
