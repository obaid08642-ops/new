import { resetStoreAction } from '../actions/recovery';

describe('Global Recovery', () => {
  it('should have correct action type for RESET_ALL', () => {
    const action = resetStoreAction();
    expect(action.type).toBe('STORE/RESET_ALL');
  });
});
