import { BadRequestException } from '@nestjs/common';
import { AiService } from './ai.service';

describe('AiService safe guided triage contract', () => {
  const makeService = () => {
    const triage = { insertOne: jest.fn(async () => ({ acknowledged: true })), find: jest.fn() };
    const conn = { collection: jest.fn(() => triage) };
    const gateway = { generate: jest.fn() };
    return { service: new AiService(conn as any, gateway as any), triage, gateway };
  };

  it('stores patient-selected red flags and escalates without a disease prediction, tests, or treatment', async () => {
    const { service, triage, gateway } = makeService();
    const result = await service.triage({ symptoms: 'ألم وضيق في التنفس', body_region: 'chest', red_flags: ['chest_pain', 'breathing_difficulty'] }, 'patient-1');

    expect(result).toEqual(expect.objectContaining({
      care_level: 'emergency',
      selected_red_flags: ['chest_pain', 'breathing_difficulty'],
      diagnosis: null,
      treatment: null,
    }));
    expect(triage.insertOne).toHaveBeenCalledWith(expect.objectContaining({ patient_id: 'patient-1', care_level: 'emergency' }));
    expect(gateway.generate).not.toHaveBeenCalled();
  });

  it('names the doctor specialty the words point to, or null when none matches (issues 871, 879)', async () => {
    const { service, triage } = makeService();
    const skin = await service.triage({ symptoms: 'طفح جلدي وحكة منذ يومين', red_flags: ['none'] }, 'patient-1');
    expect(skin).toEqual(expect.objectContaining({ care_level: 'consultation', specialty: 'dermatology' }));
    expect(triage.insertOne).toHaveBeenLastCalledWith(expect.objectContaining({ specialty: 'dermatology' }));
    const vague = await service.triage({ symptoms: 'tired all day', red_flags: ['none'] }, 'patient-1');
    expect(vague.specialty).toBeNull();
  });

  it('requires an authenticated patient, explicit symptoms, and known red-flag values', async () => {
    const { service } = makeService();
    await expect(service.triage({ symptoms: 'صداع', red_flags: ['none'] }, undefined)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.triage({ symptoms: '', red_flags: ['none'] }, 'patient-1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.triage({ symptoms: 'صداع', red_flags: ['unverified_flag'] }, 'patient-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects automated clinical report interpretation outside a governed review workflow', async () => {
    const { service } = makeService();
    await expect(service.analyzeReportForPatient()).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AiService.prescriptionOcr catalogue link (#881)', () => {
  it('adds the matched public medicine id and slug to each line, null when nothing matches', async () => {
    const findOne = jest.fn(async (q: any) => (q.$or[0].name_en.test('Panadol 500') && q.$or[0].name_en.source.startsWith('^Panadol') ? { id: 'med-1', slug: 'panadol-500' } : null));
    const conn = { collection: jest.fn(() => ({ findOne })) };
    const service: any = new AiService(conn as any, { generate: jest.fn() } as any);
    service.ocrTranslate = jest.fn(async () => ({ items: [{ raw_name_string: 'Panadol 500', requested_quantity: 2 }, { raw_name_string: 'Unknown pill' }] }));
    const out = await service.prescriptionOcr('aGVsbG8=');
    expect(out.items).toEqual([
      { raw_name_string: 'Panadol 500', requested_quantity: 2, medicine_id: 'med-1', slug: 'panadol-500' },
      { raw_name_string: 'Unknown pill', medicine_id: null, slug: null },
    ]);
    expect(findOne.mock.calls[0][0]).toEqual(expect.objectContaining({ public_eligibility: true, medical_review_status: 'approved' }));
  });
});
