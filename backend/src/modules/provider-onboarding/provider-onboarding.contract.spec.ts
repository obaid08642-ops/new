import { ProviderOnboardingService } from './provider-onboarding.module';
import { ContractPdfService } from './contract-pdf.service';
import { ProviderType } from '../../common/enums';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const AGREEMENT = {
  policy: { key: 'provider_agreement', version: '1.0', title_ar: 'ت', title_en: 't', content_ar: 'نص الاتفاقية', content_en: 'text', content_sha256_ar: 'a'.repeat(64), content_sha256_en: 'b'.repeat(64) },
  acceptance: { id: 'acc-9', version: '1.0', accepted_at: new Date('2026-10-30T09:00:00Z'), ip: '203.0.113.9', device: 'dev-1', platform: 'android', user_agent: 'ua' },
};
const typedErr = (status: number, code: string) => Object.assign(new Error(code), { status, response: { code } });

function setup(opts: { agreement?: Error; signature?: Error } = {}) {
  const rows: any[] = [];
  const contractsCol = {
    countDocuments: jest.fn(async (q: any) => rows.filter((r) => r.profile_id === q.profile_id).length),
    insertOne: jest.fn(async (d: any) => { rows.push(d); }),
    updateOne: jest.fn(), updateMany: jest.fn(),
    find: (f: any) => {
      const match = (r: any) => (f.user_id ? r.user_id === f.user_id : (f.$or || []).some((c: any) => Object.entries(c).every(([k, v]) => r[k] === v)));
      const out = rows.filter(match).sort((a, b) => +b.createdAt - +a.createdAt);
      const chain: any = { sort: () => chain, limit: () => chain, project: () => chain, toArray: async () => out };
      return chain;
    },
  };
  const profile: any = {
    id: 'prof-1', user_id: 'u1', type: ProviderType.LAB, onboarding_step: 3, name_ar: 'مختبر', signer_name: 'سارة', signer_role: 'مالك', signature_url: 'sig-1', account_id: 'acc-prof',
    toObject: () => ({ type: ProviderType.LAB }), save: jest.fn(async () => undefined),
  };
  const providerModel: any = { findOne: jest.fn(async () => profile), db: { collection: (n: string) => (n === 'provider_contracts' ? contractsCol : { findOne: async () => null }) } };
  const userModel: any = { findOne: jest.fn(() => ({ lean: async () => ({ email: 'a@b.test', phone: '+966500000000', full_name: 'Sara' }) })) };
  const real = new (ContractPdfService as any)({ collection: () => ({ findOne: async () => null }) });
  const contracts: any = {
    loadAgreement: jest.fn(async () => { if (opts.agreement) throw opts.agreement; return AGREEMENT; }),
    resolveSignature: jest.fn(async () => { if (opts.signature) throw opts.signature; return { bytes: PNG, sha256: 'sigsha' }; }),
    generate: (...a: unknown[]) => real.generate(...a),
  };
  const bus = { emit: jest.fn(async () => undefined) };
  const svc: any = new ProviderOnboardingService(userModel, providerModel, bus as any, contracts, { recordAtSubmission: async () => undefined } as any);
  jest.spyOn(svc as any, 'mirrorToModerationQueue').mockResolvedValue(undefined);
  return { svc, profile, rows, contractsCol, contracts };
}

describe('submit: no contract without an accepted agreement and a clean signature', () => {
  it.each([
    ['the agreement is not published', { agreement: typedErr(400, 'provider_agreement_not_published') }, 'provider_agreement_not_published'],
    ['the agreement is not accepted', { agreement: typedErr(409, 'provider_agreement_not_accepted') }, 'provider_agreement_not_accepted'],
    ['the signature is still being scanned', { signature: typedErr(423, 'signature_pending_scan') }, 'signature_pending_scan'],
    ['the signature is unusable', { signature: typedErr(400, 'signature_unusable') }, 'signature_unusable'],
  ])('%s: the typed error is raised and nothing is saved or stored', async (_n, opts, code) => {
    const { svc, profile, rows } = setup(opts as any);
    await expect(svc.submit({ id: 'u1' }, {})).rejects.toMatchObject({ response: { code } });
    expect(profile.save).not.toHaveBeenCalled();
    expect(rows).toHaveLength(0);
  });

  it('a clean signature and an accepted agreement store a signed contract linked to the acceptance, with the full hash of the final bytes', async () => {
    const { svc, rows } = setup();
    await svc.submit({ id: 'u1' }, {});
    expect(rows).toHaveLength(1);
    const c = rows[0];
    expect(c).toMatchObject({ profile_id: 'prof-1', version_no: 1, status: 'signed', policy_key: 'provider_agreement', policy_version: '1.0', acceptance_id: 'acc-9', accepted_ip: '203.0.113.9', accepted_device: 'dev-1', signer_name: 'سارة', signature_sha256: 'sigsha' });
    expect(c.signed_at).toBeInstanceOf(Date);
    const bytes = Buffer.from(c.pdf_base64, 'base64');
    expect(c.sha256).toHaveLength(64);
    expect(c.sha256).toBe(require('crypto').createHash('sha256').update(bytes).digest('hex'));
    expect(c.size_bytes).toBe(bytes.length);
  });

  it('a re-submission adds version 2 and never changes the first signed PDF', async () => {
    const { svc, rows, contractsCol } = setup();
    await svc.submit({ id: 'u1' }, {});
    const first = { ...rows[0] };
    await svc.submit({ id: 'u1' }, {});
    expect(rows).toHaveLength(2);
    expect(rows[1].version_no).toBe(2);
    expect(rows[1].id).not.toBe(first.id);
    expect(rows[0].pdf_base64).toBe(first.pdf_base64);
    expect(rows[0].sha256).toBe(first.sha256);
    expect(contractsCol.updateOne).not.toHaveBeenCalled();
    expect(contractsCol.updateMany).not.toHaveBeenCalled();
  });

  it('the provider and the admin get the newest version; the admin also gets every version\'s metadata', async () => {
    const { svc } = setup();
    await svc.submit({ id: 'u1' }, {});
    await new Promise((r) => setTimeout(r, 5));
    await svc.submit({ id: 'u1' }, {});
    expect((await svc.getContractForOwner({ id: 'u1' })).version_no).toBe(2);
    const admin = await svc.getContractForAdmin('prof-1');
    expect(admin.version_no).toBe(2);
    expect(admin.versions.map((v: any) => v.version_no)).toEqual([2, 1]);
  });

  it('there is no contract to hand out when none was ever signed (no regeneration out of thin air)', async () => {
    const { svc } = setup();
    await expect(svc.getContractForOwner({ id: 'u1' })).rejects.toMatchObject({ response: { message: 'contract_not_generated' } });
    await expect(svc.getContractForAdmin('prof-1')).rejects.toMatchObject({ response: { message: 'contract_not_generated' } });
  });
});
