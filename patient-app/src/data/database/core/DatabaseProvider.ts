import { IDatabaseDriver } from '../drivers/IDatabaseDriver';
import { SQLiteDriver } from '../drivers/SQLiteDriver';
import { ConnectionPool } from './ConnectionPool';

/**
 * Dependency Injection Provider for Database Drivers.
 * Determines which driver to instantiate (e.g., standard SQLite vs SQLCipher) based on config.
 */
export class DatabaseProvider {
  /**
   * Factory method to create the appropriate database driver.
   * Currently defaults to SQLiteDriver.
   */
  static createDriver(driverType: 'sqlite' | 'sqlcipher' = 'sqlite'): IDatabaseDriver {
    switch (driverType) {
      case 'sqlite':
        return new SQLiteDriver();
      case 'sqlcipher':
        // Future implementation placeholder
        throw new Error('SQLCipher driver not yet implemented');
      default:
        throw new Error(`Unsupported database driver type: ${driverType}`);
    }
  }

  /**
   * Gets a managed connection from the ConnectionPool.
   */
  static async getConnection(dbName: string = 'nabdah_plus.db'): Promise<IDatabaseDriver> {
    const pool = ConnectionPool.getInstance();
    return await pool.getConnection(dbName, () => this.createDriver('sqlite'));
  }
}
