import mongoose from 'mongoose';
import { AmbulanceFleetService } from './ambulance-fleet.controller';
import { AmbulanceVehicleSchema } from '../../schemas/ambulance-vehicle.schema';

// Going on/off shift must not send an approved vehicle back to admin review (live SOS journey finding);
// changing what the admin reviewed still must.
describe('AmbulanceFleetService.update review reset', () => {
  const Vehicle = mongoose.model('AmbulanceVehicleReviewSpec', AmbulanceVehicleSchema);
  const make = () => {
    const doc: any = Vehicle.hydrate({ id: 'v1', provider_account_id: 'p1', plate_number: 'ABC 1', model: 'Hiace', status: 'approved', is_available: true });
    doc.save = jest.fn().mockResolvedValue(doc);
    const model: any = { findOne: jest.fn().mockReturnValueOnce(doc).mockReturnValue({ lean: () => doc }) };
    return { doc, svc: new AmbulanceFleetService(model) };
  };

  it('availability and GPS updates keep the approval', async () => {
    const { doc, svc } = make();
    await svc.update('p1', 'v1', { is_available: false, last_location: { lat: 24.7, lng: 46.6 } });
    expect(doc.status).toBe('approved');
    expect(doc.is_available).toBe(false);
  });

  it('a reviewed field change goes back to review', async () => {
    const { doc, svc } = make();
    await svc.update('p1', 'v1', { model: 'Sprinter' });
    expect(doc.status).toBe('pending');
  });
});
