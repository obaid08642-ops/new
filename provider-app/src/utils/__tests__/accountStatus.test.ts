import { mapAccountStatus, reasonFromProgress } from '../accountStatus';

describe('mapAccountStatus (A1, A2): only an approved account reaches the dashboard', () => {
  it.each([
    ['pending_admin_approval', 'pending'],
    ['under_review', 'pending'],
    ['pending', 'pending'],
    ['submitted', 'pending'],
    ['onboarding', 'pending'],
    ['email_unverified', 'pending'],
    ['email_verified', 'pending'],
    ['needs_changes', 'needs_changes'],
    ['rejected', 'rejected'],
    ['suspended', 'suspended'],
    ['approved', 'logged_in'],
    ['active', 'logged_in'],
  ])('%s -> %s', (status, expected) => {
    expect(mapAccountStatus(status)).toBe(expected);
  });

  it('is case-insensitive and tolerant of a missing status', () => {
    expect(mapAccountStatus('PENDING_ADMIN_APPROVAL')).toBe('pending');
    expect(mapAccountStatus(undefined)).toBe('logged_in');
  });
});

describe('reasonFromProgress', () => {
  it('reads the reviewer reason from whichever field the server used', () => {
    expect(reasonFromProgress({ rejected_reason: ' license expired ' })).toBe('license expired');
    expect(reasonFromProgress({ admin_note: 'upload a clearer scan' })).toBe('upload a clearer scan');
  });
  it('returns an empty string when nothing was recorded', () => {
    expect(reasonFromProgress(null)).toBe('');
    expect(reasonFromProgress({ started: true })).toBe('');
  });
});
