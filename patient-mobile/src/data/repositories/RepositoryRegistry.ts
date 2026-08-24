import { IBaseEntity, IRepository } from './interfaces/IRepository';
import { CompositeRepository } from './core/CompositeRepository';

/**
 * Registry to hold singleton instances of repositories.
 */
export class RepositoryRegistry {
  private static repositories = new Map<string, IRepository<any>>();

  static register<T extends IBaseEntity>(tableName: string, repo: IRepository<T>): void {
    this.repositories.set(tableName, repo);
  }

  static get<T extends IBaseEntity>(tableName: string): IRepository<T> {
    const repo = this.repositories.get(tableName);
    if (!repo) {
      throw new Error(`Repository for ${tableName} not found in registry`);
    }
    return repo as IRepository<T>;
  }

  static clear(): void {
    this.repositories.clear();
  }
}
