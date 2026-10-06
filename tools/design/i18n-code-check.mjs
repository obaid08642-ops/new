#!/usr/bin/env node
/**
 * i18n code → en.json key check (Phase 13 R5).
 *
 * Scans all .tsx/.ts files for t('key') and getTranslations('namespace')
 * calls and verifies every key used in code exists in en.json.
 *
 * Handles namespaced translations: useTranslations("Settings.Appearance") means
 * t("title") resolves to "Settings.Appearance.title" in the JSON.
 *
 * Usage: node tools/design/i18n-code-check.mjs [--dir patient-web]
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');

const argv = process.argv.slice(2);
const argOf = (n, d) => {
  const i = argv.indexOf(n);
  return i === -1 ? d : argv[i + 1];
};
const DIR = resolve(REPO, argOf('--dir', 'patient-web'));

/** Flatten {a:{b:"x"}} to {"a.b":"x"}. */
function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

/** Recursively collect all .tsx/.ts files. */
function collectTsFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
      collectTsFiles(full, out);
    } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

/** Extract namespace and t() keys from a file, tracking namespace context. */
function extractKeysFromCode(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const keysWithNamespace = new Set();
  const namespaces = new Set();

  // Find all useTranslations/getTranslations calls and their namespaces
  // Pattern 1: getTranslations('namespace') or getTranslations("namespace")
  const namespacePattern1 = /(?:useTranslations|getTranslations)\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
  // Pattern 2: getTranslations({ ..., namespace: 'namespace', ... })
  const namespacePattern2 = /(?:useTranslations|getTranslations)\s*\(\s*\{[^}]*namespace\s*:\s*['"`]([^'"`]+)['"`]/g;
  
  let match;
  while ((match = namespacePattern1.exec(content)) !== null) {
    namespaces.add(match[1]);
  }
  while ((match = namespacePattern2.exec(content)) !== null) {
    namespaces.add(match[1]);
  }

  // Pattern: t('key') or t("key") - handles nested calls like t('Namespace.key')
  const tPattern = /\bt\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
  // Pattern: t.`key` (template literal)
  const tTemplatePattern = /\bt\s*`([^`]+)`/g;

  // If file has explicit namespaces, assume t() calls use the first namespace
  // (next-intl scopes t() to the namespace passed to useTranslations)
  const primaryNamespace = namespaces.size > 0 ? [...namespaces][0] : null;

  while ((match = tPattern.exec(content)) !== null) {
    const key = match[1];
    // Skip dynamic/interpolated keys like types.${thread.type}
    if (key.includes('${') || key.includes('}')) continue;
    // Convert path-style keys (a/b/c) to namespace.dot notation (a.b.c)
    const normalizedKey = key.replace(/\//g, '.');
    // If key already contains the primary namespace as prefix, don't prepend
    if (primaryNamespace && normalizedKey.startsWith(primaryNamespace + '.')) {
      keysWithNamespace.add(normalizedKey);
    } else if (primaryNamespace) {
      keysWithNamespace.add(`${primaryNamespace}.${normalizedKey}`);
    } else {
      keysWithNamespace.add(normalizedKey);
    }
  }

  while ((match = tTemplatePattern.exec(content)) !== null) {
    const key = match[1];
    if (key.includes('${') || key.includes('}')) continue;
    const normalizedKey = key.replace(/\//g, '.');
    if (primaryNamespace && normalizedKey.startsWith(primaryNamespace + '.')) {
      keysWithNamespace.add(normalizedKey);
    } else if (primaryNamespace) {
      keysWithNamespace.add(`${primaryNamespace}.${normalizedKey}`);
    } else {
      keysWithNamespace.add(normalizedKey);
    }
  }

  return { keys: keysWithNamespace, namespaces };
}

if (!existsSync(DIR)) {
  console.error(`i18n-code-check: ${DIR} does not exist.`);
  process.exit(2);
}

const messagesDir = join(DIR, 'messages');
if (!existsSync(messagesDir)) {
  console.error(`i18n-code-check: ${messagesDir} does not exist.`);
  process.exit(2);
}

const enFile = join(messagesDir, 'en.json');
if (!existsSync(enFile)) {
  console.error(`i18n-code-check: en.json not found in ${messagesDir}.`);
  process.exit(2);
}

const enFlat = flatten(JSON.parse(readFileSync(enFile, 'utf8')));
const enKeys = new Set(Object.keys(enFlat));
console.log(`i18n-code-check: en.json has ${enKeys.size} keys.`);

const tsFiles = collectTsFiles(DIR);
console.log(`i18n-code-check: scanning ${tsFiles.length} .ts/.tsx files...`);

const allUsedKeys = new Set();
const allUsedNamespaces = new Set();
const fileKeyMap = new Map();

for (const file of tsFiles) {
  const { keys, namespaces } = extractKeysFromCode(file);
  if (keys.size || namespaces.size) {
    fileKeyMap.set(file, { keys, namespaces });
    for (const k of keys) allUsedKeys.add(k);
    for (const n of namespaces) allUsedNamespaces.add(n);
  }
}

console.log(`i18n-code-check: found ${allUsedKeys.size} unique t() keys (with namespace) and ${allUsedNamespaces.size} namespaces in code.`);

// Check each used key exists in en.json
let failed = 0;
const missingKeys = [];

for (const key of allUsedKeys) {
  if (!enKeys.has(key)) {
    missingKeys.push(key);
    failed++;
  }
}

// Also check namespaces exist as top-level keys in en.json
const missingNamespaces = [];
for (const ns of allUsedNamespaces) {
  if (!enKeys.has(ns) && !Object.keys(JSON.parse(readFileSync(enFile, 'utf8'))).includes(ns)) {
    missingNamespaces.push(ns);
    failed++;
  }
}

if (missingKeys.length) {
  console.error('\nMISSING keys in en.json (used in code but not defined):');
  for (const key of missingKeys) {
    const files = [];
    for (const [file, { keys }] of fileKeyMap) {
      if (keys.has(key)) files.push(file.replace(REPO + '/', ''));
    }
    console.error(`  ${key}`);
    console.error(`    used in: ${files.slice(0, 5).join(', ')}${files.length > 5 ? ' ...' : ''}`);
  }
}

if (missingNamespaces.length) {
  console.error('\nMISSING namespaces in en.json (used in getTranslations/useTranslations but not defined):');
  for (const ns of missingNamespaces) {
    const files = [];
    for (const [file, { namespaces }] of fileKeyMap) {
      if (namespaces.has(ns)) files.push(file.replace(REPO + '/', ''));
    }
    console.error(`  ${ns}`);
    console.error(`    used in: ${files.slice(0, 5).join(', ')}${files.length > 5 ? ' ...' : ''}`);
  }
}

if (failed) {
  console.error(`\ni18n-code-check: FAILED - ${missingKeys.length} missing keys, ${missingNamespaces.length} missing namespaces.`);
  process.exit(1);
}

console.log('i18n-code-check: PASS - all t() keys and namespaces exist in en.json.');