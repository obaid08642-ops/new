import { ProviderProfileService } from './provider-profile.service';

// Lead decision 2026-11-17: a rejected / sent-back provider sees WHICH documents to replace (type, reason, status), never the old file.
describe('ProviderProfileService.listReplacementDocuments', () => {
  const rows = [
    { doc_type: 'license', reviewer_note: 'photo unreadable', review_status: 'needs_replacement', reviewed_at: new Date('2030-01-01'), storage_object_id: 'so-1', doc_number: 'L-123', issuer: 'X', _id: 'a' },
    { doc_type: 'id_card', reviewer_note: undefined, review_status: 'rejected', reviewed_at: undefined, storage_object_id: 'so-2' },
  ];
  const seen: any[] = [];
  const svc: any = Object.create(ProviderProfileService.prototype);
  svc.docs = { find: (q: any, proj: any) => { seen.push({ q, proj }); return { sort: () => ({ lean: async () => rows }) }; } };

  it('returns only type, reason, status and review time; no file id, number or URL', async () => {
    const out = await svc.listReplacementDocuments({ id: 'prov-1' });
    expect(out).toEqual({ documents: [
      { doc_type: 'license', reason: 'photo unreadable', status: 'needs_replacement', reviewed_at: new Date('2030-01-01') },
      { doc_type: 'id_card', reason: null, status: 'rejected', reviewed_at: null },
    ] });
    expect(JSON.stringify(out)).not.toMatch(/so-1|so-2|L-123|storage/);
  });

  it('reads only the caller\'s own flagged documents, with a projection that excludes the file fields', async () => {
    await svc.listReplacementDocuments({ id: 'prov-1' });
    const { q, proj } = seen[seen.length - 1];
    expect(q).toEqual({ account_id: 'prov-1', review_status: { $in: ['needs_replacement', 'rejected'] } });
    expect(Object.keys(proj).sort()).toEqual(['_id', 'doc_type', 'review_status', 'reviewed_at', 'reviewer_note']);
  });
});
