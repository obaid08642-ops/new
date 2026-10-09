import { NotFoundException } from '@nestjs/common';
import { PharmacyOrderService } from './pharmacy-order.service';

// Needs-review #494: an order may only reference the patient's own prescription and uploaded files.
describe('PharmacyOrderService prescription references', () => {
  const make = (own: { rx?: string[]; files?: string[] }) => {
    const created: any[] = [];
    const orders: any = { create: jest.fn(async (doc: any) => { created.push(doc); return { ...doc, toObject: () => doc }; }) };
    const conn: any = {
      collection: (name: string) => name === 'prescriptions'
        ? { find: (q: any) => ({ toArray: async () => (q.patient_id.$eq === 'patient-1' ? q.id.$in.filter((i: string) => (own.rx || []).includes(i)).map((id: string) => ({ id })) : []) }) }
        : { countDocuments: async (q: any) => (q.owner_account_id.$eq === 'patient-1' ? q.id.$in.filter((i: string) => (own.files || []).includes(i)).length : 0) },
    };
    const service = new PharmacyOrderService(orders, {} as any, {} as any, {} as any, {} as any, { emit: jest.fn() } as any, { announceCreated: jest.fn().mockResolvedValue(undefined) } as any, conn);
    return { service, created };
  };
  const patient = { id: 'patient-1', role: 'patient' };
  const item = { items: [{ raw_name: 'Amoxicillin', qty: 1 }] };

  it('refuses another patient\'s prescription id', async () => {
    const { service, created } = make({ rx: [] });
    await expect(service.create(patient, { ...item, prescription_id: 'rx-foreign' })).rejects.toBeInstanceOf(NotFoundException);
    expect(created).toHaveLength(0);
  });

  it('refuses an attachment the patient did not upload', async () => {
    const { service, created } = make({ rx: ['rx-own'], files: [] });
    await expect(service.create(patient, { ...item, prescription_id: 'rx-own', prescription_attachments: ['rx-own', 'file-foreign'] })).rejects.toBeInstanceOf(NotFoundException);
    expect(created).toHaveLength(0);
  });

  it('accepts the patient\'s own prescription and uploaded file', async () => {
    const { service, created } = make({ rx: ['rx-own'], files: ['file-own'] });
    await service.create(patient, { ...item, prescription_id: 'rx-own', prescription_attachments: ['rx-own', 'file-own'] });
    expect(created).toHaveLength(1);
    expect(created[0].prescription_id).toBe('rx-own');
  });
});
