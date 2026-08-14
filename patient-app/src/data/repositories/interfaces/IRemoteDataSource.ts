import { IBaseEntity } from './IRepository';

export interface IRemoteDataSource<T extends IBaseEntity> {
  fetchById(id: string): Promise<T | null>;
  fetchAll(params?: any): Promise<T[]>;
  create(entity: Omit<T, 'created_at' | 'updated_at' | 'version'>): Promise<T>;
  update(id: string, entity: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}
