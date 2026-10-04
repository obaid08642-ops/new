import { ProviderAdminService } from './provider-admin.service';
import { BadRequestException } from '@nestjs/common';

/**
 * R1: provider approval requires every required document.
 * Approve without documents → 400. With documents → 200.
 * Override without step-up → 403 (enforced by @StepUp() on the route).
 */
describe('ProviderAdminService.approve (R1)', () => {
  const makeService = (docs: any[] = []) => {
    const col = () => ({
      findOne: jest.fn().mockResolvedValue(null),
      updateOne: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({}),
    });
    const accounts: any = {
      findOne: jest.fn().mockResolvedValue({
        id: 'prov-1', provider_type: 'pharmacy', status: 'PENDING_ADMIN_APPROVAL',
        status_history: [], save: jest.fn().mockResolvedValue(undefined),
        // approve() reads translation gaps and returns the saved account.
        toObject: function () { return { id: 'prov-1', provider_type: 'pharmacy' }; },
      }),
      // F5: approve() writes users.token_version and reads provider_profiles for
      // the onboarding licence evidence; the double must expose both.
      model: { db: { collection: jest.fn(() => col()) } },
    };
    const svc = new ProviderAdminService(
      // constructor order: accounts, profiles, docs, banks, audit, seo, events, stepUp
      accounts, {} as any,
      { find: jest.fn().mockResolvedValue(docs), updateMany: jest.fn().mockResolvedValue({}) } as any,
      { updateMany: jest.fn().mockResolvedValue({}) } as any,
      { create: jest.fn().mockResolvedValue({}) } as any,
      {} as any, {} as any,
      // F5: the override path calls stepUp.verify(); the default double refuses.
      { verify: jest.fn().mockResolvedValue(false) } as any,
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
      // F5: the pharmacy required list is commercial_registration + facility_license
      // + iban_letter (provider.enums). The old fixture listed moh/sfda, which never
      // satisfied the check — the .catch() hid it.
      { doc_type: 'commercial_registration', review_status: 'APPROVED' },
      { doc_type: 'facility_license', review_status: 'APPROVED' },
      { doc_type: 'iban_letter', review_status: 'APPROVED' },
    ]);
    // Mock the rest of approve() to avoid DB writes
    (svc as any).transition = jest.fn().mockResolvedValue(undefined);
    (svc as any).audit = { create: jest.fn().mockResolvedValue({}) };
    // F5: assert the real outcome — no .catch() swallowing the error.
    await expect(svc.approve({ id: 'admin-1' }, 'prov-1', {})).resolves.toBeDefined();
  });

  it('allows override with a written reason (≥20 chars) AND step-up, and writes an audit row', async () => {
    const svc = makeService([]);
    (svc as any).transition = jest.fn().mockResolvedValue(undefined);
    const auditCreate = jest.fn().mockResolvedValue({});
    (svc as any).audit = { create: auditCreate };
    // F5: the override is the privileged act, so a fresh passkey assertion is
    // required on top of the written reason.
    (svc as any).stepUp = { verify: jest.fn().mockResolvedValue(true) };
    await expect(
      svc.approve(
        { id: 'admin-1' }, 'prov-1',
        { override_reason: 'Emergency approval: documents verified manually at the site visit.' },
        'stepup-token',
      ),
    ).resolves.toBeDefined();
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'admin.provider_approved_override' }),
    );
  });

  it('refuses the override with a valid reason but no step-up (403)', async () => {
    const svc = makeService([]);
    (svc as any).transition = jest.fn().mockResolvedValue(undefined);
    (svc as any).audit = { create: jest.fn().mockResolvedValue({}) };
    (svc as any).stepUp = { verify: jest.fn().mockResolvedValue(false) };
    await expect(
      svc.approve(
        { id: 'admin-1' }, 'prov-1',
        { override_reason: 'Emergency approval: documents verified manually at the site visit.' },
      ),
    ).rejects.toThrow('step_up_required');
  });

  it('rejects an override reason shorter than 20 chars', async () => {
    const svc = makeService([]);
    await expect(svc.approve({ id: 'admin-1' }, 'prov-1', { override_reason: 'urgent' }))
      .rejects.toThrow('required_documents_missing');
  });
});
