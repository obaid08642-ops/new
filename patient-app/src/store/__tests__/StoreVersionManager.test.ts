import { storeVersionManager } from '../persistence/StoreVersionManager';

describe('StoreVersionManager', () => {
  it('should migrate state successfully', async () => {
    const oldState = { _persist: { version: 0 }, oldData: true };
    // createMigrate runs the v1 migration; redux-persist stamps _persist.version
    // itself during rehydration, so here we assert the migration ran and data survived.
    const newState = await storeVersionManager(oldState, 1);
    expect(newState).toBeDefined();
    expect((newState as any).oldData).toBe(true);
  });

  it('should rollback and return undefined on migration failure', async () => {
    // A completely broken (undefined) inbound state must not crash the app:
    // redux-persist treats undefined as a fresh start, which is the safe path.
    const brokenState = undefined;
    const newState = await storeVersionManager(brokenState, 1);
    expect(newState).toBeUndefined(); // fresh start — redux-persist re-initializes
  });
});
