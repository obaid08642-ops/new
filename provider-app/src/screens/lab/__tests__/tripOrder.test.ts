import { toLabOrderView } from '../LabDashboard';
import { isTripOrder } from '../LabDashboard';

const order = (over: any) => toLabOrderView({ id: 'l1', state: 'CONFIRMED', location_type: 'home', technician_id: 't1', ...over });

describe('home collection: when the phlebotomist can start the trip', () => {
  it('a home booking with a phlebotomist assigned is a trip order in CONFIRMED (assigning does not change the state) and IN_TRANSIT', () => {
    expect(isTripOrder(order({}))).toBe(true);
    expect(isTripOrder(order({ state: 'IN_TRANSIT' }))).toBe(true);
  });
  it('not before a phlebotomist is assigned, not for a facility visit, not once the sample is taken or the booking is closed', () => {
    expect(isTripOrder(order({ technician_id: undefined }))).toBe(false);
    expect(isTripOrder(order({ location_type: 'facility' }))).toBe(false);
    for (const state of ['NEW_REQUEST', 'SAMPLE_COLLECTED', 'IN_LAB', 'CANCELLED', 'REPORTED']) expect(isTripOrder(order({ state }))).toBe(false);
  });
});
