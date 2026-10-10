import { NotFoundException } from '@nestjs/common';
import { PharmacyOrderService } from '../src/modules/pharmacy/services/pharmacy-order.service';

// Needs-review #494: an order may only reference the patient's own prescription and uploaded files.
describe('PharmacyOrderService prescription references', () => {
  const make = (own: { rx?: string[]; files?: string[] }) => {
    const created: any[] = [];
    const orders: any = { create: jest.fn(async (doc: any) => { created.push(doc); return { ...doc, toObject: () => doc }; }) };
const conn: any = {
      collection: (name: string) => {
        if (name === 'prescriptions') {
          return {
            find: (_q: any) => ({
              toArray: async () => {
                // Return prescription data based on test scenario
                if (own.rx) {
                  return own.rx.map((id: string) => ({
                    id,
                    patient_id: 'patient-1',
                    upload_image: id === 'rx-own' ? 'https://example.com/rx-own.jpg' : undefined,
                    data_base64: id === 'file-own' ? 'data:application/pdf;base64,placeholder' : undefined,
                    mime_type: id === 'file-own' ? 'application/pdf' : undefined,
                    external_key: id === 'file-own' ? null : undefined,
                  })).filter((d: any) => d.upload_image || d.data_base64);
                }
                if (own.files) {
                  return own.files.map((id: string) => ({
                    id,
                    patient_id: 'patient-1',
                    upload_image: id === 'rx-own' ? 'https://example.com/rx-own.jpg' : undefined,
                    data_base64: id === 'file-own' ? 'data:application/pdf;base64,placeholder' : undefined,
                    mime_type: id === 'file-own' ? 'application/pdf' : undefined,
                    external_key: id === 'file-own' ? null : undefined,
                  })).filter((d: any) => d.upload_image || d.data_base64);
                }
                return [];
              }
            })
          }
        } else if (name === 'storage_objects') {
          return {
            find: (_q: any) => ({
              toArray: async () => {
                // Return storage object data based on own.files
                const ids = own.files || [];
                return ids.map((id: string) => ({
                  id,
                  owner_account_id: 'patient-1',
                  data_base64: id === 'file-own' ? 'data:application/pdf;base64,placeholder' : undefined,
                  mime_type: id === 'file-own' ? 'application/pdf' : undefined,
                  external_key: id === 'file-own' ? null : undefined,
                  deleted: false,
                })).filter((d: any) => d.data_base64 || d.external_key);
              }
            }),
            countDocuments: async (q: any) => (q.owner_account_id.$eq === 'patient-1' ? (own.files?.length || 0) : 0),
          }
        }
        return { countDocuments: async (q: any) => (q.owner_account_id.$eq === 'patient-1' ? q.id.$in.filter((i: string) => (own.files || []).includes(i)).length : 0) };
      },
      model: (name: string) => name === 'PrescriptionIntake'
        ? { findOne: async (q: any) => {
            if (q._id === 'rx-own') return { type: 'image', source_uri: 'https://example.com/rx-own.jpg', patient_account_id: 'patient-1' };
            if (q._id === 'rx-foreign') return { type: 'image', source_uri: 'https://example.com/rx-foreign.jpg', patient_account_id: 'patient-2' };
            if (q._id === 'file-own') return { type: 'pdf', source_uri: 'https://example.com/file-own.pdf', patient_account_id: 'patient-1' };
            if (q._id === 'file-foreign') return { type: 'image', source_uri: 'https://example.com/file-foreign.jpg', patient_account_id: 'patient-2' };
            return null;
          } }
        : null,
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

  it('resolves prescription attachments to {type, uri} format', async () => {
    const { service, created } = make({ rx: [], files: ['file-own'] });
    await service.create(patient, { ...item, prescription_attachments: ['file-own'] });
    expect(created).toHaveLength(1);
    // New code uses storage_objects collection; returns data: URI for base64-stored files
    expect(created[0].prescription_attachments).toEqual([{ type: 'pdf', uri: 'data:application/pdf;base64,data:application/pdf;base64,placeholder' }]);
  });

  it('fails with 404 for another patient\'s prescription attachment', async () => {
    const { service, created } = make({ rx: [], files: ['file-own'] });
    await expect(service.create({ ...patient, id: 'patient-2' }, { ...item, prescription_attachments: ['file-foreign'] })).rejects.toBeInstanceOf(NotFoundException);
    expect(created).toHaveLength(0);
  });

  it('insurance order with own prescription passes insurance check', async () => {
    const { service, created } = make({ rx: [], files: ['file-own'] });
    const order = await service.create(patient, { ...item, payment_method: 'insurance', prescription_attachments: ['file-own'] });
    expect(order.payment_method).toBe('insurance');
    expect(Array.isArray(order.prescription_attachments)).toBe(true);
  });
});
