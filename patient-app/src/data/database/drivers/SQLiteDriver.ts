import * as SQLite from 'expo-sqlite';
import { IDatabaseDriver, IDatabaseResult, IDatabaseTransaction } from './IDatabaseDriver';

export class SQLiteDriver implements IDatabaseDriver {
  private db: SQLite.SQLiteDatabase | null = null;

  async init(dbName: string): Promise<void> {
    // Uses the modern Async API introduced in Expo SDK 50
    this.db = await SQLite.openDatabaseAsync(dbName);
  }

  async executeSql(sqlStatement: string, args: any[] = []): Promise<IDatabaseResult> {
    if (!this.db) throw new Error('Database not initialized');
    
    // In expo-sqlite next, we use runAsync for mutations, getAllAsync for queries
    const isMutation = sqlStatement.trim().toUpperCase().startsWith('SELECT') === false;
    
    try {
      if (isMutation) {
        const result = await this.db.runAsync(sqlStatement, args);
        return {
          insertId: result.lastInsertRowId,
          rowsAffected: result.changes,
          rows: [],
        };
      } else {
        const rows = await this.db.getAllAsync(sqlStatement, args);
        return {
          rowsAffected: 0,
          rows,
        };
      }
    } catch (error) {
      console.error(`[SQLiteDriver] Error executing query: ${sqlStatement}`, error);
      throw error;
    }
  }

  async executeBatch(sqlStatements: string[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    // expo-sqlite provides execAsync for raw batch execution (no parameterized queries)
    const script = sqlStatements.join(';\n') + ';';
    await this.db.execAsync(script);
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
