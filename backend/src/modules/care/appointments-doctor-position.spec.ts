import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

// 2-app#3: the doctor's position on a home visit: only the visit's doctor, only while en route; the patient sees it
// only in that state.
function serviceWith(appt: any, owner: boolean) {
  const svc: any = Object.create(AppointmentsService.prototype);
  const updates: any[] = [];
  svc.apptModel = {
    findOne: async () => appt,
    updateOne: async (q: any, u: any) => { updates.push({ q, u }); },
  };
  svc.isDoctorOwner = async () => owner;
  return { svc: svc as AppointmentsService, updates };
}

describe('doctor position on a home visit', () => {
  const enRoute = { id: 'a1', service_type: 'home', status: 'EN_ROUTE' };

  it('stores the position from the visit doctor while en route', async () => {
    const { svc, updates } = serviceWith(enRoute, true);
    await expect(svc.updatePosition('a1', { id: 'd1', role: 'doctor' }, 24.71, 46.67)).resolves.toMatchObject({ ok: true });
    expect(updates[0].u.$set.doctor_position).toMatchObject({ lat: 24.71, lng: 46.67 });
  });

  it('refuses another doctor, a visit not en route, a clinic visit and a bad point', async () => {
    await expect(serviceWith(enRoute, false).svc.updatePosition('a1', { id: 'x', role: 'doctor' }, 1, 1)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(serviceWith({ ...enRoute, status: 'CONFIRMED' }, true).svc.updatePosition('a1', { id: 'd1', role: 'doctor' }, 1, 1)).rejects.toBeInstanceOf(BadRequestException);
    await expect(serviceWith({ ...enRoute, service_type: 'clinic' }, true).svc.updatePosition('a1', { id: 'd1', role: 'doctor' }, 1, 1)).rejects.toBeInstanceOf(BadRequestException);
    await expect(serviceWith(enRoute, true).svc.updatePosition('a1', { id: 'd1', role: 'doctor' }, 91, 1)).rejects.toBeInstanceOf(BadRequestException);
  });
});
