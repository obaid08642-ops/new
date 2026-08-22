import { NotFoundException } from '@nestjs/common';
import { CareService } from '../care.service';
import { ProviderStatus, ProviderType } from '../../../common/enums';

const asDoc = (data: any) => ({ ...data, toObject: () => ({ ...data }) });

describe('CareService public discovery contract', () => {
  let service: CareService;
  let providers: any;
  let facilities: any;
  let slots: any;

  beforeEach(() => {
    providers = {
      aggregate: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(1),
      findOne: jest.fn(),
      find: jest.fn(),
      db: { collection: jest.fn(() => ({ find: jest.fn(() => ({ sort: jest.fn(() => ({ limit: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue([]) })) })) })) })) },
    };
    facilities = { findOne: jest.fn(), find: jest.fn() };
    slots = { nextAvailable: jest.fn().mockResolvedValue('2026-09-01T09:00:00.000Z'), hasSlotsToday: jest.fn().mockResolvedValue(true), slotsForDate: jest.fn() };
    service = new CareService(providers, {} as any, facilities, slots);
  });

  it('requires an active, explicitly public-reviewed doctor and removes KYC, bank, address and exact location fields from public detail', async () => {
    providers.findOne.mockResolvedValue(asDoc({
      id: 'doctor-1', type: ProviderType.DOCTOR, status: ProviderStatus.ACTIVE, public_eligibility: true, medical_review_status: 'approved', name_ar: 'طبيب', specialty: 'cardiology',
      license_number: 'LIC-SECRET', license_documents: ['private.pdf'], user_id: 'internal-user', iban: 'SA-SECRET',
      address: 'Private address', location: { lat: 24.7, lng: 46.6 }, insurance_contracts: [{ internal: true }],
      accepted_insurance: ['insurer-a'], consultation_modes: ['clinic'],
    }));
    facilities.findOne.mockResolvedValue(null);
    providers.find.mockReturnValue({ limit: jest.fn().mockResolvedValue([]) });

    const result = await service.doctorById('doctor-1');

    expect(providers.findOne).toHaveBeenCalledWith(
      { id: 'doctor-1', type: ProviderType.DOCTOR, status: ProviderStatus.ACTIVE, public_eligibility: true, medical_review_status: 'approved' },
      { _id: 0, __v: 0 },
    );
    expect(result).toMatchObject({ id: 'doctor-1', specialty: 'cardiology', accepted_insurance: ['insurer-a'] });
    expect(result).not.toHaveProperty('license_number');
    expect(result).not.toHaveProperty('license_documents');
    expect(result).not.toHaveProperty('user_id');
    expect(result).not.toHaveProperty('iban');
    expect(result).not.toHaveProperty('address');
    expect(result).not.toHaveProperty('location');
    expect(result).not.toHaveProperty('insurance_contracts');
  });

  it('does not expose slots for an inactive, pending or unknown doctor', async () => {
    providers.findOne.mockResolvedValue(null);
    await expect(service.doctorSlots('doctor-1', '2026-09-01', 'clinic')).rejects.toThrow(NotFoundException);
    expect(providers.findOne).toHaveBeenCalledWith({ id: 'doctor-1', type: ProviderType.DOCTOR, status: ProviderStatus.ACTIVE, public_eligibility: true, medical_review_status: 'approved' });
    expect(slots.slotsForDate).not.toHaveBeenCalled();
  });

  it('requires an active, explicitly public-reviewed facility and returns an allowlisted facility/doctor directory', async () => {
    facilities.findOne.mockResolvedValue(asDoc({
      id: 'facility-1', is_active: true, public_eligibility: true, medical_review_status: 'approved', name_ar: 'منشأة', city: 'الرياض', phone: '+966-secret', email: 'private@example.test',
      address: 'Private address', location: { lat: 24.7, lng: 46.6 }, insurance_contracts: [{ secret: true }],
    }));
    providers.find.mockReturnValue({ limit: jest.fn().mockResolvedValue([asDoc({ id: 'doctor-1', name_ar: 'طبيب', type: ProviderType.DOCTOR, status: ProviderStatus.ACTIVE, public_eligibility: true, medical_review_status: 'approved' })]) });

    const result = await service.facilityById('facility-1');

    expect(facilities.findOne).toHaveBeenCalledWith({ id: 'facility-1', is_active: true, public_eligibility: true, medical_review_status: 'approved' }, { _id: 0, __v: 0 });
    expect(result).toMatchObject({ id: 'facility-1', name_ar: 'منشأة', doctors: [{ id: 'doctor-1' }] });
    expect(result).not.toHaveProperty('phone');
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('address');
    expect(result).not.toHaveProperty('location');
    expect(result).not.toHaveProperty('insurance_contracts');
  });

  it('reports published provider counts using the canonical specialty slug only', async () => {
    providers.aggregate.mockResolvedValue([{ _id: 'cardiology', count: 2 }, { _id: 'internal_medicine', count: 1 }]);

    const result = await service.specialties();

    expect(providers.aggregate).toHaveBeenCalledWith([
      { $match: { type: ProviderType.DOCTOR, status: ProviderStatus.ACTIVE, public_eligibility: true, medical_review_status: 'approved' } },
      { $group: { _id: '$specialty', count: { $sum: 1 } } },
    ]);
    expect(result.find((item: any) => item.slug === 'cardiology')).toMatchObject({ count: 2, published_provider_count: 2 });
    expect(result.find((item: any) => item.slug === 'internal_medicine')).toMatchObject({ count: 1, published_provider_count: 1 });
  });

  it('escapes user search metacharacters and reports exact total only when it is exact', async () => {
    providers.find.mockReturnValue({ sort: jest.fn(() => ({ limit: jest.fn().mockResolvedValue([]) })) });

    const result = await service.listDoctors({ q: '.*', page: 2, limit: 5 });

    const query = providers.find.mock.calls[0][0];
    expect(query.$or[0].name_ar).toBeInstanceOf(RegExp);
    expect(query.$or[0].name_ar.source).toBe('\\.\\*');
    expect(providers.countDocuments).toHaveBeenCalledWith(query);
    expect(result).toMatchObject({ page: 2, limit: 5, total: 1, total_is_exact: true, has_more: false, items: [] });
  });
});
