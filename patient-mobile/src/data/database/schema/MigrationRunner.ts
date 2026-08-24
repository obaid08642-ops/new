import { IDatabaseDriver } from '../drivers/IDatabaseDriver';
import { TransactionManager } from '../core/TransactionManager';
import { ALL_SCHEMAS } from './tables';

/**
 * Manages database migrations, ensuring atomic upgrades and rollbacks.
 * Keeps track of applied migrations in the `migration_history` table.
 */
export class MigrationRunner {
  private driver: IDatabaseDriver;
  private transactionManager: TransactionManager;

  constructor(driver: IDatabaseDriver, transactionManager: TransactionManager) {
    this.driver = driver;
    this.transactionManager = transactionManager;
  }

  /**
   * Ensure the migration_history table exists.
   */
  private async ensureMigrationHistoryTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS migration_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER UNIQUE NOT NULL,
        description TEXT NOT NULL,
        applied_at INTEGER NOT NULL
      );
    `;
    await this.driver.executeSql(sql);
  }

  /**
   * Retrieves the current highest migration version applied.
   */
  private async getCurrentVersion(): Promise<number> {
    const sql = `SELECT MAX(version) as currentVersion FROM migration_history;`;
    const result = await this.driver.executeSql(sql);
    if (result.rows.length > 0 && result.rows[0].currentVersion !== null) {
      return result.rows[0].currentVersion;
    }
    return 0; // No migrations applied
  }

  /**
   * Run the migrations up to the latest version.
   */
  public async runMigrations(): Promise<void> {
    try {
      await this.ensureMigrationHistoryTable();
      const currentVersion = await this.getCurrentVersion();

      // For Phase 1C-C, Migration 1 is the baseline schema creation
      if (currentVersion < 1) {
        await this.applyMigration(1, 'Baseline Schema Creation', ALL_SCHEMAS);
      }

      // Future migrations (v2, v3) can be added here
      // if (currentVersion < 2) {
      //   await this.applyMigration(2, 'Add something', ['ALTER TABLE ...']);
      // }

    } catch (error) {
      console.error('[MigrationRunner] Critical failure during migration execution', error);
      await this.attemptRecovery();
      throw error;
    }
  }

  /**
   * Applies a specific migration version wrapped in a transaction.
   * If it fails, the transaction is rolled back automatically by TransactionManager.
   */
  private async applyMigration(version: number, description: string, sqlStatements: string[]): Promise<void> {
    console.log(`[MigrationRunner] Applying migration v${version}: ${description}`);

    await this.transactionManager.runInTransaction(async (tx) => {
      for (const sql of sqlStatements) {
        await tx.executeSql(sql);
      }

      const recordSql = `INSERT INTO migration_history (version, description, applied_at) VALUES (?, ?, ?)`;
      await tx.executeSql(recordSql, [version, description, Date.now()]);
    });

    console.log(`[MigrationRunner] Migration v${version} applied successfully.`);
  }

  /**
   * Attempt database recovery if a migration critically corrupts the connection.
   */
  private async attemptRecovery(): Promise<void> {
    console.warn('[MigrationRunner] Entering recovery mode...');
    // In a real recovery scenario, this might involve deleting the DB file
    // or restoring from a remote backup if the SQLite file is totally corrupted.
    // Since Expo SQLite doesn't natively expose vacuum/repair easily without opening,
    // we just log for now until Milestone 6 (Security & Recovery) handles physical files.
  }
}
