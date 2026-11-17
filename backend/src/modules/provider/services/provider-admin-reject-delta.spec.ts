import { ProviderAdminService } from './provider-admin.service';

// Lead decision 2026-11-16: rejecting a change request keeps its uploaded files (the provider may re-submit); erasure or final closure deletes them.
describe('ProviderAdminService.rejectDelta keeps the uploaded files', () => {
  const delta = { id: 'd1', status: 'pending', account_id: 'prov-1', requested_changes: { license_documents: ['https://cdn.example/new-licence.pdf'], logo: 'https://cdn.example/new-logo.png' } };
  const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
  const findOne = jest.fn(async (f: any) => (f && f.id === 'd1' ? delta : null));
  const db = { collection: () => ({ findOne, updateOne }) };
  const accounts: any = { model: { db } };
  const audit: any = { create: jest.fn().mockResolvedValue(undefined) };
  const events: any = { emit: jest.fn() };
  const service = new ProviderAdminService(accounts, {} as any, {} as any, {} as any, audit, {} as any, events, {} as any);
  const admin = { id: 'adm-1', role: 'admin' };

  beforeEach(() => jest.clearAllMocks());

  it('marks the request rejected with its reason and deletes no file', async () => {
    await service.rejectDelta(admin, 'd1', { reason: 'unreadable photo' });
    expect(updateOne).toHaveBeenCalledWith({ id: 'd1' }, { $set: expect.objectContaining({ status: 'rejected', rejection_reason: 'unreadable photo' }) });
    expect(events.emit).not.toHaveBeenCalledWith('storage.delete_by_url', expect.anything());
  });
});
