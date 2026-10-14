import { PatientUxService } from './patient-ux.module';

// OC-C C-19 (765): review aspects are stored as known codes only.
function serviceFor() {
  const service: any = Object.create(PatientUxService.prototype);
  const stored: any[] = [];
  service.reviews = {
    findOneAndUpdate: jest.fn().mockImplementation(async (_q: any, u: any) => { stored.push(u?.$set); return u?.$set; }),
  };
  service.events = { emit: jest.fn() };
  return { service: service as PatientUxService, stored };
}

describe('OC C-19 review aspect codes', () => {
  it('keeps known aspect codes and drops free-form sentences', async () => {
    const { service, stored } = serviceFor();
    (service as any).bookingForReview = jest.fn().mockResolvedValue({ patient: 'pat-1', state: 'REPORTED', provider: 'prov-1' });
    (service as any).model = jest.fn();
    await service.rate({ id: 'pat-1' }, { booking_kind: 'lab', booking_id: 'b-1', rating: 5, aspects: ['accuracy', 'الدقة ممتازة جدا', 'care'] });
    expect(stored[0]?.aspects).toEqual(['accuracy', 'care']);
  });
});
