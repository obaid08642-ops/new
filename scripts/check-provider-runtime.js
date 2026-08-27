#!/usr/bin/env node
/*
 * Release gate for the provider source archives.
 * It checks only concrete runtime regressions that were remediated; it does not
 * treat fixtures, documentation, or test data as provider-runtime violations.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const targets = [
  ['NabdProvider-provider.zip', 'src/screens/doctor/DoctorDashboard.tsx'],
  ['NabdProvider-provider.zip', 'src/screens/pharmacy/PharmacyDashboard.tsx'],
  ['NabdProvider-provider.zip', 'src/screens/lab/LabDashboard.tsx'],
  ['NabdProvider-provider.zip', 'src/screens/radiology/RadiologyDashboard.tsx'],
  ['NabdProvider-provider.zip', 'src/screens/facility/FacilityDashboard.tsx'],
  ['NabdProvider-provider.zip', 'src/screens/shared/BlueprintScreens.tsx'],
  ['nabdah-backend.zip', 'src/modules/provider-production/provider-production.module.ts'],
];
const banned = [
  /test_patient/,
  /Simulate Drug Scan/,
  /lab_report_signature\.pdf/,
  /HTTPS URL for the signed PDF report/,
  /storage\.nabdah\.com\/reports/,
  /\/provider\/features\//,
  /showOverrideModal/,
  /SimulatedFeaturesController/,
];
let failed = false;
for (const [archive, entry] of targets) {
  const archivePath = path.join(root, archive);
  if (!fs.existsSync(archivePath)) throw new Error(`Missing source archive: ${archive}`);
  let source;
  try {
    source = execFileSync('unzip', ['-p', archivePath, entry], { encoding: 'utf8' });
  } catch {
    throw new Error(`Missing ${entry} in ${archive}`);
  }
  for (const pattern of banned) {
    if (pattern.test(source)) {
      console.error(`RUNTIME_DATA_GATE=FAIL ${archive}:${entry} matches ${pattern}`);
      failed = true;
    }
  }
}
if (failed) process.exit(1);
console.log('RUNTIME_DATA_GATE=PASS');
