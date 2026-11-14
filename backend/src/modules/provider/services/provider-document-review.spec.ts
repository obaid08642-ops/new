import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProviderAdminService } from './provider-admin.service';
import { DocumentReviewStatus } from '../schemas';

// B-4 (#940): licence review per document — each licence file is decided on
// its own instead of bulk-approving everything with the account.
describe('ProviderAdminService.reviewDocument', () => {
  const accounts: any = { findOne: jest.fn() };
  const profiles: any = {};
  const docs: any = { findOne: jest.fn() };
  const banks: any = {};
  const audit: any = { create: jest.fn() };
  const events: any = { emit: jest.fn() };
  const service = new ProviderAdminService(accounts, profiles, docs, banks, audit, {} as any, events, {} as any);
  const admin = { id: 'adm-1', role: 'admin' };

  const pendingDoc = (over: any = {}) => ({
    id: 'doc-1',
    account_id: 'prov-1',
    doc_type: 'commercial_register',
    review_status: DocumentReviewStatus.PENDING,
    save: jest.fn().mockResolvedValue(undefined),
    ...over,
  });

  beforeEach(() => jest.clearAllMocks());

  it('approves a pending document and audits + notifies', async () => {
    const doc = pendingDoc();
    docs.findOne.mockResolvedValue(doc);

    const out: any = await service.reviewDocument(admin, 'prov-1', 'doc-1', 'approve', 'looks good');

    expect(docs.findOne).toHaveBeenCalledWith({ id: { $eq: 'doc-1' }, account_id: { $eq: 'prov-1' } });
    expect(doc.review_status).toBe(DocumentReviewStatus.APPROVED);
    expect(doc.reviewer_id).toBe('adm-1');
    expect(doc.save).toHaveBeenCalled();
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({
      action: 'admin.provider_document_approved',
      after: expect.objectContaining({ doc_id: 'doc-1', review_status: 'approved' }),
    }));
    expect(events.emit).toHaveBeenCalledWith('provider.document_reviewed', expect.objectContaining({
      provider_id: 'prov-1', doc_id: 'doc-1', decision: 'approve',
    }));
    expect(out).toMatchObject({ ok: true, review_status: 'approved' });
  });

  it('rejects with a reason and audits + notifies', async () => {
    const doc = pendingDoc({ review_status: DocumentReviewStatus.UNDER_REVIEW });
    docs.findOne.mockResolvedValue(doc);

    const out: any = await service.reviewDocument(admin, 'prov-1', 'doc-1', 'reject', 'expired licence');

    expect(doc.review_status).toBe(DocumentReviewStatus.REJECTED);
    expect(doc.reviewer_note).toBe('expired licence');
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'admin.provider_document_rejected' }));
    expect(events.emit).toHaveBeenCalledWith('provider.document_reviewed', expect.objectContaining({ decision: 'reject' }));
    expect(out).toMatchObject({ ok: true, review_status: 'rejected' });
  });

  it('rejects a rejection without a reason', async () => {
    docs.findOne.mockResolvedValue(pendingDoc());
    await expect(service.reviewDocument(admin, 'prov-1', 'doc-1', 'reject', '  '))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('404s on an unknown document (or one from another account)', async () => {
    docs.findOne.mockResolvedValue(null);
    await expect(service.reviewDocument(admin, 'prov-1', 'doc-nope', 'approve'))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(audit.create).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('400s when the document was already decided', async () => {
    docs.findOne.mockResolvedValue(pendingDoc({ review_status: DocumentReviewStatus.APPROVED }));
    await expect(service.reviewDocument(admin, 'prov-1', 'doc-1', 'approve'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(audit.create).not.toHaveBeenCalled();
  });

  it('non-admins cannot review', async () => {
    await expect(service.reviewDocument({ id: 'x', role: 'patient' }, 'prov-1', 'doc-1', 'approve'))
      .rejects.toThrow();
    expect(docs.findOne).not.toHaveBeenCalled();
  });
});
