import { BadRequestException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

describe('booking an appointment with an expired SCFHS licence', () => {
  it('is refused before anything is held, even if the daily monitor has not suspended the doctor yet', async () => {
    const svc: any = Object.create(AppointmentsService.prototype);
    svc.providerModel = { findOne: async () => ({ id: 'd1', consultation_modes: ['clinic'], license_expiry_date: new Date(Date.now() - 3600_000) }) };
    svc.killSwitches = undefined;
    await expect(svc.create({ id: 'pat1', role: 'patient' }, { doctor_id: 'd1', service_type: 'clinic', slot_start: new Date(Date.now() + 86400_000).toISOString() })).rejects.toThrow(new BadRequestException('doctor_license_expired'));
  });
});
