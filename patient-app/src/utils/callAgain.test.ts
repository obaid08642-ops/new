import { callAgainParams } from './callAgain';

describe('callAgainParams', () => {
  it('passes the appointment of the call record, never the call session id', () => {
    expect(callAgainParams({ appointment_id: 'apt-1' })).toEqual({ appointmentId: 'apt-1' });
  });

  it('gives no params (so no button) when the record has no appointment', () => {
    expect(callAgainParams({})).toBeNull();
    expect(callAgainParams({ appointment_id: '  ' })).toBeNull();
    expect(callAgainParams({ appointment_id: 42 })).toBeNull();
  });
});
