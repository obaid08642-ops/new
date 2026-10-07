#!/usr/bin/env node
/**
 * P15.10 — device-farm runner for provider-app.
 *
 * Turns `firebase-testlab.yml` into concrete Firebase Test Lab invocations, and refuses
 * to run (loudly, with a non-zero exit) when the credentials or tooling are missing.
 * It never fabricates a report: if it cannot reach a farm, it says so and stops.
 *
 *   node devicefarm/run.js --validate          # offline: check the matrix, print the plan
 *   node devicefarm/run.js --plan             # same, explicit
 *   node devicefarm/run.js --run              # execute against the farm (needs gcloud)
 *
 * BLOCKED in this worktree: `--run` needs a Firebase Test Lab / BrowserStack account,
 * billing, and the `gcloud` CLI. None are available here, so only `--validate` /
 * `--plan` have been executed. See README.md.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

let yaml;
try {
  yaml = require('js-yaml');
} catch {
  console.error('FATAL: js-yaml is not resolvable. Run `npm install` in provider-app first.');
  process.exit(2);
}

const MATRIX_PATH = path.join(__dirname, 'firebase-testlab.yml');
const argv = process.argv.slice(2);
const wantRun = argv.includes('--run');
const wantHelp = argv.includes('--help') || argv.length === 0;

function fail(msg) {
  console.error(`\nBLOCKED: ${msg}\n`);
  process.exit(3);
}

function loadMatrix() {
  if (!fs.existsSync(MATRIX_PATH)) fail(`matrix file not found: ${MATRIX_PATH}`);
  let doc;
  try {
    doc = yaml.load(fs.readFileSync(MATRIX_PATH, 'utf8'));
  } catch (e) {
    fail(`matrix file is not valid YAML: ${e.message}`);
  }
  if (!doc || !Array.isArray(doc.devices) || doc.devices.length === 0) {
    fail('matrix file has no `devices` list');
  }
  if (!Array.isArray(doc.environments) || doc.environments.length === 0) {
    fail('matrix file has no `environments` list');
  }
  return doc;
}

/** Structural checks that catch a matrix that would silently under-test the contract. */
function validate(doc) {
  const problems = [];
  const requiredClasses = ['small-phone', 'large-phone', 'tablet', 'low-end-android', 'no-google-services'];
  const classes = new Set(doc.devices.map((d) => d.class));
  for (const cls of requiredClasses) {
    if (!classes.has(cls)) problems.push(`no device covers the required class "${cls}"`);
  }

  // Model ids differ per provider ("iphone-se-3" vs "Huawei P20"), so match on a
  // punctuation-free form rather than on any one provider's spelling.
  const compact = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const models = doc.devices.map((d) => `${compact(d.model)} ${compact(d.model_bs)}`).join(' ');
  if (!models.includes('iphonese')) problems.push('no iPhone SE device (contract requires it)');
  if (!models.includes('promax')) problems.push('no iPhone Pro Max device (contract requires it)');
  if (!models.includes('huawei')) problems.push('no Huawei device (contract requires a no-Google-services device)');

  const lowEnd = doc.devices.find((d) => d.class === 'low-end-android');
  if (lowEnd && typeof lowEnd.ramGb === 'number' && !(lowEnd.ramGb >= 2 && lowEnd.ramGb <= 3)) {
    problems.push(`low-end-android ramGb=${lowEnd.ramGb} is outside the 2–3 GB the contract asks for`);
  }

  const localeNames = doc.environments.map((e) => e.locale);
  for (const locale of ['ar', 'en']) {
    if (!localeNames.includes(locale)) problems.push(`no "${locale}" environment`);
  }
  if (!doc.environments.some((e) => e.darkMode)) problems.push('no dark-mode environment');
  if (!doc.environments.some((e) => Number(e.fontScale) >= 2)) problems.push('no font-scale 200% environment');

  if (!doc.severity?.blocking?.length) problems.push('no `severity.blocking` list: nothing can fail the gate');

  const missingBlocking = doc.devices.filter((d) => d.blocking === undefined).map((d) => d.id);
  if (missingBlocking.length) problems.push(`devices without an explicit blocking flag: ${missingBlocking.join(', ')}`);

  return problems;
}

/** Firebase Test Lab model ids, per platform. */
const IOS_MODELS = new Set(['iphone-se-3', 'iphone-15-pro-max', 'ipad-pro-11']);
const ANDROID_MODELS = new Set(['pixel-2', 'pixel-8-pro', 'tablet-7-in', 'moto-g5-plus']);

const FLOW = '.maestro/provider-smoke.yaml';

/**
 * One invocation per (device × environment) — `gcloud firebase test` takes a single
 * locale per run, so a matrix cannot be expressed in one command.
 *
 * Dark mode and font scale are not gcloud flags; they are applied by the test flow
 * (`.maestro/provider-smoke.yaml`), which is why the flows are committed alongside the
 * matrix instead of the matrix trying to express them.
 */
function buildPlan(doc) {
  const plan = [];
  for (const device of doc.devices) {
    if (device.provider === 'browserstack') {
      // Firebase has no Huawei image; this device is executed by the second provider.
      plan.push({
        id: device.id,
        provider: 'browserstack',
        device: device.model_bs,
        osVersion: device.os_bs,
        blocking: device.blocking,
        environments: doc.environments.map((e) => e.name),
        command: null,
        reason: 'no Firebase Test Lab image for Huawei; requires BrowserStack App Automate',
      });
      continue;
    }
    const platformKey = device.platform === 'IOS' ? 'ios' : 'android';
    const known = (platformKey === 'ios' ? IOS_MODELS : ANDROID_MODELS).has(device.model);
    const steps = [];
    for (const env of doc.environments) {
      const vars = [
        `locale=${env.locale}`,
        `darkMode=${env.darkMode}`,
        `fontScale=${env.fontScale}`,
      ].join(',');
      const args = [
        'firebase', 'test', platformKey, 'run',
        `--device ${device.model}`,
        `--device-locale ${env.locale}`,
        `--environment-variables ${vars}`,
        `--test-spec ${FLOW}`,
        '--timeout 10m',
      ];
      steps.push({
        environment: env.name,
        command: known ? `gcloud ${args.join(' ')}` : null,
      });
    }
    plan.push({
      id: device.id,
      provider: 'firebase-test-lab',
      device: device.model,
      osVersion: doc.minimumOs[platformKey],
      blocking: device.blocking,
      environments: doc.environments.map((e) => e.name),
      commands: steps,
      reason: known ? null : `unknown Firebase model id "${device.model}"`,
    });
  }
  return plan;
}

function printPlan(doc, plan) {
  console.log(`provider-app device-farm plan — ${plan.length} device(s) × ${doc.environments.length} environment(s) = ${plan.length * doc.environments.length} run(s)\n`);
  for (const p of plan) {
    const tag = p.blocking ? 'BLOCKING' : 'non-blocking';
    console.log(`  [${tag}] ${p.id}  (${p.provider}, min OS ${p.osVersion})`);
    console.log(`      device : ${p.device}`);
    if (p.reason) console.log(`      note   : ${p.reason}`);
    if (p.commands) {
      console.log(`      flow   : ${FLOW}`);
      for (const s of p.commands) {
        console.log(`        - ${s.environment.padEnd(18)} ${s.command || '(skipped: ' + p.reason + ')'}`);
      }
    }
  }
  console.log(`\nblocking verdicts are defined in severity.blocking (${doc.severity.blocking.length} criteria).`);
}

function main() {
  if (wantHelp) {
    console.log('usage: node devicefarm/run.js [--validate | --plan | --run]');
    process.exit(0);
  }

  const doc = loadMatrix();
  const problems = validate(doc);
  if (problems.length) {
    console.error('matrix validation FAILED:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`matrix OK: ${doc.devices.length} devices, ${doc.environments.length} environments, minimum iOS ${doc.minimumOs.ios} / Android ${doc.minimumOs.android}\n`);

  const plan = buildPlan(doc);
  printPlan(doc, plan);

  if (!wantRun) {
    console.log('\n(--validate/--plan only: no farm contacted, no report produced)');
    return;
  }

  // ── the actual farm run ──────────────────────────────────────────────────
  try {
    execFileSync('gcloud', ['--version'], { stdio: 'pipe' });
  } catch {
    fail('`gcloud` is not installed. Firebase Test Lab is driven through the gcloud CLI.');
  }
  for (const key of ['GOOGLE_APPLICATION_CREDENTIALS', 'SENTRY_AUTH_TOKEN']) {
    if (!process.env[key]) fail(`${key} is not set (required to upload symbols and source maps with the run)`);
  }
  fail(
    'the farm account is not configured in this environment. This script refuses to ' +
      'print a fabricated "0 blocking issues" report — wire real credentials and run it.',
  );
}

main();