// ACCEPTANCE — OpenCode review 2026-10-05 (REVIEW_OPENCODE_P15_P21.md, item F).
// Written by the reviewer; the implementing agent makes it pass and may not edit it.
// 52dc3644 pinned the security workflows (CodeQL, gitleaks, dependency-review, ZAP,
// lighthouse, setup-python, SBOM, provenance) to invented SHAs such as
// 8b8b8b8b... / b5c8c8e4c8c8... (some not even 40 characters), so those jobs cannot
// resolve their actions. Every `uses:` must be a version tag or a real 40-hex SHA
// (no repeating filler), as it was before 52dc3644. CI changes need owner approval.
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '../../..');
const DIRS = [path.join(ROOT, '.github/workflows')];
const files = DIRS.flatMap((d) => (fs.existsSync(d) ? fs.readdirSync(d).filter((f) => /\.ya?ml$/.test(f)).map((f) => path.join(d, f)) : []));

describe('GitHub Action pins resolve', () => {
  for (const file of files) {
    it(path.basename(file), () => {
      const bad: string[] = [];
      for (const m of fs.readFileSync(file, 'utf8').matchAll(/uses:\s*([^\s@]+)@([^\s#]+)/g)) {
        const ref = m[2];
        if (/^v?\d+(\.\d+)*$/.test(ref) || /^(main|master)$/.test(ref)) continue;
        const sha = /^[0-9a-f]+$/.test(ref);
        if (!sha) continue;
        if (ref.length !== 40 || /(..)\1{4,}/.test(ref) || /(.)\1{5,}/.test(ref)) bad.push(`${m[1]}@${ref}`);
      }
      expect(bad).toEqual([]);
    });
  }
  it('no workflow lives where GitHub never runs it', () => {
    const stray = ['patient-web', 'admin', 'patient-app', 'provider-app', 'backend']
      .filter((p) => fs.existsSync(path.join(ROOT, p, '.github/workflows')));
    expect(stray).toEqual([]);
  });
});
