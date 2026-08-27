import { SyncManager } from './SyncManager';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import Constants from 'expo-constants';

const SYNC_BACKGROUND_TASK = 'SYNC_BACKGROUND_TASK';

/**
 * Responsible for hooking the SyncManager into OS-level background execution capabilities.
 * E.g., Expo BackgroundFetch or TaskManager.
 */
export class BackgroundSynchronizer {
  private syncManager: SyncManager;

  constructor(syncManager: SyncManager) {
    this.syncManager = syncManager;
  }

  /**
   * Registers a background task with the OS to periodically wake up the app and flush the queue.
   */
  async registerBackgroundFetch(): Promise<void> {
    // Background fetch requires a development/production build — not available in Expo Go
    if (Constants.appOwnership === 'expo') {
      console.log('[BackgroundSynchronizer] Skipping background fetch registration in Expo Go');
      return;
    }
    console.log('[BackgroundSynchronizer] Registering OS background fetch task');
    
    // Register the background fetch task
    try {
      await BackgroundFetch.registerTaskAsync(SYNC_BACKGROUND_TASK, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false, // android only
        startOnBoot: true, // android only
      });
      console.log('[BackgroundSynchronizer] Background fetch registered successfully');
    } catch (err) {
      console.error('[BackgroundSynchronizer] Failed to register background fetch', err);
    }
  }

  /**
   * Called by the OS background task handler when the app wakes up.
   */
  async executeBackgroundSync(): Promise<void> {
    console.log('[BackgroundSynchronizer] Waking up for Background Sync');
    await this.syncManager.triggerSync();
  }
}

// Define the task out of the class so it can be registered at top level in app entry
TaskManager.defineTask(SYNC_BACKGROUND_TASK, async () => {
  try {
    const syncManager = SyncManager.getInstance();
    await syncManager.triggerSync();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (err) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
