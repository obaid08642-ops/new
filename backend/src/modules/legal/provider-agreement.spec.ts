import { ForbiddenException } from '@nestjs/common';
import { ProviderAgreementGuard, majorOf, isProviderCaller } from './provider-agreement';
import { renderTextPdf } from '../../common/pdf-text';

const ctx = (path: string, user: any) => ({ switchToHttp: () => ({ getRequest: () => ({ path, user }) }) }) as any;
const build = (policy: any, acceptances: any[]) => {
  const finds = { policy: 0, acc: 0 };
  const conn: any = {
    collection: (n: string) => n === 'legal_policies'
      ? { findOne: async () => { finds.policy++; return policy; } }
      : { find: () => ({ toArray: async () => { finds.acc++; return acceptances; } }) },
  };
  return { guard: new ProviderAgreementGuard(conn), finds };
};
const POLICY = { key: 'provider_agreement', version: '2.0', requires_acceptance: true, applies_to: ['provider'] };
const doctor = (id = 'u1') => ({ id, role: 'doctor' });

beforeEach(() => ProviderAgreementGuard.forget('u1'));

describe('ProviderAgreementGuard: a new major version must be accepted before provider routes work', () => {
  it('refuses a provider route with the typed 403 until the current major version is accepted', async () => {
    const { guard } = build(POLICY, [{ version: '1.3' }]);
    await expect(guard.canActivate(ctx('/api/v1/provider/requests', doctor()))).rejects.toMatchObject({ status: 403, response: { code: 'provider_agreement_required', policy_key: 'provider_agreement', version: '2.0' } });
  });
  it('lets the provider in once they accepted the new major (and any minor of it)', async () => {
    expect(await build(POLICY, [{ version: '2.0' }]).guard.canActivate(ctx('/api/v1/provider/requests', doctor()))).toBe(true);
    ProviderAgreementGuard.forget('u1');
    expect(await build({ ...POLICY, version: '2.4' }, [{ version: '2.0' }]).guard.canActivate(ctx('/api/v1/provider/requests', doctor()))).toBe(true);
  });
  it('blocks nothing when no agreement is published, or it does not apply to providers or needs no acceptance', async () => {
    for (const p of [null, { ...POLICY, applies_to: ['patient'] }, { ...POLICY, requires_acceptance: false }]) {
      ProviderAgreementGuard.forget('u1');
      expect(await build(p, []).guard.canActivate(ctx('/api/v1/provider/requests', doctor()))).toBe(true);
    }
  });
  it('only provider-side callers on /provider/ routes are checked; sign-in and other routes stay open', async () => {
    const { guard, finds } = build(POLICY, []);
    expect(await guard.canActivate(ctx('/api/v1/provider/auth/login', doctor()))).toBe(true);
    expect(await guard.canActivate(ctx('/api/v1/legal/accept/provider_agreement', doctor()))).toBe(true);
    expect(await guard.canActivate(ctx('/api/v1/provider-onboarding/submit', doctor()))).toBe(true);
    expect(await guard.canActivate(ctx('/api/v1/provider/requests', { id: 'p1', role: 'patient' }))).toBe(true);
    expect(await guard.canActivate(ctx('/api/v1/provider/requests', undefined))).toBe(true);
    expect(finds.policy).toBe(0);
  });
  it('the answer is kept briefly and accepting clears it at once', async () => {
    const acceptances: any[] = [];
    const { guard, finds } = build(POLICY, acceptances);
    await expect(guard.canActivate(ctx('/api/v1/provider/a', doctor()))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(guard.canActivate(ctx('/api/v1/provider/a', doctor()))).rejects.toBeInstanceOf(ForbiddenException);
    expect(finds.policy).toBe(1);
    acceptances.push({ version: '2.0' });
    ProviderAgreementGuard.forget('u1');
    expect(await guard.canActivate(ctx('/api/v1/provider/a', doctor()))).toBe(true);
  });
  it('helpers', () => {
    expect(majorOf('3.2')).toBe('3');
    expect(isProviderCaller({ role: 'pharmacy' })).toBe(true);
    expect(isProviderCaller({ role: 'patient' })).toBe(false);
  });
});

describe('legal PDFs keep Arabic', () => {
  it('an Arabic line embeds the Arabic font (the old writer turned every Arabic letter into a space)', async () => {
    const pdf = await renderTextPdf('Legal Acceptance Certificate', ['User: سارة العتيبي', 'Policy: اتفاقية المزود — v2.0']);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.toString('latin1')).toContain('NotoNaskhArabic');
  });
  it('a long text runs onto more pages instead of being cut', async () => {
    const pdf = await renderTextPdf('Long', Array.from({ length: 200 }, (_, i) => `سطر رقم ${i + 1} من النص`));
    expect((pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length).toBeGreaterThan(2);
  });
});
