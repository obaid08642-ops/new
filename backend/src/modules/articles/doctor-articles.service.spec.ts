import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DoctorArticlesService } from './doctor-articles.controller';

// D-1 logic: unit tests with fake collections (the live acceptance spec runs on CI).
function serviceFor(opts: { profile?: any | null; medicines?: any[]; article?: any | null }) {
  const service: any = Object.create(DoctorArticlesService.prototype);
  const stored: any[] = [];
  const updates: any[] = [];
  const profiles = {
    findOne: jest.fn().mockImplementation(async (q: any) => {
      const p = opts.profile ?? null;
      if (!p) return null;
      // emulate the approval gate the service queries for
      if (q?.medical_review_status === 'approved'
        && (p.medical_review_status !== 'approved' || p.license_verified !== true)) return null;
      return p;
    }),
  };
  const meds = opts.medicines ?? [
    { name_ar: 'أوجمنتين', name_en: 'Augmentin', requires_prescription: true, translations: { ur: { name: 'آگمینٹن' } } },
    { name_ar: 'بنادول', name_en: 'Panadol', requires_prescription: false },
  ];
  const medicines = {
    find: jest.fn().mockImplementation((q: any) => ({
      toArray: jest.fn().mockResolvedValue(
        q?.requires_prescription === true ? meds.filter((m: any) => m.requires_prescription) : meds,
      ),
    })),
  };
  const articles = {
    insertOne: jest.fn().mockImplementation(async (doc: any) => { stored.push({ ...doc }); return { insertedId: doc._id }; }),
    findOne: jest.fn().mockImplementation(async () => (opts.article === undefined ? stored[stored.length - 1] ?? null : opts.article)),
    updateOne: jest.fn().mockImplementation(async (_q: any, u: any) => { updates.push(u); return {}; }),
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), toArray: jest.fn().mockResolvedValue(stored) }),
  };
  service.conn = { db: { collection: jest.fn((name: string) => ({ provider_profiles: profiles, medicines, articles }[name])) } };
  return { service, stored, updates, profiles, articles };
}

const approved = { id: 'doc-prof-1', user_id: 'doc-1', type: 'doctor', status: 'active', medical_review_status: 'approved', license_verified: true };
const submit = (body_ar: string) => ({ title_ar: 'النوم الصحي', body_ar, excerpt_ar: 'نصائح', category: 'general' });

describe('DoctorArticlesService (D-1)', () => {
  it('403 for patients and unapproved doctors', async () => {
    const { service } = serviceFor({ profile: null });
    await expect(service.submit('pat-1', submit('نصائح عامة'))).rejects.toThrow(ForbiddenException);
    const { service: s2 } = serviceFor({ profile: { ...approved, medical_review_status: 'pending', license_verified: false } });
    await expect(s2.submit('doc-2', submit('نصائح عامة'))).rejects.toThrow(ForbiddenException);
  });

  it('creates an in-review article carrying only the public doctor id', async () => {
    const { service, stored } = serviceFor({ profile: approved });
    const out: any = await service.submit('doc-1', submit('نصائح عامة للنوم الصحي وبنادول ليس علاجاً للأرق'));
    expect(out.status).toBe('IN_REVIEW');
    expect(out.author).toEqual({ doctor_id: 'doc-prof-1' });
    expect(JSON.stringify(out)).not.toContain('doc-1');
    expect(JSON.stringify(out)).not.toContain('+966');
    expect(stored).toHaveLength(1);
  });

  it('refuses a prescription-only brand at submit, in any language', async () => {
    const { service } = serviceFor({ profile: approved });
    for (const name of ['أوجمنتين', 'Augmentin', 'augmentin', 'آگمینٹن']) {
      await expect(service.submit('doc-1', submit(`علاج الالتهاب ${name} حسب الطبيب`))).rejects.toThrow(BadRequestException);
    }
  });

  it('approves then publishes; re-checks a catalogue that changed meanwhile', async () => {
    const meds: any[] = [{ name_ar: 'فولتارين', name_en: 'Voltaren', requires_prescription: false }];
    const { service, updates } = serviceFor({ profile: approved, medicines: meds, article: null });
    await service.submit('doc-1', submit('كثيرون يستعملون فولتارين للظهر'));
    // catalogue flips meanwhile
    meds[0].requires_prescription = true;
    const pending = { id: 'a-1', status: 'IN_REVIEW', title_ar: 't', body_ar: 'كثيرون يستعملون فولتارين للظهر' };
    const { service: s2, updates: u2 } = serviceFor({ profile: approved, medicines: meds, article: pending });
    await expect(s2.approve('a-1')).rejects.toThrow(BadRequestException);
    expect(u2).toHaveLength(0);
    meds[0].requires_prescription = false;
    await expect(s2.approve('a-1')).resolves.toMatchObject({ ok: true, status: 'PUBLISHED' });
    expect(u2[0].$set.status).toBe('PUBLISHED');
    void updates;
  });

  it('rejects with a reason and 404s unknown ids', async () => {
    const { service, updates } = serviceFor({ profile: approved, article: { id: 'a-2', status: 'IN_REVIEW' } });
    await expect(service.reject('a-2', '')).rejects.toThrow(BadRequestException);
    await expect(service.reject('a-2', 'needs sources')).resolves.toMatchObject({ ok: true, status: 'REJECTED' });
    expect(updates[0].$set.rejection_reason).toBe('needs sources');
    const { service: s2 } = serviceFor({ profile: approved, article: null });
    await expect(s2.approve('missing')).rejects.toThrow(NotFoundException);
  });

  it('lists only the doctor own articles', async () => {
    const { service } = serviceFor({ profile: approved });
    await service.submit('doc-1', submit('نصائح عامة'));
    const rows: any[] = await service.mine('doc-1');
    expect(rows).toHaveLength(1);
    const { service: s2 } = serviceFor({ profile: null });
    await expect(s2.mine('pat-1')).resolves.toEqual([]);
  });
});
