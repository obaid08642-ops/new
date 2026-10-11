/**
 * Phase 16.1 — secrets never enter the repository.
 * The plan's Verify: "a `git check-ignore` test for `.env` in each app".
 * The examples must stay committable, so they are checked too.
 */
import { execFileSync } from 'child_process';
import * as path from 'path';

const REPO = path.join(__dirname, '..', '..', '..');
const APPS = ['backend', 'patient-app', 'patient-web', 'admin', 'provider-app', 'packages/web-patient', 'packages/web-admin'];

function ignored(relPath: string): boolean {
  try {
    execFileSync('git', ['check-ignore', '-q', relPath], { cwd: REPO, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

describe('Phase 16.1 every app ignores its environment files', () => {
  it.each(APPS)('%s/.env is ignored', (app) => {
    expect(ignored(`${app}/.env`)).toBe(true);
  });

  it.each(APPS)('%s/.env.<anything> is ignored', (app) => {
    expect(ignored(`${app}/.env.production`)).toBe(true);
    expect(ignored(`${app}/.env.staging`)).toBe(true);
    expect(ignored(`${app}/.env.local`)).toBe(true);
  });

  it.each(APPS)('%s keeps its .env.example committable', (app) => {
    // The examples are the templates the plan says must stay in the repository.
    expect(ignored(`${app}/.env.example`)).toBe(false);
  });

  it('the rendered coturn config with the live TURN secret stays ignored', () => {
    expect(ignored('deploy/coturn/turnserver.rendered.conf')).toBe(true);
  });

  it('the gitleaks workflow is committed and scans the full history', () => {
    const yaml = require('fs').readFileSync(path.join(REPO, '.github/workflows/security.yml'), 'utf8');
    expect(yaml).toMatch(/gitleaks/);
    expect(yaml).toMatch(/fetch-depth:\s*0/);
    expect(yaml).toMatch(/pull_request/);
  });
});