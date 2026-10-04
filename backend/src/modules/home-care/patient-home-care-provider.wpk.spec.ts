// WP-K: the website books a nurse through POST /home-care/bookings, but the
// alias dropped provider_id (not in BookDto, not passed on), so every booking
// failed with provider_id_required. The patient's chosen nurse must reach
// HomeCareSvc.book, and the nurse page must list the nurse's real services.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { BookDto } from '../compat/compat.dto';
import { PatientHomeCareController } from './patient-home-care.controller';
import { PatientNurseProfileController } from './nurse-profile.controller';

describe('website nurse booking (WP-K)', () => {
  it('BookDto keeps provider_id through whitelist validation', () => {
    const dto = plainToInstance(BookDto, { service_id: 's1', scheduled_at: new Date().toISOString(), provider_id: 'nurse-acc' });
    expect(validateSync(dto, { whitelist: true, forbidNonWhitelisted: true })).toHaveLength(0);
    expect(dto.provider_id).toBe('nurse-acc');
  });

  it('POST /home-care/bookings passes the chosen nurse to the booking service', async () => {
    const book = jest.fn(async (_u: unknown, d: Record<string, unknown>) => ({ id: 'b1', ...d }));
    const controller = new PatientHomeCareController({} as never, { book } as never);
    await controller.book({ id: 'pat-1', role: 'patient' }, { service_id: 's1', scheduled_at: '2030-01-01T09:00:00.000Z', provider_id: 'nurse-acc', payment_method: 'card' } as BookDto);
    expect(book).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ provider_id: 'nurse-acc', service_id: 's1' }));
  });

  it('GET /nursing/nurses/:id lists approved catalog services with names and prices, and invents nothing', async () => {
    const profile = { id: 'prof-1', account_id: 'nurse-acc', type: 'home_care', status: 'active', public_eligibility: true, name_ar: 'ممرضة', nursing_services: [{ key: 'svc-a' }, { key: 'svc-gone' }] };
    const catalog = [{ id: 'svc-a', name_ar: 'حقن', name_en: 'Injection', price: 150, duration: '30', active: true }];
    const find = jest.fn(() => ({ toArray: async () => catalog }));
    const conn = { db: { collection: (name: string) => (name === 'provider_profiles' ? { findOne: async () => profile } : { find }) } };
    const out: any = await new PatientNurseProfileController(conn as never).one(undefined, 'nurse-acc');
    expect(out.data.id).toBe('nurse-acc');
    expect(out.data.services).toEqual([{ id: 'svc-a', name_ar: 'حقن', name_en: 'Injection', name: 'حقن', price: 150, duration: '30' }]);
    expect(out.data.rating).toBeNull();
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ id: { $in: ['svc-a', 'svc-gone'] }, active: true, medical_review_status: 'approved' }));
  });
});
