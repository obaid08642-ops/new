import { IBaseEntity } from './IRepository';
import { QuerySpecification } from '../core/QuerySpecification';
import { RepositoryTransactionContext } from '../core/UnitOfWork';

export interface ILocalDataSource<T extends IBaseEntity> {
  getById(id: string, context?: RepositoryTransactionContext): Promise<T | null>;
  getAll(context?: RepositoryTransactionContext): Promise<T[]>;
  match(spec: QuerySpecification, context?: RepositoryTransactionContext): Promise<T[]>;
  insert(entity: T, context?: RepositoryTransactionContext): Promise<T>;
  update(id: string, entity: Partial<T>, context?: RepositoryTransactionContext): Promise<T>;
  delete(id: string, soft?: boolean, context?: RepositoryTransactionContext): Promise<boolean>;
  restore(id: string, context?: RepositoryTransactionContext): Promise<boolean>;
  
  /** Batch operations for sync */
  upsertBatch(entities: T[], context?: RepositoryTransactionContext): Promise<void>;
}
