// ACCEPTANCE — OpenCode review 2026-10-05 (REVIEW_OPENCODE_P15_P21.md, item C).
// Written by the reviewer; the implementing agent makes it pass and may not edit it.
// The 2026-10 "consolidate" scripts contradict the approved Phase 5 decisions
// (REVIEW_P5.md): --apply dropped the source collection (7 of 8), some target the
// wrong collection or drop collections that still have live writers, they default to
// a local Mongo URI and their report always said writes_performed:false.
import * as fs from 'fs';
import * as path from 'path';

const DIR = path.join(__dirname, '../../scripts/migrations');
const scripts = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => /^2026-10-/.test(f)) : [];

describe('2026-10 migration scripts respect Phase 5 (approved) and are safe', () => {
  for (const f of scripts) {
    const t = fs.readFileSync(path.join(DIR, f), 'utf8');
    it(`${f}: never drops a collection`, () => {
      expect(t).not.toMatch(/\.drop\(\s*\)|dropCollection\(/);
    });
    it(`${f}: requires an explicit MONGODB_URI (no default host)`, () => {
      expect(t).not.toMatch(/mongodb:\/\/(localhost|127\.0\.0\.1)/);
    });
    it(`${f}: reports what it actually wrote`, () => {
      expect(t).not.toMatch(/writes_performed:\s*false/);
    });
  }
  it('no script re-merges doctor_appointments or renames auditlogs (approved P5 scripts own those)', () => {
    expect(scripts.filter((f) => /doctor-appointments|auditlogs/.test(f))).toEqual([]);
  });
});
