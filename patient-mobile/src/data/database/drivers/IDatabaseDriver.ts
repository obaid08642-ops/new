export interface IDatabaseResult {
  insertId?: number;
  rowsAffected: number;
  rows: any[];
}

export interface IDatabaseDriver {
  /** Initialize connection to the database */
  init(dbName: string): Promise<void>;

  /** Execute a single query */
  executeSql(sqlStatement: string, args?: any[]): Promise<IDatabaseResult>;

  /** Execute a batch of queries (often used for migrations) */
  executeBatch(sqlStatements: string[]): Promise<void>;

  /** Run a transaction where all queries must succeed or rollback */
  transaction<T>(callback: (tx: IDatabaseTransaction) => Promise<T>): Promise<T>;

  /** Close the connection */
  close(): Promise<void>;
}

export interface IDatabaseTransaction {
  executeSql(sqlStatement: string, args?: any[]): Promise<IDatabaseResult>;
}
