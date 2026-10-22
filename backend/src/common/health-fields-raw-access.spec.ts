/**
 * Phase 16.9 - a raw driver access to a collection that holds encrypted health fields bypasses the model, so it must be
 * reviewed. This spec lists every file that calls `collection('<name>')` for those collections and fails when a new file or a
 * higher count appears: whoever adds one has to decide, with `protectHealthDoc` / `revealHealthDoc` from common/health-fields,
 * whether it writes or returns a health field, and then add it here. (Counts and counts-by-projection were reviewed on 2026-10-17:
 * every site below either projects only non-health fields, only counts, or already protects/reveals.)
 */
import * as fs from 'fs';
import * as path from 'path';
import { HEALTH_FIELDS } from './health-fields';

const SRC = path.resolve(__dirname, '..');
const REVIEWED: Record<string, Record<string, number>> = {
  'common/health-fields.ts': { prescriptions: 1 },                                   // the doc comment
  'modules/admin/enterprise/admin-search.controller.ts': { appointments: 1 },        // projection id/status/doctor/slot
  'modules/admin/notification-center/admin-notification-center.module.ts': { appointments: 2 }, // reminder flags
  'modules/care/care-compat.controller.ts': { appointments: 1 },                     // returns status/price/notes (top-level), not the summary
  'modules/care/care.service.ts': { appointments: 1 },                               // projection doctor/slot
  'modules/compat/admin-spa.module.ts': { appointments: 5 },                         // counts, group-bys, a feed of id/status/createdAt
  'modules/family/family.service.ts': { prescriptions: 1, appointments: 1 },         // prescriptions revealed; appointments projection has no health field
  'modules/health/health.service.ts': { medicalreports: 1, prescriptions: 1 },       // reports list has no health field; prescriptions revealed
  'modules/medical-orders/medical-orders.service.ts': { appointments: 1, prescriptions: 1 }, // M2 order: ownership + existence checks, projections carry no health field
  'modules/instant-consultation/instant-consultation.service.ts': { appointments: 1 }, // M8: inserts the visit row (no health field; no notes, no records)
  'modules/mcp/agent-tools.service.ts': { appointments: 1 },                         // state check
  'modules/medical-reports/medical-reports.controller.ts': { appointments: 1, prescriptions: 1 }, // timeline projections
  'modules/nabd-extensions/nabd-extensions.service.ts': { appointments: 1 },         // fraud aggregate
  'modules/ops/ops.controller.ts': { appointments: 2 },                              // counts
  'modules/pharmacy/services/pharmacy-order.service.ts': { prescriptions: 2 },       // ownership check, projection id
  'modules/pharmacy/services/rx-rules.ts': { prescriptions: 1 },                     // existence check
  'modules/pharmacy/services/pharmacy-refill.service.ts': { prescriptions: 3 },       // refill: projection id/valid_until/refills_remaining only; the refill counter is a non-health update
  'modules/provider-ops/provider-ops.module.ts': { consultationnotes: 1, prescriptions: 1 }, // both writes protected
  'modules/provider-production/provider-production.module.ts': { appointments: 1 },  // ownership check
  'modules/provider/provider-facility.controller.ts': { appointments: 2 },           // schedule list, distinct patient ids
  'modules/provider/provider.controllers.ts': { medicalreports: 2, appointments: 1 }, // report inserts protected; sick-leave reason encrypted
  'modules/referral/referral.service.ts': { appointments: 1 },                       // count
  'modules/timeline/timeline-compat.controller.ts': { medicalreports: 2 },           // list has no health field; byId revealed
  'modules/users/users.service.ts': { medicalreports: 1 },                           // attachment size aggregate
};

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (p.endsWith('.ts') && !p.endsWith('.spec.ts') && !p.endsWith('.e2e-spec.ts')) out.push(p);
  }
  return out;
}

describe('16.9 raw access to collections with encrypted health fields', () => {
  const names = Object.keys(HEALTH_FIELDS);
  const pattern = new RegExp(`collection\\(\\s*['"](${names.join('|')})['"]\\s*\\)`, 'g');
  const found: Record<string, Record<string, number>> = {};
  for (const file of walk(SRC)) {
    const rel = path.relative(SRC, file).split(path.sep).join('/');
    for (const m of fs.readFileSync(file, 'utf8').matchAll(pattern)) {
      found[rel] ??= {};
      found[rel][m[1]] = (found[rel][m[1]] ?? 0) + 1;
    }
  }

  it('has no raw access that has not been reviewed', () => {
    const unreviewed: string[] = [];
    for (const [file, counts] of Object.entries(found)) {
      for (const [name, n] of Object.entries(counts)) {
        const allowed = REVIEWED[file]?.[name] ?? 0;
        if (n > allowed) unreviewed.push(`${file}: ${n} x collection('${name}') (reviewed: ${allowed})`);
      }
    }
    expect(unreviewed).toEqual([]);
  });

  it('the reviewed list has no stale entry (it only shrinks)', () => {
    const stale: string[] = [];
    for (const [file, counts] of Object.entries(REVIEWED)) {
      for (const [name, n] of Object.entries(counts)) {
        const have = found[file]?.[name] ?? 0;
        if (have < n) stale.push(`${file}: reviewed ${n} x '${name}', found ${have}`);
      }
    }
    expect(stale).toEqual([]);
  });

  it('every raw writer of a health collection protects, every raw reader that returns text reveals', () => {
    const must: Array<[string, string]> = [
      ['modules/provider-ops/provider-ops.module.ts', "protectHealthDoc('prescriptions'"],
      ['modules/provider-ops/provider-ops.module.ts', "protectHealthDoc('consultationnotes'"],
      ['modules/provider/provider.controllers.ts', "protectHealthDoc('medicalreports'"],
      ['modules/health/health.service.ts', "revealHealthDocs('prescriptions'"],
      ['modules/family/family.service.ts', "revealHealthDocs('prescriptions'"],
      ['modules/timeline/timeline-compat.controller.ts', "revealHealthDoc('medicalreports'"],
      ['modules/users/pdpl.service.ts', 'revealHealthDocs(collection'],
    ];
    const missing = must.filter(([file, needle]) => !fs.readFileSync(path.join(SRC, file), 'utf8').includes(needle)).map(([f, n]) => `${f} lacks ${n}`);
    expect(missing).toEqual([]);
  });
});
