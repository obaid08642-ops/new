import { IDatabaseDriver, IDatabaseTransaction } from '../drivers/IDatabaseDriver';

/**
 * Manages database transactions, providing support for nested transactions via SAVEPOINTs.
 */
export class TransactionManager {
  private driver: IDatabaseDriver;
  private currentTransaction: IDatabaseTransaction | null = null;
  private savepointCounter = 0;

  constructor(driver: IDatabaseDriver) {
    this.driver = driver;
  }

  /**
   * Executes a callback within a transaction.
   * If a transaction is already active, it creates a SAVEPOINT for nested rollback.
   */
  async runInTransaction<T>(callback: (tx: IDatabaseTransaction) => Promise<T>): Promise<T> {
    if (this.currentTransaction) {
      // Nested transaction scenario
      this.savepointCounter++;
      const spName = `sp_${this.savepointCounter}`;
      
      try {
        await this.currentTransaction.executeSql(`SAVEPOINT ${spName}`);
        const result = await callback(this.currentTransaction);
        await this.currentTransaction.executeSql(`RELEASE SAVEPOINT ${spName}`);
        return result;
      } catch (error) {
        await this.currentTransaction.executeSql(`ROLLBACK TO SAVEPOINT ${spName}`);
        throw error;
      }
    } else {
      // Top-level transaction
      return await this.driver.transaction(async (tx) => {
        this.currentTransaction = tx;
        this.savepointCounter = 0;
        try {
          const result = await callback(tx);
          return result;
        } finally {
          this.currentTransaction = null;
        }
      });
    }
  }
}
