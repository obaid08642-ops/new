// CodeQL js/sql-injection (step-up.guard.ts): the passkey lookup used the raw
// body value as the credential_id filter; an object such as {$ne: null} would
// select any credential of the user (express-mongo-sanitize also strips $-keys,
// this keeps the lookup safe on its own).
import { StepUpService } from './step-up.guard';

describe('step-up passkey lookup uses typed equality', () => {
  it('casts the credential id to a string', async () => {
    const findOne = jest.fn(() => ({ lean: async () => null }));
    const svc = Object.create(StepUpService.prototype) as { passkeyModel: unknown; issueFromAssertion(u: string, a: string, r: unknown): Promise<string> };
    svc.passkeyModel = { findOne };
    await expect(svc.issueFromAssertion('admin-1', 'refund', { id: { $ne: null } })).rejects.toThrow('unknown_credential');
    expect(findOne).toHaveBeenCalledWith({ user_id: { $eq: 'admin-1' }, credential_id: { $eq: '[object Object]' } });
  });
});
