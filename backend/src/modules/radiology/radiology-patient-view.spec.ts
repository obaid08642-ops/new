import { RadiologyOpsService } from './radiology.service';

/** Design parity (#1819): the radiology booking read carries the technician's name and, once published, the report files. */
describe('radiology booking: technician and report files', () => {
  const booking = (over: any = {}) => ({ id: 'b1', patient_id: 'pat-1', provider_account_id: 'rad-1', state: 'REPORT_READY', technician_id: 'tech-1', report_storage_object_id: 'o1', dicom_storage_object_id: 'o2', scan_storage_object_ids: ['o3', 'o9'], ...over });
  const svc = (b: any) => {
    const s: any = Object.create(RadiologyOpsService.prototype);
    s.bkgModel = { findOne: () => ({ lean: async () => b }) };
    s.userModel = { findOne: () => ({ lean: async () => ({ full_name: ' Sara Tech ', phone: '+9665', licence: 'X' }) }) };
    s.storageObjects = { find: () => ({ lean: async () => [{ id: 'o1', mime: 'application/pdf', original_name: 'r.pdf', owner_account_id: 'rad-1' }, { id: 'o2', mime: 'application/dicom' }, { id: 'o3', mime: 'image/png', original_name: 'a.png' }] }) };
    return s as RadiologyOpsService;
  };

  it('the patient sees the technician name only and the published files by id and kind (missing objects left out)', async () => {
    const out: any = await svc(booking()).getBooking('b1', { id: 'pat-1', role: 'patient' });
    expect(out.technician).toEqual({ name: 'Sara Tech' });
    expect(out.report_files).toEqual([
      { id: 'o1', kind: 'report', mime: 'application/pdf', name: 'r.pdf' },
      { id: 'o2', kind: 'dicom', mime: 'application/dicom', name: null },
      { id: 'o3', kind: 'image', mime: 'image/png', name: 'a.png' },
    ]);
    expect(JSON.stringify(out.technician)).not.toMatch(/9665|licence/);
  });

  it('no files before the report is published, none for the provider, and no technician when none is assigned', async () => {
    expect(((await svc(booking({ state: 'UNDER_REVIEW' })).getBooking('b1', { id: 'pat-1', role: 'patient' })) as any).report_files).toBeNull();
    expect(((await svc(booking()).getBooking('b1', { id: 'rad-1', role: 'radiology' })) as any).report_files).toBeUndefined();
    expect(((await svc(booking({ technician_id: undefined })).getBooking('b1', { id: 'pat-1', role: 'patient' })) as any).technician).toBeNull();
  });

  it('tracking names the technician too', async () => {
    const out: any = await svc(booking()).getTracking('b1', { id: 'pat-1', role: 'patient' });
    expect(out.technician).toEqual({ name: 'Sara Tech' });
  });
});
