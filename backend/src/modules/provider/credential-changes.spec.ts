import { BadRequestException } from '@nestjs/common';
import { applyCredentialTypes, changedCredentials, CREDENTIAL_FIELDS, normalizeCredential, splitCredentialPatch } from './credential-changes';
import { ProviderProfileService } from './services/provider-profile.service';
import { ProviderAdminService } from './services/provider-admin.service';

describe('credential field split', () => {
  it('the credential fields are specialty, degree, licence number(s) and licence expiry', () => {
    expect([...CREDENTIAL_FIELDS]).toEqual(['specialty', 'degree', 'medical_license_number', 'facility_license_number', 'license_expiry_date']);
  });
  it('separates them from the direct fields', () => {
    const { credentials, rest } = splitCredentialPatch({ specialty: 'Cardiology', description_ar: 'نبذة', degree: 'MD', website: 'x', license_expiry_date: '2030-01-01' });
    expect(Object.keys(credentials).sort()).toEqual(['degree', 'license_expiry_date', 'specialty']);
    expect(rest).toEqual({ description_ar: 'نبذة', website: 'x' });
  });
});

describe('changedCredentials', () => {
  const live = { specialty: 'Cardiology', degree: 'MD', medical_license_number: 'L-1', license_expiry_date: new Date('2028-05-01T00:00:00Z') };
  it('keeps only the fields that differ, with the old values', () => {
    const r = changedCredentials({ specialty: ' Cardiology ', degree: 'PhD', license_expiry_date: '2028-05-01', medical_license_number: 'L-2' }, live);
    expect(r.next).toEqual({ degree: 'PhD', medical_license_number: 'L-2' });
    expect(r.previous).toEqual({ degree: 'MD', medical_license_number: 'L-1' });
  });
  it('a first value has a null old value; a new expiry compares by day', () => {
    expect(changedCredentials({ specialty: 'ENT' }, {}).previous).toEqual({ specialty: null });
    expect(changedCredentials({ license_expiry_date: '2029-01-01' }, live).next).toEqual({ license_expiry_date: '2029-01-01' });
  });
  it('refuses empty, over-long and invalid values', () => {
    expect(() => normalizeCredential('degree', '  ')).toThrow(BadRequestException);
    expect(() => normalizeCredential('specialty', 'x'.repeat(201))).toThrow('specialty_invalid');
    expect(() => normalizeCredential('license_expiry_date', 'not a date')).toThrow('license_expiry_date_invalid');
  });
  it('approval turns the expiry day into a Date', () => {
    expect(applyCredentialTypes({ license_expiry_date: '2029-01-01', degree: 'x' })).toEqual({ license_expiry_date: new Date('2029-01-01T00:00:00.000Z'), degree: 'x' });
  });
});

function fakeConn(opts: { live?: any; docs?: any[]; pending?: any } = {}) {
  const calls: Record<string, any[]> = { insert: [], updateMany: [] };
  const coll = (name: string): any => ({
    findOne: jest.fn(async (q: any) => {
      if (name === 'provider_profiles') return opts.live ?? null;
      if (name === 'provider_documents') return (opts.docs ?? []).find((d) => d.doc_type === q.doc_type.$eq) ?? null;
      if (name === 'provider_deltas') return opts.pending ?? null;
      return null;
    }),
    insertOne: jest.fn(async (d: any) => { calls.insert.push({ name, d }); }),
    updateMany: jest.fn(async (...a: any[]) => { calls.updateMany.push({ name, a }); }),
  });
  return { conn: { collection: jest.fn((n: string) => coll(n)) } as any, calls };
}

function profileService(conn: any, profile: any = { account_id: 'dr-1', provider_type: 'doctor' }) {
  const audit = { create: jest.fn().mockResolvedValue({}) };
  const profiles = { findOne: jest.fn().mockResolvedValue(profile) };
  return { svc: new ProviderProfileService({} as any, profiles as any, {} as any, {} as any, audit as any, conn, {} as any, { emit: jest.fn() } as any), audit };
}

describe('PATCH /provider/profile with credential fields', () => {
  it('writes nothing directly: a pending credentials delta with old, new and the proof', async () => {
    const { conn, calls } = fakeConn({
      live: { account_id: 'dr-1', specialty: 'Cardiology', degree: 'MD' },
      docs: [{ id: 'doc-9', doc_type: 'academic_certificate', storage_object_id: 'so-1', review_status: 'pending' }],
    });
    const { svc, audit } = profileService(conn);
    const res: any = await svc.updateProfile({ id: 'dr-1' }, { degree: 'PhD', specialty: 'Cardiology' });
    expect(res).toMatchObject({ pending_review: true, credentials_pending: ['degree'], data: { target: 'credentials', status: 'pending' } });
    const delta = calls.insert.find((i) => i.name === 'provider_deltas')!.d;
    expect(delta).toMatchObject({ provider_id: 'dr-1', target: 'credentials', status: 'pending', requested_changes: { degree: 'PhD' }, old_values: { degree: 'MD' } });
    expect(delta.proof).toEqual([{ document_id: 'doc-9', doc_type: 'academic_certificate', storage_object_id: 'so-1', review_status: 'pending' }]);
    expect(calls.insert.filter((i) => i.name === 'provider_profiles')).toEqual([]);
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'delta.submitted', after: { target: 'credentials', fields: ['degree'] } }));
    // an older pending credentials request is replaced
    expect(calls.updateMany[0].a[0]).toMatchObject({ target: 'credentials', status: 'pending' });
    expect(calls.updateMany[0].a[1].$set.status).toBe('superseded');
  });
  it('no proof uploaded: the delta says so with an empty list', async () => {
    const { conn, calls } = fakeConn({ live: { account_id: 'dr-1' } });
    await profileService(conn).svc.updateProfile({ id: 'dr-1' }, { specialty: 'ENT' });
    expect(calls.insert[0].d.proof).toEqual([]);
  });
  it('other fields keep their existing path (a profile delta); both groups make two deltas', async () => {
    const { conn, calls } = fakeConn({ live: { account_id: 'dr-1' } });
    const res: any = await profileService(conn).svc.updateProfile({ id: 'dr-1' }, { description_ar: 'نبذة', specialty: 'ENT' });
    const targets = calls.insert.map((i) => i.d.target);
    expect(targets.sort()).toEqual(['credentials', 'profile']);
    expect(res).toMatchObject({ credentials_pending: ['specialty'] });
  });
  it('an unchanged credential is not sent for review', async () => {
    const { conn } = fakeConn({ live: { account_id: 'dr-1', specialty: 'ENT' } });
    await expect(profileService(conn).svc.updateProfile({ id: 'dr-1' }, { specialty: 'ENT' })).rejects.toThrow('no_credential_change');
  });
  it('the profile read says which credential fields are pending review', async () => {
    const { conn } = fakeConn({ pending: { id: 'd-1', requested_changes: { degree: 'PhD' }, createdAt: new Date('2026-11-02') } });
    const res: any = await profileService(conn, { account_id: 'dr-1', specialty: 'ENT' }).svc.getProfile({ id: 'dr-1' });
    expect(res.pending_credentials).toEqual({ delta_id: 'd-1', fields: { degree: 'PhD' }, requested_at: new Date('2026-11-02') });
    const none: any = await profileService(fakeConn().conn, { account_id: 'dr-1' }).svc.getProfile({ id: 'dr-1' });
    expect(none.pending_credentials).toBeNull();
  });
});

describe('admin approves a credentials delta', () => {
  it('applies the approved value to the profile (expiry as a Date) and audits old and new', async () => {
    const delta = { id: 'd-1', status: 'pending', target: 'credentials', provider_id: 'dr-1', requested_changes: { degree: 'PhD', license_expiry_date: '2030-02-01' }, old_values: { degree: 'MD', license_expiry_date: '2028-05-01' } };
    const updates: any[] = [];
    const col = (name: string): any => ({
      findOne: jest.fn(async () => (name === 'provider_deltas' ? delta : null)),
      updateOne: jest.fn(async (...a: any[]) => { updates.push({ name, a }); return { modifiedCount: 1 }; }),
    });
    const audit = { create: jest.fn().mockResolvedValue({}) };
    const svc: any = Object.create(ProviderAdminService.prototype);
    svc.accounts = { model: { db: { collection: jest.fn((n: string) => col(n)) }, updateOne: jest.fn() } };
    svc.audit = audit; svc.events = { emit: jest.fn() }; svc.seoPipeline = { processEntity: jest.fn().mockResolvedValue(undefined) };
    svc.assertAdmin = jest.fn();
    await svc.approveDelta({ id: 'admin-1' }, 'd-1');
    const profileUpdate = updates.find((u) => u.name === 'provider_profiles')!;
    expect(profileUpdate.a[1].$set).toMatchObject({ degree: 'PhD', license_expiry_date: new Date('2030-02-01T00:00:00.000Z') });
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'admin.provider_delta_approved', before: delta.old_values, after: expect.objectContaining({ changes: expect.objectContaining({ degree: 'PhD' }) }) }));
  });
});
