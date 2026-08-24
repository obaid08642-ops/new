import { DatabaseManager } from '../../database/core/DatabaseManager';
import { IDatabaseTransaction } from '../../database/drivers/IDatabaseDriver';

/**
 * Context that wraps a database transaction and makes it available to repositories.
 */
export class RepositoryTransactionContext {
  public tx: IDatabaseTransaction;

  constructor(tx: IDatabaseTransaction) {
    this.tx = tx;
  }
}

/**
 * Manages atomic operations across multiple repositories.
 */
export class UnitOfWork {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  /**
   * Executes a callback within a transactional context.
   * Repositories can use the provided context to execute queries safely.
   */
  async run<T>(callback: (context: RepositoryTransactionContext) => Promise<T>): Promise<T> {
    return await this.dbManager.transactionManager.runInTransaction(async (tx) => {
      const context = new RepositoryTransactionContext(tx);
      return await callback(context);
    });
  }
}
