import { AppointmentSchema, APPOINTMENT_HALALA_FIELDS } from './appointment.schema';
import { LabBookingSchema, LAB_BOOKING_HALALA_FIELDS } from './lab.schema';
import { RadiologyBookingSchema, RADIOLOGY_BOOKING_HALALA_FIELDS } from './radiology.schema';
import { HomeCareBookingSchema, HOME_CARE_BOOKING_HALALA_FIELDS } from './home-care.schema';
import { TARGETS } from '../modules/finance-integrity/halala-backfill';

const CASES: Array<[string, any, string[], string]> = [
  ['appointments', AppointmentSchema, APPOINTMENT_HALALA_FIELDS, 'appointments'],
  ['lab bookings', LabBookingSchema, LAB_BOOKING_HALALA_FIELDS, 'labbookings'],
  ['radiology bookings', RadiologyBookingSchema, RADIOLOGY_BOOKING_HALALA_FIELDS, 'radiologybookings'],
  ['home care bookings', HomeCareBookingSchema, HOME_CARE_BOOKING_HALALA_FIELDS, 'homecarebookings'],
];

describe.each(CASES)('%s: R11 P1 integer shadows', (_name, schema, fields, collection) => {
  it('every named money field exists and has a Number `<field>_halalas` shadow', () => {
    for (const f of fields) {
      expect([f, schema.path(f)?.instance]).toEqual([f, 'Number']);
      expect([`${f}_halalas`, schema.path(`${f}_halalas`)?.instance]).toEqual([`${f}_halalas`, 'Number']);
    }
  });

  it('the shadows are optional with no default (history is filled by the backfill, never invented)', () => {
    for (const f of fields) {
      const path: any = schema.path(`${f}_halalas`);
      expect(path.isRequired).toBeFalsy();
      expect(path.options.default).toBeUndefined();
    }
  });

  it('the plugin is installed: save and the update calls go through the shadow hooks', () => {
    const hooks = (schema as any).s.hooks;
    expect(hooks.hasHooks('save')).toBe(true);
    for (const op of ['updateOne', 'updateMany', 'findOneAndUpdate']) expect([op, hooks.hasHooks(op)]).toEqual([op, true]);
  });

  it('the backfill covers the collection with exactly the same fields', () => {
    const t = TARGETS.find((x) => x.collection === collection);
    expect(t).toBeDefined();
    expect(t!.fields).toEqual(fields);
  });
});

describe('bookings: what is deliberately not shadowed', () => {
  it('a percentage is not money: refund_percentage has no shadow; nested objects (price_lock, emergency_escalation) are left alone', () => {
    expect(AppointmentSchema.path('refund_percentage_halalas')).toBeUndefined();
    expect(LabBookingSchema.path('price_lock_halalas')).toBeUndefined();
    expect(HomeCareBookingSchema.path('emergency_escalation_halalas')).toBeUndefined();
  });
});
