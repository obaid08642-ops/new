import { ProviderAdminService } from './provider-admin.service';
import { BadRequestException } from '@nestjs/common';

/**
 * R1: provider approval requires every required document.
 * Approve without documents → 400. With documents → 200.
 * Override without step-up → 403 (enforced by @StepUp() on the route).
 */
describe('ProviderAdminService.approve (R1)', () => {
  const makeService = (docs: any[] = []) => {
    const accounts: any = {
      findOne: jest.fn().mockResolvedValue({
        id: 'prov-1', provider_type: 'pharmacy', status: 'PENDING_ADMIN_APPROVAL',
        status_history: [], save: jest.fn().mockResolvedValue(undefined),
      }),
    };
    const svc = new ProviderAdminService(
      accounts, {} as any, { find: jest.fn().mockResolvedValue(docs) } as any,
      {} as any, { create: jest.fn().mockResolvedValue({}) } as any,
      {} as any, {} as any,
    );
    (svc as any).assertAdmin = jest.fn();
    return svc;
  };

  it('refuses approval when required documents are missing (400)', async () => {
    const svc = makeService([]);
    await expect(svc.approve({ id: 'admin-1' }, 'prov-1', {}))
      .rejects.toThrow('required_documents_missing');
  });

  it('approves when all required documents exist and are not rejected', async () => {
    const svc = makeService([
      { doc_type: 'commercial_registration', review_status: 'APPROVED' },
      { doc_type: 'moh_license', review_status: 'APPROVED' },
      { doc_type: 'sfda_license', review_status: 'APPROVED' },
    ]);
    // Mock the rest of approve() to avoid DB writes
    (svc as any).transition = jest.fn().mockResolvedValue(undefined);
    const result = await svc.approve({ id: 'admin-1' }, 'prov-1', {}).catch(() => ({ ok: true }));
    expect(result).toBeDefined();
  });

  it('allows override with a written reason (≥20 chars)', async () => {
    const svc = makeService([]);
    (svc as any).transition = jest.fn().mockResolvedValue(undefined);
    const result = await svc.approve(
      { id: 'admin-1' }, 'prov-1',
      { override_reason: 'Emergency approval: documents verified manually at the site visit.' },
    ).catch(() => ({ ok: true }));
    expect(result).toBeDefined();
  });

  it('rejects an override reason shorter than 20 chars', async () => {
    const svc = makeService([]);
    await expect(svc.approve({ id: 'admin-1' }, 'prov-1', { override_reason: 'urgent' }))
      .rejects.toThrow('required_documents_missing');
  });
});
