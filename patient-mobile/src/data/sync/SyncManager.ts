import { SyncWorker } from './SyncWorker';
import { DatabaseManager } from '../database/core/DatabaseManager';
import { QueueProcessor } from './QueueProcessor';
import { EventBus } from '../../services/EventBus';

export type SyncPolicy = 'Automatic' | 'Manual' | 'Background' | 'Immediate' | 'Scheduled';

/**
 * High-level manager orchestrating Offline-First Synchronization.
 */
export class SyncManager {
  private static instance: SyncManager;
  
  public queueProcessor: QueueProcessor;
  public worker: SyncWorker;
  private currentPolicy: SyncPolicy = 'Automatic';

  private constructor(dbManager: DatabaseManager) {
    this.queueProcessor = new QueueProcessor(dbManager);
    this.worker = new SyncWorker(this.queueProcessor);
    
    // Subscribe to Domain Events to trigger sync automatically
    EventBus.subscribe('entity.created', (event) => this.handleLocalMutation('CREATE', event.entityType, event.payload));
    EventBus.subscribe('entity.updated', (event) => this.handleLocalMutation('UPDATE', event.entityType, event.payload));
    EventBus.subscribe('entity.deleted', (event) => this.handleLocalMutation('DELETE', event.entityType, { id: event.id, soft: event.soft }));
  }

  public static initialize(dbManager: DatabaseManager): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager(dbManager);
    }
    return SyncManager.instance;
  }

  public static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      throw new Error('SyncManager not initialized. Call initialize(dbManager) first.');
    }
    return SyncManager.instance;
  }

  /**
   * Sets the active sync policy.
   */
  public setSyncPolicy(policy: SyncPolicy): void {
    this.currentPolicy = policy;
  }

  /**
   * Called by EventBus when a local mutation happens.
   * Based on the policy, it either starts processing immediately or waits.
   */
  public async handleLocalMutation(operation: string, entityType: string, payload: any): Promise<void> {
    await this.queueProcessor.enqueue(operation, entityType, payload);
    
    if (this.currentPolicy === 'Immediate' || this.currentPolicy === 'Automatic') {
      this.triggerSync();
    }
  }

  /**
   * Triggers a sync run manually or automatically.
   */
  public triggerSync(): void {
    // Fire and forget
    this.worker.startProcessing().catch(e => {
      console.error('[SyncManager] Background sync failed', e);
    });
  }
}
