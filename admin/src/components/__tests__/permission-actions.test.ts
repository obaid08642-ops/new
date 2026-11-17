import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// docs/design/ADMIN_PERMISSION_ACTIONS.md: where the page permission differs from the endpoint permission, the client hides the control
// (the endpoint is never widened). One line per row: the file, the permission the endpoint checks, and the control that is hidden without it.
const root = resolve(__dirname, '../../..');
const read = (file: string) => readFileSync(resolve(root, file), 'utf8');

const ROWS: Array<[string, string, string]> = [
  ['src/pages/admin/catalog-manager.tsx', 'insurance.manage', 'canManageInsurance ? <button onClick={() => setForm({ ...c })}'],
  ['src/pages/admin/content-growth.tsx', 'notifications.send', '{canSend ? <form onSubmit={saveCampaign}'],
  ['src/pages/admin/support-tickets.tsx', 'support.manage', 'if (!canManage) {'],
  ['src/pages/admin/nursing-portal.tsx', 'order.reassign', '{canReassign && req.state'],
  ['src/pages/admin/pharmacy-procurement.tsx', 'pharmacy.inventory.edit', '{canIssueQuote && r.status'],
  ['src/pages/admin/config-portal.tsx', 'cms.edit', '{canEditUrgentHelp ? <button'],
  ['src/pages/admin/pharmacy-price-review.tsx', 'catalog.update', 'canWriteCatalogPrice && canUpdateCatalog'],
  ['src/pages/admin/risk-dashboard.tsx', 'security.manage', '(canRescore ? <button'],
  ['src/pages/admin/service-proposals.tsx', 'catalog.approve', '{canDecide ? ('],
  ['src/pages/admin/locations.tsx', 'settings.edit', '{canEdit ? ('],
];

describe('admin actions the role cannot use are not shown', () => {
  it.each(ROWS)('%s asks useCan(%s) before the control', (file, permission, control) => {
    const src = read(file);
    expect(src).toContain(`useCan('${permission}')`);
    expect(src).toContain(control);
  });

  it('the locations page has its own route permission (it had none, any admin saw 403s inside it)', () => {
    expect(read('src/components/AdminGuard.tsx')).toContain("'/admin/locations': 'settings.edit'");
  });

  it('the alerts bell and its poll are rendered only with command.center.view (row 2, already in place)', () => {
    const guard = read('src/components/AdminGuard.tsx');
    expect(guard).toContain("const canSeeAlerts = permissionSet.has('command.center.view');");
    expect(guard).toContain('{canSeeAlerts ? <AlertsBell');
  });

  it('the approvals hub grants its finance.read row (it was hidden for every role)', () => {
    const src = read('src/pages/admin/approvals.tsx');
    expect(src).toContain("'finance.read': canFinance");
  });
});
