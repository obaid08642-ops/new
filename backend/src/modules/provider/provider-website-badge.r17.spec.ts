// d2b9874 / R17: the provider-dashboard "Website badge" reads its data from a
// backend read that applies the full public gate: status 'active' AND
// medical_review_status 'approved' AND public_eligibility true. status active
// alone is not enough. Only a verified doctor with a public page gets a link.
import { ForbiddenException } from '@nestjs/common';
import { ProviderBadgeController, ProviderWebsiteBadgeController, websiteBadgeFor } from './provider-badge.controller';

type Row = Record<string, unknown>;
const verifiedDoctor: Row = { id: 'p-1', user_id: 'u-1', type: 'doctor', slug: 'dr-reem', status: 'active', medical_review_status: 'approved', public_eligibility: true, display_name_ar: 'د. ريم "النخبة" <b>', name_en: 'Dr. Reem' };

function conn(rows: Row[]) {
  const seen: Row[] = [];
  const match = (r: Row, f: Row) => Object.entries(f).every(([k, v]) => {
    if (k === '$or') return (v as Row[]).some((c) => match(r, c));
    return r[k] === v;
  });
  return { seen, conn: { collection: () => ({ findOne: async (q: Row) => { seen.push(q); return rows.find((r) => match(r, q)) ?? null; } }) } };
}

describe('websiteBadgeFor (R17 verified gate)', () => {
  it('a fully verified doctor gets the canonical profile URL', () => {
    expect(websiteBadgeFor(verifiedDoctor)).toEqual({
      verified: true, reasons: [], provider_type: 'doctor',
      profile_url: 'https://nabd.plus/ar/doctor/dr-reem',
      name_ar: 'د. ريم "النخبة" <b>', name_en: 'Dr. Reem',
    });
  });

  it('status active alone is not verified; each missing condition is reported', () => {
    const out = websiteBadgeFor({ ...verifiedDoctor, medical_review_status: 'pending', public_eligibility: false });
    expect(out.verified).toBe(false);
    expect(out.profile_url).toBeNull();
    expect(out.reasons).toEqual(['medical_review_not_approved', 'not_public']);
    expect(websiteBadgeFor({ ...verifiedDoctor, status: 'suspended' }).reasons).toEqual(['not_active']);
  });

  it('a verified provider without a public profile page gets no link', () => {
    const out = websiteBadgeFor({ ...verifiedDoctor, type: 'pharmacy' });
    expect(out).toMatchObject({ verified: false, profile_url: null, reasons: ['no_public_profile_page'] });
    expect(websiteBadgeFor({ ...verifiedDoctor, slug: undefined }).reasons).toEqual(['no_public_profile_page']);
  });
});

describe('GET /provider/website-badge (own profile)', () => {
  it('reads the caller\'s own provider profile', async () => {
    const { conn: c, seen } = conn([verifiedDoctor]);
    const out = await new ProviderWebsiteBadgeController(c as never).mine({ id: 'u-1', role: 'doctor' });
    expect(seen[0]).toEqual({ $or: [{ user_id: 'u-1' }, { account_id: 'u-1' }] });
    expect(out.verified).toBe(true);
    expect(out.profile_url).toBe('https://nabd.plus/ar/doctor/dr-reem');
  });

  it('refuses non-provider roles', async () => {
    const { conn: c } = conn([verifiedDoctor]);
    await expect(new ProviderWebsiteBadgeController(c as never).mine({ id: 'u-9', role: 'patient' })).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('public GET /providers/:id/badge', () => {
  it('escapes the provider name in the snippet and links only a doctor page', async () => {
    const { conn: c } = conn([verifiedDoctor]);
    const out = await new ProviderBadgeController(c as never).badge('dr-reem');
    expect(out.canonical_url).toBe('https://nabd.plus/ar/doctor/dr-reem');
    expect(out.embed_html).toContain('href="https://nabd.plus/ar/doctor/dr-reem"');
    expect(out.embed_html).not.toContain('<b>');
    expect(out.embed_html).toContain('&quot;النخبة&quot; &lt;b&gt;');
    expect(out.embed_html).not.toContain('badge-verified.svg');
  });

  it('has no badge for a verified non-doctor (no public profile page)', async () => {
    const { conn: c } = conn([{ ...verifiedDoctor, type: 'lab' }]);
    await expect(new ProviderBadgeController(c as never).badge('dr-reem')).rejects.toThrow('badge_not_available');
  });
});
