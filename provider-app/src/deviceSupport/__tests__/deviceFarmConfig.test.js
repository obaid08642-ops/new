/**
 * P15.10 — guards the device-farm configuration.
 *
 * The farm itself cannot run here (paid external service, no account, no docker), so
 * what IS enforced is that the committed configuration keeps describing the coverage
 * the phase contract demands. If someone drops the Huawei entry or the 200 % font-scale
 * environment, this fails instead of the matrix quietly under-testing the release gate.
 *
 * BLOCKED: device farm is a paid external service with no account configured — no
 * "0 blocking issues" report is produced or asserted here.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const DEVICE_FARM_DIR = path.resolve(__dirname, '../../../devicefarm');
const RUNNER = path.join(DEVICE_FARM_DIR, 'run.js');
const MATRIX = path.join(DEVICE_FARM_DIR, 'firebase-testlab.yml');
const FLOW = path.resolve(__dirname, '../../../.maestro/provider-smoke.yaml');

function runRunner(args) {
  try {
    return { code: 0, stdout: execFileSync('node', [RUNNER, ...args], { encoding: 'utf8' }) };
  } catch (e) {
    return { code: e.status ?? 1, stdout: `${e.stdout || ''}${e.stderr || ''}` };
  }
}

describe('P15.10 device-farm configuration', () => {
  it('ships the matrix, the runner and the smoke flow', () => {
    expect(fs.existsSync(MATRIX)).toBe(true);
    expect(fs.existsSync(RUNNER)).toBe(true);
    expect(fs.existsSync(FLOW)).toBe(true);
  });

  it('the runner validates the matrix offline and exits 0', () => {
    const r = runRunner(['--validate']);
    expect(r.stdout).toContain('matrix OK');
    expect(r.code).toBe(0);
  });

  it('the runner refuses to fabricate a report when asked to run without a farm', () => {
    // No gcloud, no credentials in this environment: it must say BLOCKED, not print a verdict.
    const r = runRunner(['--run']);
    expect(r.code).not.toBe(0);
    expect(r.stdout).toMatch(/BLOCKED/);
    expect(r.stdout).not.toMatch(/0 blocking issues/i);
  });

  it('covers every device class the contract names', () => {
    const out = runRunner(['--validate']).stdout;
    for (const label of ['small-phone', 'large-phone', 'tablet', 'low-end-android', 'no-google-services']) {
      expect(out.length).toBeGreaterThan(0);
    }
    const matrix = fs.readFileSync(MATRIX, 'utf8');
    for (const label of ['small-phone', 'large-phone', 'tablet', 'low-end-android', 'no-google-services']) {
      expect(matrix).toContain(label);
    }
    // Named devices the contract calls out explicitly.
    expect(matrix).toContain('iphone-se-3');
    expect(matrix).toContain('iphone-15-pro-max');
    expect(matrix).toContain('Huawei P20');
  });

  it('crosses the matrix with ar/en, dark mode and font scale 200%', () => {
    const matrix = fs.readFileSync(MATRIX, 'utf8');
    expect(matrix).toContain('locale: ar');
    expect(matrix).toContain('locale: en');
    expect(matrix).toContain('darkMode: true');
    expect(matrix).toContain('fontScale: 2.0');
  });

  it('records the minimum OS the app is actually compiled against', () => {
    const matrix = fs.readFileSync(MATRIX, 'utf8');
    expect(matrix).toContain('ios: "16.4"');
    expect(matrix).toContain('android: "7"');
  });

  it('the smoke flow uses strings that really exist in the welcome screen', () => {
    // The screens carry no testIDs, so the flow selects on literal text. If those
    // literals disappear from AuthScreens.tsx the flow is stale and must be revisited.
    const auth = fs.readFileSync(path.resolve(__dirname, '../../screens/auth/AuthScreens.tsx'), 'utf8');
    for (const literal of ['Nabd Plus', 'Medical Jobs', 'Drug Index', 'Log In']) {
      expect(auth).toContain(literal);
      expect(fs.readFileSync(FLOW, 'utf8')).toContain(literal.split(' ')[0]);
    }
    for (const literal of ['الوظائف الطبية', 'دليل الأدوية', 'سجّل الدخول']) {
      expect(auth).toContain(literal);
    }
  });
});