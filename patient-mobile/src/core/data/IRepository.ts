import { Result, PaginationParams, PaginatedResult } from './Repository';

export interface IRepository<TEntity, TId = string> {
  getById(id: TId): Promise<TEntity | null>;
  getAll(params?: PaginationParams): Promise<TEntity[]>;
  add(entity: TEntity): Promise<void>;
  update(id: TId, entity: Partial<TEntity>): Promise<Result<TEntity>>;
  delete(id: TId): Promise<void>;
}

export interface IBaseRepository<TEntity, TId = string> extends IRepository<TEntity, TId> {
  // Common extended repository methods
  exists(id: TId): Promise<boolean>;
}

// Module specific repository contracts
export interface IUserRepository extends IBaseRepository<any> {
  findByEmail(email: string): Promise<any | null>;
}

export interface IProviderRepository extends IBaseRepository<any> {
  findByLocation(latitude: number, longitude: number, radius: number): Promise<any[]>;
}
