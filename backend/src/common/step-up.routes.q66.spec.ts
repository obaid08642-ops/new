// Q66 spirit: every money/privilege route must carry @StepUp. This spec
// fails when the decorator is removed from any listed route. It inspects
// the source (same technique as brand-name.r7.spec), so it needs no DB.
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');

// [file, route-decorator marker] — the marker line must have `@StepUp()`
// on one of the ~6 lines directly above it (other decorators may sit between).
const GUARDED: Array<[string, string]> = [
  ['modules/legal/legal.module.ts', "@Put('admin/legal/commissions-policy')"],
  ['modules/returns/returns.controller.ts', "@Post(':id/decide')"],
  ['modules/patient-ux/patient-ux.module.ts', "@Post(':id/decide')"],
  ['modules/insurance/insurance.module.ts', "@Post(':id/decide')"],
  ['modules/insurance/insurance.module.ts', "@Post('companies')"],
  ['modules/insurance/insurance.module.ts', "@Patch('companies/:id')"],
  ['modules/insurance/insurance.module.ts', "@Delete('companies/:id')"],
  ['modules/insurance/insurance.module.ts', "@Post('companies/:id/reactivate')"],
  ['modules/insurance/insurance.module.ts', "@Delete('companies/:companyId/networks/:networkId')"],
  ['modules/insurance/insurance.module.ts', "@Post('companies/:companyId/networks')"],
  ['modules/insurance/insurance.module.ts', "@Post('networks/:networkId/rules')"],
  ['modules/compat/admin-spa.module.ts', "@Put('theme')"],
  ['modules/compat/admin-spa.module.ts', "@Put('permissions')"],
  ['modules/compat/admin-spa.module.ts', "@Put('workflows')"],
  ['modules/admin/enterprise/admin-security.controller.ts', "@Post('rbac/roles')"],
  ['modules/admin/enterprise/admin-security.controller.ts', "@Patch('rbac/roles/:id')"],
  ['modules/admin/enterprise/admin-security.controller.ts', "@Delete('rbac/roles/:id')"],
];

function guardedCount(rel: string, marker: string): { total: number; guarded: number } {
  const lines = readFileSync(join(SRC, rel), 'utf8').split('\n');
  let total = 0;
  let guarded = 0;
  lines.forEach((line, i) => {
    if (!line.includes(marker)) return;
    total += 1;
    const window = lines.slice(Math.max(0, i - 6), i);
    if (window.some((w) => w.trim() === '@StepUp()')) guarded += 1;
  });
  return { total, guarded };
}

describe('Q66: money/privilege routes require step-up', () => {
  it.each(GUARDED)('%s :: %s carries @StepUp() on every occurrence', (rel, marker) => {
    const { total, guarded } = guardedCount(rel, marker);
    expect(total).toBeGreaterThan(0);
    expect(guarded).toBe(total);
  });
});
