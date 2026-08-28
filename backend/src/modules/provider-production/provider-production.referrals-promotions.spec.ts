import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProviderProductionService } from './provider-production.module';

type Row = Record<string, any>;

function cursor(rows: Row[]) {
  const chain: any = {
    sort: jest.fn(),
    limit: jest.fn(),
    toArray: jest.fn().mockResolvedValue(rows),
  };
  chain.sort.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  return chain;
}

describe('ProviderProductionService referrals, network, and promotions', () => {
  const users = { findOne: jest.fn() };
  const appointments = { findOne: jest.fn() };
  const profiles = { findOne: jest.fn(), find: jest.fn() };
  const accounts = { findOne: jest.fn(), find: jest.fn() };
  const referrals = { insertOne: jest.fn() };
  const promotions = { insertOne: jest.fn(), find: jest.fn() };
  const collections: Record<string, any> = {
    users,
    appointments,
    provider_profiles: profiles,
    provider_accounts: accounts,
    outbound_referrals: referrals,
    promotioncampaigns: promotions,
  };
  const connection = { collection: jest.fn((name: string) => collections[name]) };
  const service = new ProviderProductionService(connection as any);
  const doctor = { id: 'doctor-1', role: 'doctor' };

  beforeEach(() => {
    jest.clearAllMocks();
    referrals.insertOne.mockResolvedValue({ acknowledged: true });
    promotions.insertOne.mockResolvedValue({ acknowledged: true });
  });

  it('creates a referral from the authenticated patient record and an approved destination', async () => {
    users.findOne.mockResolvedValue({ id: 'patient-1', role: 'patient', full_name: 'Server Patient' });
    profiles.findOne.mockResolvedValue({ account_id: 'lab-1', type: 'lab', display_name_ar: 'مختبر خادم' });
    accounts.findOne.mockResolvedValue({ id: 'lab-1', status: 'approved' });

    const result = await service.createReferral(doctor, {
      patient_id: 'patient-1',
      patient_name: 'Untrusted client name',
      target_type: 'lab',
      target_provider_id: 'lab-1',
      target_name: 'Untrusted client destination',
      requested_tests: ['CBC'],
      notes: 'Needs testing',
    });

    expect(result.patient_name).toBe('Server Patient');
    expect(result.target_name).toBe('مختبر خادم');
    expect(result.target_provider_id).toBe('lab-1');
    expect(result.referral_code).toMatch(/^REF-[A-Z0-9]{10}$/);
    expect(referrals.insertOne).toHaveBeenCalledWith(expect.objectContaining({
      patient_id: 'patient-1', referrer_doctor_id: 'doctor-1', target_type: 'lab', target_provider_id: 'lab-1',
    }));
  });

  it('rejects unknown patients, non-doctor callers, and inactive destinations', async () => {
    users.findOne.mockResolvedValueOnce(null);
    await expect(service.createReferral(doctor, { patient_id: 'missing', target_type: 'lab', notes: 'x' }))
      .rejects.toBeInstanceOf(NotFoundException);

    await expect(service.createReferral({ id: 'lab-user', role: 'lab' }, { patient_id: 'patient-1', target_type: 'lab', notes: 'x' }))
      .rejects.toBeInstanceOf(ForbiddenException);

    users.findOne.mockResolvedValueOnce({ id: 'patient-1', role: 'patient' });
    profiles.findOne.mockResolvedValueOnce({ account_id: 'lab-1', type: 'lab' });
    accounts.findOne.mockResolvedValueOnce(null);
    await expect(service.createReferral(doctor, { patient_id: 'patient-1', target_type: 'lab', target_provider_id: 'lab-1', notes: 'x' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('enforces appointment ownership and patient linkage when an appointment is supplied', async () => {
    users.findOne.mockResolvedValue({ id: 'patient-1', role: 'patient' });
    appointments.findOne.mockResolvedValue({ id: 'appointment-1', patient_id: 'patient-2', doctor_id: 'doctor-1' });

    await expect(service.createReferral(doctor, {
      patient_id: 'patient-1', appointment_id: 'appointment-1', target_type: 'radiology', notes: 'x',
    })).rejects.toBeInstanceOf(ForbiddenException);

    appointments.findOne.mockResolvedValue({ id: 'appointment-1', patient_id: 'patient-1', doctor_id: 'other-doctor' });
    await expect(service.createReferral(doctor, {
      patient_id: 'patient-1', appointment_id: 'appointment-1', target_type: 'radiology', notes: 'x',
    })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns only profiles backed by approved or active accounts and supports the current type field', async () => {
    profiles.find.mockReturnValue(cursor([
      { account_id: 'lab-approved', type: 'lab', display_name_ar: 'معمل معتمد' },
      { account_id: 'rad-legacy', provider_type: 'radiology', display_name_en: 'Legacy Radiology' },
      { account_id: 'lab-pending', type: 'lab', display_name_ar: 'معلق' },
    ]));
    accounts.find.mockReturnValue(cursor([{ id: 'lab-approved' }, { id: 'rad-legacy' }]));

    await expect(service.referralNetwork(doctor)).resolves.toEqual([
      { id: 'lab-approved', name: 'معمل معتمد', name_en: 'معمل معتمد', type: 'lab' },
      { id: 'rad-legacy', name: 'Legacy Radiology', name_en: 'Legacy Radiology', type: 'radiology' },
    ]);
    expect(accounts.find).toHaveBeenCalledWith(
      { id: { $in: ['lab-approved', 'rad-legacy', 'lab-pending'] }, status: { $in: ['approved', 'active'] } },
      expect.any(Object),
    );
  });

  it('scopes promotion listing and only persists validated pending-review campaigns', async () => {
    promotions.find.mockReturnValue(cursor([{ id: 'promo-1', provider_account_id: 'doctor-1' }]));
    await expect(service.listPromotions(doctor)).resolves.toEqual([{ id: 'promo-1', provider_account_id: 'doctor-1' }]);
    expect(promotions.find).toHaveBeenCalledWith(
      { $or: [{ provider_account_id: 'doctor-1' }, { provider_id: 'doctor-1' }] },
      expect.any(Object),
    );

    const result = await service.createPromotion(doctor, {
      title_ar: 'عرض', original_price: 100, discounted_price: 80,
      start_date: '2026-08-27T00:00:00.000Z', end_date: '2026-08-28T00:00:00.000Z',
    });
    expect(result.status).toBe('pending_review');
    expect(promotions.insertOne).toHaveBeenCalledWith(expect.objectContaining({
      provider_account_id: 'doctor-1', original_price: 100, discounted_price: 80,
    }));

    await expect(service.createPromotion(doctor, {
      title_ar: 'Invalid', original_price: 80, discounted_price: 100,
      start_date: '2026-08-28T00:00:00.000Z', end_date: '2026-08-27T00:00:00.000Z',
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});
