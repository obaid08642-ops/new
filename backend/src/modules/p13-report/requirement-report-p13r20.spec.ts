import * as fs from 'fs';
import * as path from 'path';

// P13-R20: the final requirement report lists every Phase 13 item with a
// verdict and evidence. Red on the base: the report file does not exist.
const REPORT = path.join(__dirname, '..', '..', '..', '..', 'docs', 'audit', '06_P13_REQUIREMENT_REPORT.md');
const VERDICTS = ['PASS', 'PARTIAL', 'FAIL', 'MISSING', 'MOCK', 'BLOCKED', 'PENDING'];

describe('P13-R20 requirement report', () => {
  it('covers every R-item R1..R21 with a valid verdict and evidence', () => {
    const text = fs.readFileSync(REPORT, 'utf8');
    for (let i = 1; i <= 21; i++) {
      // Header-anchored: a bare "13.R2" search would also match 13.R20/R21.
      const head = `### 13.R${i} `;
      expect(text).toContain(head);
      const at = text.indexOf(head);
      const next = text.indexOf('### 13.R', at + 1);
      const section = text.slice(at, next === -1 ? undefined : next);
      const verdict = (section.match(/Verdict:\s*([A-Z]+)/) || [])[1];
      expect(VERDICTS).toContain(verdict);
      const evidence = (section.match(/Evidence:\s*([^\n]+)/) || [])[1];
      expect((evidence || '').trim().length).toBeGreaterThan(10);
    }
  });

  it('names the pending work explicitly instead of silently claiming completion', () => {
    const text = fs.readFileSync(REPORT, 'utf8');
    expect(text).toContain('13.R21');
    expect(text).toContain('PENDING');
  });
});
