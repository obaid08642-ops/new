import { IBaseEntity, IRepository } from '../interfaces/IRepository';
import { ILocalDataSource } from '../interfaces/ILocalDataSource';
import { IRemoteDataSource } from '../interfaces/IRemoteDataSource';
import { QuerySpecification } from './QuerySpecification';
import { RepositoryTransactionContext } from './UnitOfWork';

/**
 * Base generic repository providing standard behavior.
 * Most repositories will extend this to get CRUD for free.
 */
export abstract class BaseRepository<T extends IBaseEntity> implements IRepository<T> {
  protected tableName: string;
  protected localSource?: ILocalDataSource<T>;
  protected remoteSource?: IRemoteDataSource<T>;

  constructor(tableName: string, localSource?: ILocalDataSource<T>, remoteSource?: IRemoteDataSource<T>) {
    this.tableName = tableName;
    this.localSource = localSource;
    this.remoteSource = remoteSource;
  }

  async findById(id: string, context?: RepositoryTransactionContext): Promise<T | null> {
    if (this.localSource) {
      return this.localSource.getById(id, context);
    }
    return null;
  }

  async findAll(context?: RepositoryTransactionContext): Promise<T[]> {
    if (this.localSource) {
      return this.localSource.getAll(context);
    }
    return [];
  }

  async match(spec: QuerySpecification, context?: RepositoryTransactionContext): Promise<T[]> {
    if (this.localSource) {
      return this.localSource.match(spec, context);
    }
    return [];
  }

  async create(entity: Omit<T, 'created_at' | 'updated_at' | 'version'>, context?: RepositoryTransactionContext): Promise<T> {
    if (this.localSource) {
      const now = Date.now();
      const newEntity = {
        ...entity,
        created_at: now,
        updated_at: now,
        version: 1,
      } as unknown as T;
      return this.localSource.insert(newEntity, context);
    }
    throw new Error('Local source not configured');
  }

  async update(id: string, entity: Partial<T>, context?: RepositoryTransactionContext): Promise<T> {
    if (this.localSource) {
      const updateData = {
        ...entity,
        updated_at: Date.now(),
      };
      return this.localSource.update(id, updateData, context);
    }
    throw new Error('Local source not configured');
  }

  async delete(id: string, soft: boolean = true, context?: RepositoryTransactionContext): Promise<boolean> {
    if (this.localSource) {
      return this.localSource.delete(id, soft, context);
    }
    return false;
  }

  async restore(id: string, context?: RepositoryTransactionContext): Promise<boolean> {
    if (this.localSource) {
      return this.localSource.restore(id, context);
    }
    return false;
  }
}
