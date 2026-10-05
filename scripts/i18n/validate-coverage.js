#!/usr/bin/env node
/**
 * i18n Translation Coverage Validator
 * Validates 100% translation coverage across all 6 locales for all apps
 */

const fs = require('fs');
const path = require('path');

const LOCALES = ['ar', 'en', 'hi', 'ur', 'fil', 'bn'];

const APPS = [
  {
    name: 'patient-web',
    basePath: 'patient-web/messages',
    sourceLocale: 'en',
    filePattern: (locale) => `${locale}.json`,
  },
  {
    name: 'patient-app',
    basePath: 'patient-app/src/i18n/locales',
    sourceLocale: 'en',
    filePattern: (locale) => `${locale}.json`,
  },
  {
    name: 'provider-app',
    basePath: 'provider-app/src/i18n/locales',
    sourceLocale: 'en',
    filePattern: (locale) => `${locale}.json`,
  },
  {
    name: 'admin',
    basePath: 'admin/messages',
    sourceLocale: 'en',
    filePattern: (locale) => `${locale}.json`,
  },
  {
    name: 'backend-errors',
    basePath: 'backend/src/common',
    sourceLocale: 'en',
    filePattern: () => 'errors.i18n.json',
  },
  {
    name: 'backend-notifications',
    basePath: 'backend/src/common/i18n',
    sourceLocale: 'en',
    filePattern: () => 'notifications.i18n.json',
  },
  {
    name: 'backend-emails',
    basePath: 'backend/src/common/i18n',
    sourceLocale: 'en',
    filePattern: () => 'emails.i18n.json',
  },
  {
    name: 'backend-sms',
    basePath: 'backend/src/common/i18n',
    sourceLocale: 'en',
    filePattern: () => 'sms.i18n.json',
  },
  {
    name: 'backend-pdf',
    basePath: 'backend/src/common/i18n',
    sourceLocale: 'en',
    filePattern: () => 'pdf.i18n.json',
  },
];

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

function loadJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function findProjectRoot(startDir) {
  let dir = startDir;
  while (dir !== path.parse(dir).root) {
    if (fs.existsSync(path.join(dir, 'patient-web')) &&
        fs.existsSync(path.join(dir, 'patient-app')) &&
        fs.existsSync(path.join(dir, 'backend'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return startDir;
}

function validateApp(app, projectRoot) {
  const results = [];
  const sourcePath = path.join(projectRoot, app.basePath, app.filePattern(app.sourceLocale));
  const sourceData = loadJson(sourcePath);

  if (!sourceData) {
    console.error(`❌ ${app.name}: Source file not found: ${sourcePath}`);
    return results;
  }

  const sourceKeys = new Set(flattenKeys(sourceData));
  console.log(`📋 ${app.name}: Source (${app.sourceLocale}) has ${sourceKeys.size} keys`);

  for (const locale of LOCALES) {
    if (locale === app.sourceLocale) {
      results.push({
        app: app.name,
        locale,
        missingKeys: [],
        extraKeys: [],
        totalKeys: sourceKeys.size,
        coverage: 100,
      });
      continue;
    }

    const localePath = path.join(projectRoot, app.basePath, app.filePattern(locale));
    const localeData = loadJson(localePath);

    if (!localeData) {
      console.error(`❌ ${app.name}: Locale file not found: ${localePath}`);
      results.push({
        app: app.name,
        locale,
        missingKeys: Array.from(sourceKeys),
        extraKeys: [],
        totalKeys: sourceKeys.size,
        coverage: 0,
      });
      continue;
    }

    const localeKeys = new Set(flattenKeys(localeData));
    const missingKeys = Array.from(sourceKeys).filter((k) => !localeKeys.has(k));
    const extraKeys = Array.from(localeKeys).filter((k) => !sourceKeys.has(k));
    const coverage = ((sourceKeys.size - missingKeys.length) / sourceKeys.size) * 100;

    results.push({
      app: app.name,
      locale,
      missingKeys,
      extraKeys,
      totalKeys: sourceKeys.size,
      coverage,
    });

    if (missingKeys.length > 0) {
      console.error(`  ❌ ${locale}: Missing ${missingKeys.length} keys (${coverage.toFixed(1)}%)`);
      missingKeys.slice(0, 10).forEach((k) => console.error(`     - ${k}`));
      if (missingKeys.length > 10) console.error(`     ... and ${missingKeys.length - 10} more`);
    } else {
      console.log(`  ✅ ${locale}: 100% coverage (${sourceKeys.size} keys)`);
    }

    if (extraKeys.length > 0) {
      console.warn(`  ⚠️ ${locale}: Has ${extraKeys.length} extra keys not in source`);
    }
  }

  return results;
}

function main() {
  const projectRoot = findProjectRoot(process.cwd());
  console.log(`🔍 Validating i18n translation coverage from ${projectRoot}...\n`);

  let allPassed = true;
  const allResults = [];

  for (const app of APPS) {
    console.log(`\n📦 Checking ${app.name}...`);
    const results = validateApp(app, projectRoot);
    allResults.push(...results);

    const failed = results.filter((r) => r.coverage < 100);
    if (failed.length > 0) {
      allPassed = false;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));

  const byApp = new Map();
  for (const r of allResults) {
    if (!byApp.has(r.app)) byApp.set(r.app, []);
    byApp.get(r.app).push(r);
  }

  for (const [app, results] of byApp) {
    const avgCoverage = results.reduce((sum, r) => sum + r.coverage, 0) / results.length;
    const status = avgCoverage === 100 ? '✅' : '❌';
    console.log(`${status} ${app}: ${avgCoverage.toFixed(1)}% average coverage`);
  }

  console.log('='.repeat(60));

  if (!allPassed) {
    console.log('\n❌ VALIDATION FAILED: Some translations are missing');
    process.exit(1);
  } else {
    console.log('\n✅ ALL CHECKS PASSED: 100% translation coverage achieved');
    process.exit(0);
  }
}

main();
