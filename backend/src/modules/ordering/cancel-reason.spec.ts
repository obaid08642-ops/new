import { cancelReasonOf } from './cancel-reason';

describe('cancelReasonOf', () => {
  const hist = (by_role: string, note?: string) => [{ from: 'NEW_REQUEST', to: 'CONFIRMED', by_role: 'lab', at: new Date() }, { from: 'CONFIRMED', to: 'CANCELLED', by_role, note, at: new Date() }];

  it('null for a booking that is not cancelled', () => {
    expect(cancelReasonOf({ state: 'CONFIRMED', status: 'pending', state_history: hist('patient') })).toBeNull();
    expect(cancelReasonOf({})).toBeNull();
  });

  it('the provider did not confirm in time: by status or by the system note', () => {
    expect(cancelReasonOf({ state: 'CANCELLED', status: 'cancelled_unconfirmed' })).toBe('provider_did_not_confirm');
    expect(cancelReasonOf({ state: 'CANCELLED', state_history: hist('system', 'confirm_deadline_passed') })).toBe('provider_did_not_confirm');
  });

  it('who cancelled: the patient, the provider (any provider role), an admin, the system', () => {
    expect(cancelReasonOf({ state: 'CANCELLED', state_history: hist('patient') })).toBe('patient_cancelled');
    expect(cancelReasonOf({ state: 'CANCELLED', state_history: hist('lab') })).toBe('provider_cancelled');
    expect(cancelReasonOf({ state: 'CANCELLED', state_history: hist('radiology') })).toBe('provider_cancelled');
    expect(cancelReasonOf({ state: 'CANCELLED', state_history: hist('admin') })).toBe('admin_cancelled');
    expect(cancelReasonOf({ state: 'CANCELLED', state_history: hist('system') })).toBe('system_cancelled');
  });

  it('uses the LAST move to cancelled and ignores entries that are not a cancel', () => {
    const history = [...hist('patient'), { from: 'CANCELLED', to: 'REFUNDED', by_role: 'system' }];
    expect(cancelReasonOf({ state: 'CANCELLED', state_history: history })).toBe('patient_cancelled');
  });

  it('null when it is cancelled but the history says nothing (never a guess)', () => {
    expect(cancelReasonOf({ state: 'CANCELLED', state_history: [] })).toBeNull();
    expect(cancelReasonOf({ state: 'CANCELLED', state_history: [{ to: 'CANCELLED' }] })).toBeNull();
    expect(cancelReasonOf({ state: 'CANCELLED', state_history: 'x' as never })).toBeNull();
  });
});
