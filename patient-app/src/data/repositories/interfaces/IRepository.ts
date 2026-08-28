import { QuerySpecification } from '../core/QuerySpecification';
import { RepositoryTransactionContext } from '../core/UnitOfWork';

export interface IBaseEntity {
  id: string;
  created_at?: number;
  updated_at?: number;
  deleted_at?: number | null;
  created_by?: string;
  updated_by?: string;
  version?: number;
}

export interface IRepository<T extends IBaseEntity> {
  findById(id: string, context?: RepositoryTransactionContext): Promise<T | null>;
  findAll(context?: RepositoryTransactionContext): Promise<T[]>;
  match(spec: QuerySpecification, context?: RepositoryTransactionContext): Promise<T[]>;
  create(entity: Omit<T, 'created_at' | 'updated_at' | 'version'>, context?: RepositoryTransactionContext): Promise<T>;
  update(id: string, entity: Partial<T>, context?: RepositoryTransactionContext): Promise<T>;
  delete(id: string, soft?: boolean, context?: RepositoryTransactionContext): Promise<boolean>;
  restore(id: string, context?: RepositoryTransactionContext): Promise<boolean>;
}
