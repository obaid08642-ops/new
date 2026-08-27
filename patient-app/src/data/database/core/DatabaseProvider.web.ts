import type { IDatabaseDriver, IDatabaseResult, IDatabaseTransaction } from '../drivers/IDatabaseDriver';
import { ConnectionPool } from './ConnectionPool';

/**
 * Web export does not use the native SQLite driver. Web screens read/write
 * through the API; this empty driver exists only so shared startup migrations
 * cannot pull expo-sqlite's WASM worker into the web bundle.
 */
class WebDatabaseDriver implements IDatabaseDriver {
  async init(_dbName: string): Promise<void> {}

  async executeSql(_sqlStatement: string, _args: any[] = []): Promise<IDatabaseResult> {
    return { rowsAffected: 0, rows: [] };
  }

  async executeBatch(_sqlStatements: string[]): Promise<void> {}

  async transaction<T>(callback: (tx: IDatabaseTransaction) => Promise<T>): Promise<T> {
    return callback({
      executeSql: async () => ({ rowsAffected: 0, rows: [] }),
    });
  }

  async close(): Promise<void> {}
}

export class DatabaseProvider {
  static createDriver(driverType: 'sqlite' | 'sqlcipher' = 'sqlite'): IDatabaseDriver {
    if (driverType === 'sqlcipher') {
      throw new Error('SQLCipher driver is not available on web');
    }
    return new WebDatabaseDriver();
  }

  static async getConnection(dbName: string = 'nabdah_plus.db'): Promise<IDatabaseDriver> {
    const pool = ConnectionPool.getInstance();
    return pool.getConnection(dbName, () => this.createDriver('sqlite'));
  }
}
