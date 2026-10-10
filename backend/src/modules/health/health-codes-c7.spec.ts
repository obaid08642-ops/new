import { HealthService } from './health.service';

// OC-C C-7: health answers carry i18n keys + catalogue ids; one report concept.
function serviceFor(overrides: any = {}) {
  const service: any = Object.create(HealthService.prototype);
  service.vitals = {
    findOne: jest.fn().mockImplementation((q: any) => ({
      sort: jest.fn().mockResolvedValue(q?.type === 'heart_rate' ? { type: 'heart_rate', value: '72', unit: 'bpm', measured_at: new Date() } : null),
    })),
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) }),
    countDocuments: jest.fn().mockResolvedValue(0),
  };
  service.conn = {
    model: jest.fn(() => ({ findOne: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }) })),
    db: { collection: jest.fn(() => ({ find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), toArray: jest.fn().mockResolvedValue([]) }) })) },
  };
  service.sleepModel = { findOne: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue(null) }) };
  Object.assign(service, overrides);
  return service as HealthService;
}

describe('OC C-7 health codes and ids', () => {
  it('vitals summary rows carry a label_key', async () => {
    const rows: any[] = await serviceFor().vitalsSummary({ id: 'pat-1' });
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(typeof r.label_key).toBe('string');
  });

  it('health score carries status_key, component label_keys and a message_key', async () => {
    const out: any = await serviceFor().healthScore({ id: 'pat-1' });
    expect(typeof out.status_key).toBe('string');
    expect(typeof out.message_key).toBe('string');
    for (const c of out.components) expect(typeof c.label_key).toBe('string');
  });

  it('trend rows carry a name_key', async () => {
    const svc: any = serviceFor();
    svc.vitals.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ value: '72', measured_at: new Date() }, { value: '75', measured_at: new Date() }]),
    });
    const rows: any[] = await svc.listTrends({ id: 'pat-1' });
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(typeof r.name_key).toBe('string');
  });

  it('prescription items expose medicine_id', async () => {
    const svc: any = serviceFor();
    const rx = { id: 'rx-1', createdAt: new Date(), doctor_id: null, state: 'new', items: [{ medicine_name_ar: 'بنادول', medicine_id: 'med-panadol', dose: '500mg' }], order_id: null, upload_image: null, diagnosis: null };
    svc.conn.db.collection.mockReturnValue({
      find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), toArray: jest.fn().mockResolvedValue([rx]) }),
    });
    const rows: any[] = await svc.listPrescriptions({ id: 'pat-1' });
    expect(rows[0].items[0].medicine_id).toBe('med-panadol');
  });

  it('report list keeps the slim shape the app and web read, without bodies or attachment contents', async () => {
    const svc: any = serviceFor();
    const find = jest.fn().mockReturnValue({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), toArray: jest.fn().mockResolvedValue([
      { id: 'rep-1', title_en: 'CBC', issued_at: new Date('2026-10-01'), doctor_name: 'Dr A', report_type: 'lab', attachments: [{ name: 'a.pdf' }] },
    ]) });
    svc.conn.db.collection.mockReturnValue({ find });
    const rows: any[] = await svc.listReports({ id: 'pat-1' });
    expect(rows).toEqual([{ id: 'rep-1', date: '2026-10-01', title: 'CBC', doctor: 'Dr A', facility: null, type: 'lab', critical: false, has_attachments: true }]);
    expect(find.mock.calls[0][1]).toEqual({ projection: { body: 0, 'attachments.base64': 0 } });
  });
});
