import { isReportId, readReportDetail, readReportList } from '../../utils/medicalReport';

/** PT-08: the medical reports the patient reads. TEST values only. */
describe('medical reports (rest period)', () => {
  it('reads the list, marks revoked ones and the Seha number, and drops rows without an id', () => {
    const rows = readReportList([
      { id: 'r1', serial: 'MED-2026-000001', status: 'issued', from: '2026-11-10', to: '2026-11-12', days: 3, doctor_name: 'Dr Test', national_id: '*******123', seha_status: 'pending', seha_number: null },
      { id: 'r2', serial: 'MED-2026-000002', status: 'revoked', seha_status: 'registered', seha_number: 'SEHA-77' },
      { serial: 'no-id' },
    ]);
    expect(rows.map((r) => [r.id, r.revoked, r.sehaNumber])).toEqual([['r1', false, null], ['r2', true, 'SEHA-77']]);
    expect(rows[0]).toMatchObject({ from: '2026-11-10', to: '2026-11-12', days: 3, idNumber: '*******123' });
    expect(readReportList({ data: [{ id: 'r3' }] })).toHaveLength(1);
    expect(readReportList(null)).toEqual([]);
  });
  it('a Seha number without the registered state stays pending', () => {
    expect(readReportList([{ id: 'r1', seha_status: 'pending', seha_number: 'X-1' }])[0].sehaNumber).toBeNull();
  });
  it('reads the detail in full; the diagnosis only when the server sent it', () => {
    const d = readReportDetail({ id: 'r1', patient_name: 'Test Patient', doctor_specialty_en: 'Cardiology', doctor_license_no: 'SCFHS-1', consultation_at: '2026-11-09T09:00:00Z', booking_ref: 'BK-1', reason: 'Rest', diagnosis: null });
    expect(d).toMatchObject({ patientName: 'Test Patient', specialtyEn: 'Cardiology', licenceNo: 'SCFHS-1', bookingRef: 'BK-1', reason: 'Rest', diagnosis: null });
    expect(readReportDetail({ id: 'r1', diagnosis: 'Flu' })?.diagnosis).toBe('Flu');
    expect(readReportDetail({})).toBeNull();
  });
  it('puts only a real id in a path', () => {
    expect(isReportId('MED-2026-000001')).toBe(true);
    for (const bad of ['', 'a', '../x', 'a/b', 'x y']) expect(isReportId(bad)).toBe(false);
  });
});
