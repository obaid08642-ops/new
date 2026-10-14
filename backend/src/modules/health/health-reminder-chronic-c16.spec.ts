import { HealthService } from './health.service';

// OC-C C-16 (676): the reminder list returns chronic and PATCH persists it.
function serviceFor() {
  const service: any = Object.create(HealthService.prototype);
  const doc: any = { id: 'rem-1', patient_id: 'pat-1', medicine_name_ar: 'دواء', dose: '1', times: ['08:00'], time_zone: 'UTC', chronic: true, active: true, toObject() { return { ...this }; } };
  let saved: any = null;
  service.reminders = {
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([doc]) }),
    findOne: jest.fn().mockResolvedValue(doc),
    findOneAndUpdate: jest.fn().mockImplementation(async (_q: any, u: any) => { saved = u?.$set; Object.assign(doc, saved); return doc; }),
  };
  return { service: service as HealthService, getSaved: () => saved };
}

describe('OC C-16 chronic reminder round-trip', () => {
  it('listMedicationReminders returns the chronic flag', async () => {
    const { service } = serviceFor();
    const rows: any[] = await service.listMedicationReminders({ id: 'pat-1' });
    expect(rows[0]?.chronic).toBe(true);
  });

  it('updateReminder persists a chronic change', async () => {
    const { service, getSaved } = serviceFor();
    await service.updateReminder({ id: 'pat-1' }, 'rem-1', { chronic: false, dose: '1', times: ['08:00'], time_zone: 'UTC' });
    expect(getSaved()?.chronic).toBe(false);
  });
});
