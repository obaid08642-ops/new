// Q80: both approve paths must apply one rule. Only a typed provider_documents
// row counts; URL strings on the profile do not (the second route counted them,
// so three junk strings approved a provider), and a document the admin rejected
// or asked to replace does not count (stored values are lowercase).
import { BadRequestException } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProviderAdminService } from './services/provider-admin.service';

const pharmacyDocs = (iban = 'approved') => [
  { doc_type: 'commercial_registration', review_status: 'approved' },
  { doc_type: 'facility_license', review_status: 'pending' },
  { doc_type: 'iban_letter', review_status: iban },
];

function secondPath(docs: Array<Record<string, string>>, licenseUrls: string[]) {
  const profile = {
    id: 'pp-1', account_id: 'acc-1', user_id: 'acc-1', type: 'pharmacy', license_documents: licenseUrls,
    save: jest.fn().mockResolvedValue(undefined), toObject() { return { id: 'pp-1' }; },
  };
  const providerModel = {
    findOne: jest.fn().mockResolvedValue(profile),
    model: { db: { collection: jest.fn(() => ({ find: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue(docs) })) })) } },
  };
  const userModel = { updateOne: jest.fn().mockResolvedValue({}) };
  const svc = new ProvidersService(userModel as never, providerModel as never, {} as never, { emit: jest.fn() } as never, { refresh: jest.fn().mockResolvedValue({}) } as never);
  return { svc, profile };
}

function firstPath(docs: Array<Record<string, string>>) {
  const accounts = {
    findOne: jest.fn().mockResolvedValue({ id: 'acc-1', provider_type: 'pharmacy', status: 'PENDING_ADMIN_APPROVAL', status_history: [], save: jest.fn(), toObject() { return { id: 'acc-1' }; } }),
    model: { db: { collection: jest.fn(() => ({ findOne: jest.fn().mockResolvedValue(null), updateOne: jest.fn(), updateMany: jest.fn() })) } },
  };
  const svc = new ProviderAdminService(
    accounts as never, {} as never,
    { find: jest.fn().mockResolvedValue(docs), updateMany: jest.fn().mockResolvedValue({}) } as never,
    { updateMany: jest.fn().mockResolvedValue({}) } as never,
    { create: jest.fn().mockResolvedValue({}) } as never, {} as never, {} as never,
    { verify: jest.fn().mockResolvedValue(false) } as never,
  );
  (svc as unknown as { assertAdmin: () => void }).assertAdmin = jest.fn();
  return svc;
}

describe('required documents on both approve paths (Q80)', () => {
  it('second path: three URL strings and no typed document are refused', async () => {
    const { svc, profile } = secondPath([], ['https://x/a.jpg', 'https://x/b.jpg', 'https://x/c.jpg']);
    await expect(svc.approve('pp-1', { id: 'admin-1' })).rejects.toThrow(BadRequestException);
    expect(profile.save).not.toHaveBeenCalled();
  });

  it('second path: a document flagged needs_replacement does not count', async () => {
    const { svc } = secondPath(pharmacyDocs('needs_replacement'), []);
    await expect(svc.approve('pp-1', { id: 'admin-1' })).rejects.toThrow('required_documents_missing: iban_letter');
  });

  it('second path: every required typed document present → approved', async () => {
    const { svc, profile } = secondPath(pharmacyDocs(), []);
    await svc.approve('pp-1', { id: 'admin-1' });
    expect(profile.save).toHaveBeenCalled();
  });

  it('first path: a rejected document does not count (lowercase as stored)', async () => {
    const svc = firstPath(pharmacyDocs('rejected'));
    await expect(svc.approve({ id: 'admin-1' }, 'acc-1', {})).rejects.toThrow('required_documents_missing: iban_letter');
  });
});
