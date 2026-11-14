import { BadRequestException } from '@nestjs/common';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';

// GET /prescriptions/doctor/mine?patient_id=&appointment_id= : the doctor's own prescriptions, optionally narrowed.
describe('doctor prescriptions list filters', () => {
  const svcWith = () => {
    const seen: { filter?: Record<string, unknown> } = {};
    const model: any = {
      find: (filter: Record<string, unknown>) => {
        seen.filter = filter;
        return { sort: () => ({ limit: () => Promise.resolve([]) }) };
      },
    };
    const svc = new (PrescriptionsService as any)(model, {}, { emit: () => undefined }, {}, {}) as PrescriptionsService;
    return { svc, seen };
  };

  it('always scopes the query to the calling doctor, and adds the patient and the appointment when given', async () => {
    const { svc, seen } = svcWith();
    await svc.listForDoctor('doc-1');
    expect(seen.filter).toEqual({ doctor_id: 'doc-1' });
    await svc.listForDoctor('doc-1', { patient_id: 'pat-1' });
    expect(seen.filter).toEqual({ doctor_id: 'doc-1', patient_id: 'pat-1' });
    await svc.listForDoctor('doc-1', { appointment_id: 'appt-1' });
    expect(seen.filter).toEqual({ doctor_id: 'doc-1', appointment_id: 'appt-1' });
    await svc.listForDoctor('doc-1', { patient_id: 'pat-1', appointment_id: 'appt-1' });
    expect(seen.filter).toEqual({ doctor_id: 'doc-1', patient_id: 'pat-1', appointment_id: 'appt-1' });
  });

  it('a filter cannot widen the query to another doctor (the doctor id is the caller\'s, never a parameter)', async () => {
    const { svc, seen } = svcWith();
    await svc.listForDoctor('doc-1', { patient_id: 'pat-1', doctor_id: 'doc-2' } as never);
    expect(seen.filter).toEqual({ doctor_id: 'doc-1', patient_id: 'pat-1' });
  });

  describe('the route', () => {
    const route = () => {
      const calls: unknown[][] = [];
      const controller = new PrescriptionsController({ listForDoctor: (...args: unknown[]) => { calls.push(args); return []; } } as never);
      return { controller, calls };
    };

    it('passes plain id strings through, and nothing when the parameter is absent or empty', () => {
      const { controller, calls } = route();
      controller.doctorMine('doc-1', 'pat-1', 'appt-1');
      controller.doctorMine('doc-1', undefined, '');
      expect(calls[0]).toEqual(['doc-1', { patient_id: 'pat-1', appointment_id: 'appt-1' }]);
      expect(calls[1]).toEqual(['doc-1', { patient_id: undefined, appointment_id: undefined }]);
    });

    it('refuses an operator object, a repeated parameter and an oversized value (400 invalid_filter)', () => {
      const { controller, calls } = route();
      for (const bad of [{ $ne: 'x' }, ['a', 'b'], 'x'.repeat(129)]) {
        expect(() => controller.doctorMine('doc-1', bad)).toThrow(BadRequestException);
        expect(() => controller.doctorMine('doc-1', undefined, bad)).toThrow(BadRequestException);
      }
      expect(calls).toHaveLength(0);
    });
  });
});
