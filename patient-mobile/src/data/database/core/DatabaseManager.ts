import { IDatabaseDriver } from '../drivers/IDatabaseDriver';
import { DatabaseProvider } from './DatabaseProvider';
import { TransactionManager } from './TransactionManager';
import { DatabaseHealthChecker } from './DatabaseHealthChecker';
import { MigrationRunner } from '../schema/MigrationRunner';
import { indexCreationQueries } from '../schema/indexes';

/**
 * Main orchestration class for database operations.
 * Exposes driver, transaction manager, and health checker.
 * Repositories will interact with this manager, not the raw driver.
 */
export class DatabaseManager {
  private static instance: DatabaseManager | null = null;

  public driver: IDatabaseDriver;
  public transactionManager: TransactionManager;
  public healthChecker: DatabaseHealthChecker;

  private constructor(driver: IDatabaseDriver) {
    this.driver = driver;
    this.transactionManager = new TransactionManager(driver);
    this.healthChecker = new DatabaseHealthChecker(driver);
  }

  /**
   * Initializes and returns the singleton DatabaseManager instance.
   */
  public static async getInstance(dbName: string = 'nabdah_plus.db'): Promise<DatabaseManager> {
    if (!DatabaseManager.instance) {
      const driver = await DatabaseProvider.getConnection(dbName);
      const manager = new DatabaseManager(driver);

      // Run migrations on startup
      const migrationRunner = new MigrationRunner(manager.driver, manager.transactionManager);
      await migrationRunner.runMigrations();

      // Create indexes for performance
      for (const query of indexCreationQueries) {
        await manager.driver.executeSql(query);
      }

      DatabaseManager.instance = manager;
    }
    return DatabaseManager.instance;
  }

  /**
   * Rebuilds the database file, repacking it into a minimal amount of disk space.
   * Useful to run occasionally for performance.
   */
  public async vacuum(): Promise<void> {
    console.log('[DatabaseManager] Running VACUUM...');
    await this.driver.executeSql('VACUUM;');
  }

  /**
   * Close the connection
   */
}
