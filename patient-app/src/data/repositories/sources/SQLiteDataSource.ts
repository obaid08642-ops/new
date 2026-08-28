import { ILocalDataSource } from '../interfaces/ILocalDataSource';
import { IBaseEntity } from '../interfaces/IRepository';
import { QuerySpecification } from '../core/QuerySpecification';
import { RepositoryTransactionContext } from '../core/UnitOfWork';
import { DatabaseManager } from '../../database/core/DatabaseManager';

/**
 * Concrete implementation of ILocalDataSource for SQLite.
 * Handles automatic translation of CRUD and QuerySpecifications to SQL.
 */
export class SQLiteDataSource<T extends IBaseEntity> implements ILocalDataSource<T> {
  private tableName: string;
  private dbManager: DatabaseManager;

  constructor(tableName: string, dbManager: DatabaseManager) {
    this.tableName = tableName;
    this.dbManager = dbManager;
  }

  private getDriver(context?: RepositoryTransactionContext) {
    return context?.tx ? context.tx : this.dbManager.driver;
  }

  async getById(id: string, context?: RepositoryTransactionContext): Promise<T | null> {
    const driver = this.getDriver(context);
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ? AND deleted_at IS NULL LIMIT 1`;
    const result = await driver.executeSql(sql, [id]);
    
    if (result.rows.length > 0) {
      return result.rows[0] as T;
    }
    return null;
  }

  async getAll(context?: RepositoryTransactionContext): Promise<T[]> {
    const driver = this.getDriver(context);
    const sql = `SELECT * FROM ${this.tableName} WHERE deleted_at IS NULL`;
    const result = await driver.executeSql(sql);
    return result.rows as T[];
  }

  async match(spec: QuerySpecification, context?: RepositoryTransactionContext): Promise<T[]> {
    const driver = this.getDriver(context);
    let sql = `SELECT * FROM ${this.tableName} WHERE 1=1`;
    const params: any[] = [];

    if (!spec.includesDeleted) {
      sql += ` AND deleted_at IS NULL`;
    }

    for (const [key, value] of Object.entries(spec.filters)) {
      sql += ` AND ${key} = ?`;
      params.push(value);
    }

    if (spec.cursorObj) {
      sql += ` AND ${spec.cursorObj.field} ${spec.cursorObj.operator} ?`;
      params.push(spec.cursorObj.value);
    }

    const sortKeys = Object.keys(spec.sorts);
    if (sortKeys.length > 0) {
      const orderClauses = sortKeys.map(key => `${key} ${spec.sorts[key]}`);
      sql += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    if (spec.limitVal !== undefined) {
      sql += ` LIMIT ${spec.limitVal}`;
    }

    if (spec.offsetVal !== undefined) {
      sql += ` OFFSET ${spec.offsetVal}`;
    }

    const result = await driver.executeSql(sql, params);
    return result.rows as T[];
  }

  async insert(entity: T, context?: RepositoryTransactionContext): Promise<T> {
    const driver = this.getDriver(context);
    
    const columns = Object.keys(entity).join(', ');
    const placeholders = Object.keys(entity).map(() => '?').join(', ');
    const values = Object.values(entity);
    
    const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;
    await driver.executeSql(sql, values);
    
    return entity; // Returning the passed entity assuming ID was pre-generated
  }

  async update(id: string, entity: Partial<T>, context?: RepositoryTransactionContext): Promise<T> {
    const driver = this.getDriver(context);
    
    const keys = Object.keys(entity);
    if (keys.length === 0) {
      const existing = await this.getById(id, context);
      if (!existing) throw new Error(`Entity not found: ${id}`);
      return existing;
    }

    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const values = Object.values(entity);
    values.push(id); // for the WHERE clause

    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    await driver.executeSql(sql, values);
    
    const updated = await this.getById(id, context);
    return updated as T;
  }

  async delete(id: string, soft: boolean = true, context?: RepositoryTransactionContext): Promise<boolean> {
    const driver = this.getDriver(context);
    
    let sql: string;
    let params: any[] = [id];

    if (soft) {
      sql = `UPDATE ${this.tableName} SET deleted_at = ? WHERE id = ?`;
      params = [Date.now(), id];
    } else {
      sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    }

    await driver.executeSql(sql, params);
    return true; // Simple boolean return, ideally we'd check rows affected
  }

  async restore(id: string, context?: RepositoryTransactionContext): Promise<boolean> {
    const driver = this.getDriver(context);
    const sql = `UPDATE ${this.tableName} SET deleted_at = NULL WHERE id = ?`;
    await driver.executeSql(sql, [id]);
    return true;
  }

  async upsertBatch(entities: T[], context?: RepositoryTransactionContext): Promise<void> {
    if (entities.length === 0) return;
    
    // Naive upsert: delete if exists, then insert.
    // Real SQLite would use INSERT OR REPLACE, but that replaces the whole row.
    // For simplicity in Phase 1C, we run updates in a transaction.
    const driver = this.getDriver(context);
    
    for (const entity of entities) {
      const existing = await this.getById(entity.id, context);
      if (existing) {
        await this.update(entity.id, entity, context);
      } else {
        await this.insert(entity, context);
      }
    }
  }
}
