import { Connection } from 'mongoose';
import * as bidi from '../../common/pdf-bidi';
import { ContractPdfService, ContractAgreement, policyLine } from './contract-pdf.service';
import { createHash } from 'crypto';


describe('ContractPdfService signature source', () => {
  it('does not fetch arbitrary user-provided URLs', async () => {
    const collection = { findOne: jest.fn() };
    const service = new ContractPdfService({ collection: () => collection } as unknown as Connection);
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    const load = (service as unknown as { loadSignature(value: string): Promise<Buffer | null> }).loadSignature;
    await expect(load.call(service, 'http://127.0.0.1/latest/meta-data')).resolves.toBeNull();
    expect(collection.findOne).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it('does not fetch an untrusted external URL stored on a storage record', async () => {
    const collection = {
      findOne: jest.fn().mockResolvedValue({
        id: 'signature-1', backend: 'external', external_url: 'http://169.254.169.254/latest/meta-data',
      }),
    };
    const service = new ContractPdfService({ collection: () => collection } as unknown as Connection);
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    const load = (service as unknown as { loadSignature(value: string): Promise<Buffer | null> }).loadSignature;
    await expect(load.call(service, 'signature-1')).resolves.toBeNull();
    expect(collection.findOne).toHaveBeenCalledWith({ id: { $eq: 'signature-1' }, deleted: { $ne: true } });
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it.each([
    ['pending_scan', { scan_status: 'pending_scan' }],
    ['scanning', { scan_status: 'scanning' }],
    ['infected', { scan_status: 'infected' }],
    ['quarantine key', { external_key: 'pending/sig.png', backend: 's3' }],
  ])('never embeds a signature that has not passed the scan (%s)', async (_n, extra) => {
    const png = Buffer.from('iVBORw0KGgo=', 'base64').toString('base64');
    const collection = { findOne: jest.fn().mockResolvedValue({ id: 'signature-1', data_base64: png, ...extra }) };
    const service = new ContractPdfService({ collection: () => collection } as unknown as Connection);
    const load = (service as unknown as { loadSignature(value: string): Promise<Buffer | null> }).loadSignature;
    await expect(load.call(service, 'signature-1')).resolves.toBeNull();
  });

  it('embeds a scanned signature', async () => {
    const png = Buffer.from('iVBORw0KGgo=', 'base64').toString('base64');
    const collection = { findOne: jest.fn().mockResolvedValue({ id: 'signature-1', data_base64: png, scan_status: 'clean' }) };
    const service = new ContractPdfService({ collection: () => collection } as unknown as Connection);
    const load = (service as unknown as { loadSignature(value: string): Promise<Buffer | null> }).loadSignature;
    await expect(load.call(service, 'signature-1')).resolves.toBeInstanceOf(Buffer);
  });
});

// A real 1x1 PNG, so pdfkit can embed it.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const sigOf = (bytes: Buffer = PNG) => ({ bytes, sha256: createHash('sha256').update(bytes).digest('hex') });
const POLICY_TEXT = ['١. يلتزم المزود بالمعايير الطبية.', '', '٢. تُسوّى المستحقات وفق سياسة المنصة (15 يوماً).', 'Article 3 — English line kept as written.'];
const AGREEMENT: ContractAgreement = {
  policy: { key: 'provider_agreement', version: '2.1', title_ar: 'اتفاقية المزود', title_en: 'Provider agreement', content_ar: POLICY_TEXT.join('\n'), content_en: 'English text', content_sha256_ar: 'a'.repeat(64), content_sha256_en: 'b'.repeat(64) },
  acceptance: { id: 'acc-1', version: '2.1', accepted_at: new Date('2026-10-30T09:15:00Z'), ip: '203.0.113.7', device: 'dev-42', platform: 'ios', user_agent: 'NabdProvider/1.0' },
};
const party = { profileId: 'p1', userId: 'u1', providerType: 'doctor', nameAr: 'د. سارة', signerName: 'سارة العتيبي', signerRole: 'مالك', accountName: 'Sara', email: 'a@b.test', phone: '+966500000000' };
const META = { contractId: 'c-123', versionNo: 2, signedAt: new Date('2026-10-31T10:30:00Z') };

describe('the contract prints what the provider accepted', () => {
  const svc = () => new ContractPdfService({ collection: () => ({ findOne: jest.fn() }) } as unknown as Connection);

  it('draws the policy text line by line, the version, the acceptance and the SIGNING time, and none of the old built-in terms', async () => {
    const drawn: string[] = [];
    const spy = jest.spyOn(bidi, 'drawBidi').mockImplementation(((doc: any, text: string) => { drawn.push(text); return 0; }) as any);
    const { pdf } = await svc().generate(party, AGREEMENT, sigOf(), META);
    spy.mockRestore();
    const all = drawn.join('\n');
    for (const line of POLICY_TEXT.filter(Boolean)) expect(all).toContain(line);
    expect(all.indexOf(POLICY_TEXT[0])).toBeLessThan(all.indexOf(POLICY_TEXT[3])); // reading order kept
    expect(all).toContain('الإصدار 2.1');
    expect(all).toContain('2026-10-30 09:15 UTC'); // accepted
    expect(all).toContain('2026-10-31 10:30 UTC'); // signed
    expect(all).toContain('203.0.113.7');
    expect(all).toContain('dev-42');
    expect(all).toContain('c-123');
    expect(all).not.toContain('يلتزم الطرف الثاني بصحة جميع البيانات'); // the old hard-coded term 1
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('the stored hash is the full SHA-256 of the final bytes', async () => {
    const { pdf, sha256 } = await svc().generate(party, AGREEMENT, sigOf(), META);
    expect(sha256).toHaveLength(64);
    expect(sha256).toBe(createHash('sha256').update(pdf).digest('hex'));
  });

  it('embeds the Arabic font (no blank Arabic)', async () => {
    const { pdf } = await svc().generate(party, AGREEMENT, sigOf(), META);
    expect(pdf.toString('latin1')).toContain('NotoNaskhArabic');
  });

  it('a corrupt signature image is a 400 `signature_unusable` (sign again), not a crash and not a contract', async () => {
    const bad = sigOf(Buffer.from('89504e470d0a1a0a00000000', 'hex'));
    await expect(svc().generate(party, AGREEMENT, bad, META)).rejects.toMatchObject({ status: 400, response: { code: 'signature_unusable' } });
  });
});

describe('the signature must have passed its scan before a contract exists', () => {
  const withObject = (obj: any) => new ContractPdfService({ collection: () => ({ findOne: jest.fn().mockResolvedValue(obj) }) } as unknown as Connection);
  const png64 = PNG.toString('base64');

  it.each([['pending_scan'], ['scanning']])('%s waits: 423 signature_pending_scan, no contract', async (status) => {
    await expect(withObject({ id: 's', data_base64: png64, scan_status: status }).resolveSignature('s')).rejects.toMatchObject({ status: 423, response: { code: 'signature_pending_scan' } });
  });
  it('a file still under the quarantine prefix waits too', async () => {
    await expect(withObject({ id: 's', backend: 's3', external_key: 'pending/s.png' }).resolveSignature('s')).rejects.toMatchObject({ status: 423 });
  });
  it.each([['infected', { scan_status: 'infected', data_base64: png64 }], ['missing', null]])('%s is 400 signature_unusable', async (_n, obj) => {
    await expect(withObject(obj).resolveSignature('s')).rejects.toMatchObject({ status: 400, response: { code: 'signature_unusable' } });
  });
  it('no signature at all is refused', async () => {
    await expect(withObject(null).resolveSignature(undefined)).rejects.toMatchObject({ status: 400, response: { code: 'signature_unusable' } });
  });
  it('a clean signature returns its bytes and their hash', async () => {
    const r = await withObject({ id: 's', data_base64: png64, scan_status: 'clean' }).resolveSignature('s');
    expect(r.bytes.equals(PNG)).toBe(true);
    expect(r.sha256).toBe(createHash('sha256').update(PNG).digest('hex'));
  });
});

describe('loadAgreement: only a published agreement the provider accepted', () => {
  const build = (policy: any, acceptances: any[], snapshots: any[] = []) => {
    const colls: Record<string, any> = {
      legal_policies: { findOne: async () => policy },
      legal_acceptances: { find: () => ({ sort: () => ({ limit: () => ({ toArray: async () => acceptances }) }) }) },
      legal_policy_snapshots: { findOne: async (q: any) => snapshots.find((x) => x.key === q.key && x.version === q.version) ?? null },
    };
    return new ContractPdfService({ collection: (n: string) => colls[n] } as unknown as Connection);
  };
  const policy = { key: 'provider_agreement', version: '2.1', title_ar: 'ت', content_ar: 'نص ٢٫١', content_en: 'text 2.1' };
  const acc = (version: string, extra: any = {}) => ({ _id: 'a1', version, timestamp: new Date('2026-10-30T09:00:00Z'), ip: '1.2.3.4', device: 'd', platform: 'ios', user_agent: 'ua', ...extra });

  it('no published agreement: provider_agreement_not_published (400)', async () => {
    await expect(build(null, []).loadAgreement('u1')).rejects.toMatchObject({ status: 400, response: { code: 'provider_agreement_not_published' } });
    await expect(build({ ...policy, content_ar: '', content_en: '' }, []).loadAgreement('u1')).rejects.toMatchObject({ response: { code: 'provider_agreement_not_published' } });
  });
  it('published but not accepted: provider_agreement_not_accepted (409)', async () => {
    await expect(build(policy, []).loadAgreement('u1')).rejects.toMatchObject({ status: 409, response: { code: 'provider_agreement_not_accepted' } });
  });
  it('an acceptance of an older MAJOR version does not count (the new major must be accepted again)', async () => {
    await expect(build({ ...policy, version: '3.0' }, [acc('2.1')]).loadAgreement('u1')).rejects.toMatchObject({ response: { code: 'provider_agreement_not_accepted', version: '3.0' } });
  });
  it('the accepted version prints from its own snapshot even after a minor edit', async () => {
    const edited = { ...policy, version: '2.2', content_ar: 'نص ٢٫٢ بعد التعديل' };
    const r = await build(edited, [acc('2.1')], [{ key: 'provider_agreement', version: '2.1', title_ar: 'ت', content_ar: 'نص ٢٫١', content_en: 'text 2.1' }]).loadAgreement('u1');
    expect(r.policy.version).toBe('2.1');
    expect(r.policy.content_ar).toBe('نص ٢٫١');
    expect(r.acceptance).toMatchObject({ id: 'a1', ip: '1.2.3.4', device: 'd' });
  });
  it('accepted version equals the current one: the policy row is the text (accepted before snapshots existed)', async () => {
    const r = await build(policy, [acc('2.1')]).loadAgreement('u1');
    expect(r.policy.content_ar).toBe('نص ٢٫١');
    expect(r.policy.content_sha256_ar).toHaveLength(64);
  });
  it('accepted an old minor version that was edited away and never snapshotted: provider_agreement_text_unavailable, never a guess', async () => {
    await expect(build({ ...policy, version: '2.3' }, [acc('2.1')]).loadAgreement('u1')).rejects.toMatchObject({ status: 409, response: { code: 'provider_agreement_text_unavailable' } });
  });
});

describe('policyLine (Markdown markers, never the words)', () => {
  it('headings, bold markers and bullets', () => {
    expect(policyLine('## 2. الترخيص')).toEqual({ text: '2. الترخيص', heading: true });
    expect(policyLine('1. **المسؤولية الكاملة** عن:')).toEqual({ text: '1. المسؤولية الكاملة عن:', heading: false });
    expect(policyLine('- ترخيص المنشأة')).toEqual({ text: '\u2022 ترخيص المنشأة', heading: false });
  });
  it('plain text passes through unchanged', () => {
    expect(policyLine('٢. تُسوّى المستحقات (15 يوماً).')).toEqual({ text: '٢. تُسوّى المستحقات (15 يوماً).', heading: false });
  });
});
