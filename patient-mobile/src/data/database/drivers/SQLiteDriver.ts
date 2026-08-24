import * as SQLite from 'expo-sqlite';
import { IDatabaseDriver, IDatabaseResult, IDatabaseTransaction } from './IDatabaseDriver';

export class SQLiteDriver implements IDatabaseDriver {
  private db: SQLite.SQLiteDatabase | null = null;
  private dbName: string | null = null;

  /**
   * Detects an unrecoverable SQLite corruption error:
   *  - code 11  (SQLITE_CORRUPT / "database disk image is malformed")
   *  - code 26  (SQLITE_NOTADB  / "file is not a database")
   * These were seen on real devices when a previous install wrote a
   * partially-migrated DB; the only safe recovery is to delete and recreate.
   */
  private isCorruptionError(error: any): boolean {
    const msg = String(error?.message ?? error ?? '');
    const code = error?.code;
    return (
      code === 11 ||
      code === 26 ||
      /disk image is malformed|not a database|SQLitePrepareError|database is corrupt/i.test(msg)
    );
  }

  /** Closes, deletes and re-opens the local database file (self-healing). */
  private async healDatabase(): Promise<void> {
    if (!this.dbName) return;
    try {
      await this.db?.closeAsync();
    } catch {
      // ignore close failures on a corrupt handle
    }
    this.db = null;
    try {
      await SQLite.deleteDatabaseAsync(this.dbName);
      console.warn(`[SQLiteDriver] Corrupt database "${this.dbName}" deleted; recreating.`);
    } catch (e) {
      console.warn(`[SQLiteDriver] Failed to delete corrupt database "${this.dbName}"`, e);
    }
    this.db = await SQLite.openDatabaseAsync(this.dbName);
  }

  async init(dbName: string): Promise<void> {
    this.dbName = dbName;
    // Uses the modern Async API introduced in Expo SDK 50
    try {
      this.db = await SQLite.openDatabaseAsync(dbName);
      // Force SQLite to actually read the file so corruption surfaces here,
      // not later in a random query.
      await this.db.execAsync('PRAGMA quick_check;');
    } catch (error) {
      if (this.isCorruptionError(error)) {
        await this.healDatabase();
      } else {
        throw error;
      }
    }
  }

  async executeSql(sqlStatement: string, args: any[] = []): Promise<IDatabaseResult> {
    if (!this.db) throw new Error('Database not initialized');

    // In expo-sqlite next, we use runAsync for mutations, getAllAsync for queries
    const isMutation = sqlStatement.trim().toUpperCase().startsWith('SELECT') === false;

    try {
      return await this.runStatement(sqlStatement, args, isMutation);
    } catch (error) {
      if (this.isCorruptionError(error)) {
        console.warn('[SQLiteDriver] Corruption detected during query; self-healing…');
        await this.healDatabase();
        return this.runStatement(sqlStatement, args, isMutation);
      }
      console.error(`[SQLiteDriver] Error executing query: ${sqlStatement}`, error);
      throw error;
    }
  }

  private async runStatement(
    sqlStatement: string,
    args: any[],
    isMutation: boolean,
  ): Promise<IDatabaseResult> {
    if (!this.db) throw new Error('Database not initialized');
    if (isMutation) {
      const result = await this.db.runAsync(sqlStatement, args);
      return {
        insertId: result.lastInsertRowId,
        rowsAffected: result.changes,
        rows: [],
      };
    }
    const rows = await this.db.getAllAsync(sqlStatement, args);
    return { rowsAffected: 0, rows };
  }

  async executeBatch(sqlStatements: string[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // expo-sqlite provides execAsync for raw batch execution (no parameterized queries)
    const script = sqlStatements.join(';\n') + ';';
    try {
      await this.db.execAsync(script);
    } catch (error) {
      if (this.isCorruptionError(error)) {
        await this.healDatabase();
        await this.db!.execAsync(script);
        return;
      }
      throw error;
    }
  }

  async transaction<T>(callback: (tx: IDatabaseTransaction) => Promise<T>): Promise<T> {
    if (!this.db) throw new Error('Database not initialized');

    let result: T | undefined;

    // Using withTransactionAsync to wrap operations safely
    await this.db.withTransactionAsync(async () => {
      // The transaction object provided to the callback just proxies to our own executeSql
      // because inside withTransactionAsync, all calls to db.runAsync are part of the transaction.
      const txProxy: IDatabaseTransaction = {
        executeSql: async (sql, args) => this.executeSql(sql, args)
      };
      result = await callback(txProxy);
    });

    return result as T;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
}
