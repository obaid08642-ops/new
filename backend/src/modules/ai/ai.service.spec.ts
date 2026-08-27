import { BadRequestException } from '@nestjs/common';
import { AiService } from './ai.service';

describe('AiService safe guided triage and skin self-check contract', () => {
  const makeService = () => {
    const triage = { insertOne: jest.fn(async () => ({ acknowledged: true })), find: jest.fn() };
    const skin = { insertOne: jest.fn(async () => ({ acknowledged: true })) };
    const conn = { collection: jest.fn((name: string) => name === 'ai_triage_sessions' ? triage : skin) };
    const gateway = { generate: jest.fn() };
    return { service: new AiService(conn as any, gateway as any), triage, skin, gateway };
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

  it('requires an authenticated patient, explicit symptoms, and known red-flag values', async () => {
    const { service } = makeService();
    await expect(service.triage({ symptoms: 'صداع', red_flags: ['none'] }, undefined)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.triage({ symptoms: '', red_flags: ['none'] }, 'patient-1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.triage({ symptoms: 'صداع', red_flags: ['unverified_flag'] }, 'patient-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('provides skin self-check guidance only from selected observations and never analyzes or stores an image', async () => {
    const { service, skin, gateway } = makeService();
    const result = await service.skinAnalysis({
      acknowledge_limitations: true,
      areas: ['face'],
      observations: ['new_or_changing', 'bleeding_or_crusting'],
      note: 'تغير منذ فترة قصيرة',
    }, 'patient-1');

    expect(result).toEqual(expect.objectContaining({ care_level: 'clinical_assessment', image_analysis: false, diagnosis: null, treatment: null }));
    expect(skin.insertOne).toHaveBeenCalledWith(expect.objectContaining({ patient_id: 'patient-1', areas: ['face'], observations: ['new_or_changing', 'bleeding_or_crusting'] }));
    expect(gateway.generate).not.toHaveBeenCalled();
    await expect(service.skinAnalysis({ acknowledge_limitations: true, areas: ['face'], observations: ['none'], image_base64: 'image' }, 'patient-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not let a no-observation result rule out a skin condition', async () => {
    const { service } = makeService();
    const result = await service.skinAnalysis({ acknowledge_limitations: true, areas: ['hand'], observations: ['none'] }, 'patient-1');
    expect(result).toEqual(expect.objectContaining({ care_level: 'self_observation', image_analysis: false }));
    expect(result.notice).toContain('cannot_rule_out');
  });

  it('rejects automated clinical report interpretation outside a governed review workflow', async () => {
    const { service } = makeService();
    await expect(service.analyzeReportForPatient()).rejects.toBeInstanceOf(BadRequestException);
  });
});
