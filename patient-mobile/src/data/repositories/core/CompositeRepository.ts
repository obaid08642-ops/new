import { IBaseEntity } from '../interfaces/IRepository';
import { BaseRepository } from './BaseRepository';
import { QuerySpecification } from './QuerySpecification';
import { RepositoryTransactionContext } from './UnitOfWork';
import { EventBus } from '../../../services/EventBus';

/**
 * CompositeRepository acts as the Offline-First coordinator.
 * It reads from the local database first (Read-Through Cache).
 * It writes to the local database first, then queues for sync (Write-Through Cache / Offline Queue).
 */
export class CompositeRepository<T extends IBaseEntity> extends BaseRepository<T> {

  async findById(id: string, context?: RepositoryTransactionContext): Promise<T | null> {
    // 1. Check local DB
    const localEntity = await super.findById(id, context);
    if (localEntity) return localEntity;

    // 2. Fallback to remote if missing and online (Simplified for architecture setup)
    if (this.remoteSource) {
      try {
        const remoteEntity = await this.remoteSource.fetchById(id);
        if (remoteEntity && this.localSource) {
          await this.localSource.insert(remoteEntity, context);
        }
        return remoteEntity;
      } catch (e) {
        console.warn(`[CompositeRepository] Failed to fetch remote entity ${id}`, e);
      }
    }
    return null;
  }

  async match(spec: QuerySpecification, context?: RepositoryTransactionContext): Promise<T[]> {
    return super.match(spec, context);
  }

  async create(entity: Omit<T, 'created_at' | 'updated_at' | 'version'>, context?: RepositoryTransactionContext): Promise<T> {
    const localResult = await super.create(entity, context);

    // Publish Domain Event for SyncEngine & other modules
    EventBus.publish('entity.created', { entityType: this.tableName, payload: localResult });

    return localResult;
  }

  async update(id: string, entity: Partial<T>, context?: RepositoryTransactionContext): Promise<T> {
    const localResult = await super.update(id, entity, context);

    EventBus.publish('entity.updated', { entityType: this.tableName, id, payload: localResult });

    return localResult;
  }

  async delete(id: string, soft: boolean = true, context?: RepositoryTransactionContext): Promise<boolean> {
    const success = await super.delete(id, soft, context);

    if (success) {
      EventBus.publish('entity.deleted', { entityType: this.tableName, id, soft });
    }

    return success;
  }

  async restore(id: string, context?: RepositoryTransactionContext): Promise<boolean> {
    const success = await super.restore(id, context);

    if (success) {
      EventBus.publish('entity.restored', { entityType: this.tableName, id });
    }

    return success;
  }
}
