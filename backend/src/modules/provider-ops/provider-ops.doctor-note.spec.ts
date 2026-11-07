import { ProviderOpsService } from './provider-ops.module';

// A doctor's note from the EMR / AI copilot screen: on the doctor's own visit, for that visit's patient, encrypted at rest.
function setup(appt: any) {
  const inserted: any[] = [];
  const conn = { collection: (name: string) => ({
    findOne: async () => appt,
    insertOne: async (d: any) => { inserted.push([name, d]); },
  }) };
  return { svc: new ProviderOpsService(conn as never, { emit: jest.fn() } as never), inserted };
}
const doc = { id: 'dr-1', role: 'doctor' };

describe('saveDoctorNote', () => {
  it('stores the note for the visit, with the patient, protected', async () => {
    const { svc, inserted } = setup({ id: 'a1', patient_id: 'p1', doctor_user_id: 'dr-1' });
    await expect(svc.saveDoctorNote(doc, { patient_id: 'p1', appointment_id: 'a1', note: '  S: صداع  ' })).resolves.toEqual({ ok: true });
    expect(inserted).toHaveLength(1);
    expect(inserted[0][0]).toBe('consultationnotes');
    expect(inserted[0][1]).toMatchObject({ appointment_id: 'a1', doctor_id: 'dr-1', patient_id: 'p1' });
    // the field goes through protectHealthDoc (ciphertext at rest is proved against the live database by j_provider_crm)
    expect(String(inserted[0][1].notes)).toContain('صداع');
    expect(String(inserted[0][1].notes).startsWith(' ')).toBe(false);
  });
  it('refuses another doctor\'s visit, a patient mismatch, an empty note and an unknown visit', async () => {
    const own = { id: 'a1', patient_id: 'p1', doctor_user_id: 'dr-1' };
    await expect(setup({ ...own, doctor_user_id: 'dr-2' }).svc.saveDoctorNote(doc, { patient_id: 'p1', appointment_id: 'a1', note: 'x' })).rejects.toThrow('appointment_not_owned');
    await expect(setup(own).svc.saveDoctorNote(doc, { patient_id: 'p9', appointment_id: 'a1', note: 'x' })).rejects.toThrow('mismatch');
    await expect(setup(own).svc.saveDoctorNote(doc, { patient_id: 'p1', appointment_id: 'a1', note: '   ' })).rejects.toThrow('note is required');
    await expect(setup(null).svc.saveDoctorNote(doc, { patient_id: 'p1', appointment_id: 'a1', note: 'x' })).rejects.toThrow('appointment not found');
  });
  it('an admin may write on any visit', async () => {
    const { svc, inserted } = setup({ id: 'a1', patient_id: 'p1', doctor_user_id: 'dr-2' });
    await svc.saveDoctorNote({ id: 'adm', role: 'admin' }, { patient_id: 'p1', appointment_id: 'a1', note: 'x' });
    expect(inserted).toHaveLength(1);
  });
});
