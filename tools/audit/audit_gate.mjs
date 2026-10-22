#!/usr/bin/env node
// Phase 16.7 - dependency audit as a CI gate for every app.
//   node tools/audit/audit_gate.mjs <app>        app = backend | admin | patient-web | patient-app | provider-app
//   node tools/audit/audit_gate.mjs <app> --print  print the high/critical package names (to refresh the baseline)
// Fails on a high or critical runtime advisory that is not listed in tools/audit/audit-baseline.json, and on a baseline
// entry that is no longer vulnerable (so the baseline only shrinks). Dev-only tooling is not audited (--omit=dev / --prod).
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const app = process.argv[2];
const print = process.argv.includes('--print');
const baseline = JSON.parse(readFileSync(join(root, 'tools/audit/audit-baseline.json'), 'utf8'));
if (!app || !(app in baseline.apps)) {
  console.error(`usage: audit_gate.mjs <${Object.keys(baseline.apps).join('|')}> [--print]`);
  process.exit(2);
}
const cwd = join(root, app);
const pnpm = app === 'patient-web';
const run = spawnSync(pnpm ? 'pnpm' : 'npm', pnpm ? ['audit', '--prod', '--json'] : ['audit', '--omit=dev', '--json'], { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
let report;
try { report = JSON.parse(run.stdout); } catch { console.error(`cannot read the audit of ${app}:\n${(run.stdout || run.stderr || '').slice(0, 600)}`); process.exit(2); }

const found = new Map();   // package -> severity
const keep = (name, sev) => { if (sev === 'high' || sev === 'critical') found.set(name, found.get(name) === 'critical' ? 'critical' : sev); };
if (pnpm) for (const a of Object.values(report.advisories ?? {})) keep(a.module_name, a.severity);
else for (const [name, v] of Object.entries(report.vulnerabilities ?? {})) keep(name, v.severity);

if (print) { console.log(JSON.stringify(Object.fromEntries([...found].sort()), null, 2)); process.exit(0); }

const known = baseline.apps[app];
const fresh = [...found].filter(([n]) => !(n in known));
const stale = Object.keys(known).filter((n) => !found.has(n));
const old = [...found].filter(([n]) => n in known);
console.log(`${app}: ${found.size} high/critical runtime package(s); ${old.length} in the baseline, ${fresh.length} new`);
if (old.length) console.log(`  baseline (${baseline.reasons[app] ?? 'see tools/audit/audit-baseline.json'}): ${old.map(([n, s]) => `${n} (${s})`).join(', ')}`);
if (fresh.length) { console.error('NEW high/critical runtime vulnerabilities:'); for (const [n, s] of fresh) console.error(`  - ${n} (${s})`); }
if (stale.length) { console.error('No longer vulnerable, remove from tools/audit/audit-baseline.json:'); for (const n of stale) console.error(`  - ${n}`); }
process.exit(fresh.length || stale.length ? 1 : 0);
