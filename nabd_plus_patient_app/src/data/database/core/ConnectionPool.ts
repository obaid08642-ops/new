import { IDatabaseDriver } from '../drivers/IDatabaseDriver';

/**
 * Manages database connections to ensure we don't open the same DB multiple times.
 * Useful when integrating with multiple databases or ensuring singletons in DI.
 */
export class ConnectionPool {
  private static instance: ConnectionPool;
  private connections: Map<string, IDatabaseDriver> = new Map();

  private constructor() {}

  public static getInstance(): ConnectionPool {
    if (!ConnectionPool.instance) {
      ConnectionPool.instance = new ConnectionPool();
    }
    return ConnectionPool.instance;
  }

  public async getConnection(dbName: string, driverFactory: () => IDatabaseDriver): Promise<IDatabaseDriver> {
    if (this.connections.has(dbName)) {
      return this.connections.get(dbName)!;
    }

    const driver = driverFactory();
    await driver.init(dbName);
    this.connections.set(dbName, driver);
    return driver;
  }

  public async closeAll(): Promise<void> {
    for (const [name, driver] of Array.from(this.connections.entries())) {
      await driver.close();
      this.connections.delete(name);
    }
  }
}
