import { DatabaseManager } from '../database/core/DatabaseManager';
import { SyncManager } from '../sync/SyncManager';
import { RepositoryFactory } from './RepositoryFactory';
import { SQLiteDataSource } from './sources/SQLiteDataSource';
import { RemoteDataSource } from './sources/RemoteDataSource';
import { IBaseEntity } from './interfaces/IRepository';

/**
 * Coordinator to initialize the entire Data Layer Architecture.
 * It ties together the Database, SyncEngine, and Repository Registry.
 */
export class RepositoryCoordinator {
  private static isInitialized = false;

  /**
   * Initializes the database, runs migrations, starts the sync engine, 
   * and sets up base repositories.
   */
  public static async initialize(dbName: string = 'nabdah_plus.db'): Promise<void> {
    if (this.isInitialized) return;

    console.log('[RepositoryCoordinator] Initializing Data Layer...');

    // 1. Initialize DB & Run Migrations
    const dbManager = await DatabaseManager.getInstance(dbName);

    // 2. Initialize Sync Engine
    SyncManager.initialize(dbManager);
    
    // 3. Register Core System Repositories (Example)
    this.registerCoreRepositories(dbManager);

    this.isInitialized = true;
    console.log('[RepositoryCoordinator] Data Layer Initialized Successfully.');
  }

  /**
   * Helper to quickly register a new offline-first repository for a specific feature.
   * Future modules (Pharmacy, Consultations) will call this.
   */
  public static registerFeatureRepository<T extends IBaseEntity>(
    tableName: string, 
    endpoint: string, 
    dbManager: DatabaseManager
  ): void {
    const local = new SQLiteDataSource<T>(tableName, dbManager);
    const remote = new RemoteDataSource<T>(endpoint);
    
    RepositoryFactory.createRepository<T>(tableName, local, remote);
    console.log(`[RepositoryCoordinator] Registered Repository for ${tableName}`);
  }

  private static registerCoreRepositories(dbManager: DatabaseManager): void {
    // Example: Registering the users repository globally
    this.registerFeatureRepository('users', '/api/v1/users', dbManager);
    
    // Future system tables can be registered here.
  }
}
