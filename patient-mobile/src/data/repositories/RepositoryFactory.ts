import { IBaseEntity, IRepository } from './interfaces/IRepository';
import { CompositeRepository } from './core/CompositeRepository';
import { RepositoryRegistry } from './RepositoryRegistry';
import { ILocalDataSource } from './interfaces/ILocalDataSource';
import { IRemoteDataSource } from './interfaces/IRemoteDataSource';

/**
 * Factory to construct and register repositories dynamically.
 */
export class RepositoryFactory {
  /**
   * Creates a CompositeRepository for a given entity, registers it, and returns it.
   */
  static createRepository<T extends IBaseEntity>(
    tableName: string,
    localSource?: ILocalDataSource<T>,
    remoteSource?: IRemoteDataSource<T>
  ): IRepository<T> {
    const repo = new CompositeRepository<T>(tableName, localSource, remoteSource);
    RepositoryRegistry.register(tableName, repo);
    return repo;
  }
}
