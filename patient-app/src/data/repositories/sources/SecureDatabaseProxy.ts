import { ILocalDataSource } from '../interfaces/ILocalDataSource';
import { IBaseEntity } from '../interfaces/IRepository';
import { QuerySpecification } from '../core/QuerySpecification';
import { RepositoryTransactionContext } from '../core/UnitOfWork';
import { EncryptionService } from '../../../services/security/EncryptionService';

/**
 * Proxy wrapper around an ILocalDataSource.
 * Handles app-level encryption and decryption of specific PII fields
 * before they are written to or read from the local SQLite database.
 * 
 * Note: Requires a custom crypto implementation or react-native-quick-crypto.
 * For Phase 1C-C, this acts as the architectural hook.
 */
export class SecureDatabaseProxy<T extends IBaseEntity> implements ILocalDataSource<T> {
  private innerSource: ILocalDataSource<T>;
  private encryptedFields: (keyof T)[];
  private encryptionService: EncryptionService;
  
  constructor(innerSource: ILocalDataSource<T>, encryptedFields: (keyof T)[], encryptionService: EncryptionService) {
    this.innerSource = innerSource;
    this.encryptedFields = encryptedFields;
    this.encryptionService = encryptionService;
  }

  private encryptEntity(entity: any): any {
    if (!entity) return entity;
    const cloned = { ...entity };
    for (const field of this.encryptedFields) {
      if (cloned[field] !== undefined && cloned[field] !== null) {
        cloned[field] = this.encryptionService.encrypt(String(cloned[field]));
      }
    }
    return cloned;
  }

  private decryptEntity(entity: any): any {
    if (!entity) return entity;
    const cloned = { ...entity };
    for (const field of this.encryptedFields) {
      if (cloned[field] !== undefined && typeof cloned[field] === 'string' && cloned[field].startsWith('AES:')) {
        cloned[field] = this.encryptionService.decrypt(cloned[field]);
      }
    }
    return cloned;
  }

  async getById(id: string, context?: RepositoryTransactionContext): Promise<T | null> {
    const result = await this.innerSource.getById(id, context);
    return result ? this.decryptEntity(result) : null;
  }

  async getAll(context?: RepositoryTransactionContext): Promise<T[]> {
    const results = await this.innerSource.getAll(context);
    return results.map(r => this.decryptEntity(r));
  }

  async match(spec: QuerySpecification, context?: RepositoryTransactionContext): Promise<T[]> {
    // Note: Querying on encrypted fields requires exact match (deterministic encryption) 
    // or querying everything and decrypting in memory, which is slow.
    // Assuming deterministic encryption, we encrypt the filters before passing down.
    
    const encryptedSpec = QuerySpecification.create();
    Object.assign(encryptedSpec, spec); // copy props
    
    // Encrypt filters
    const newFilters: Record<string, any> = {};
    for (const [k, v] of Object.entries(spec.filters)) {
      if (this.encryptedFields.includes(k as keyof T)) {
        newFilters[k] = this.encryptionService.encrypt(String(v));
      } else {
        newFilters[k] = v;
      }
    }
    encryptedSpec.filters = newFilters;

    const results = await this.innerSource.match(encryptedSpec, context);
    return results.map(r => this.decryptEntity(r));
  }

  async insert(entity: T, context?: RepositoryTransactionContext): Promise<T> {
    const encrypted = this.encryptEntity(entity);
    await this.innerSource.insert(encrypted, context);
    return entity; // return original decrypted
  }

  async update(id: string, entity: Partial<T>, context?: RepositoryTransactionContext): Promise<T> {
    const encrypted = this.encryptEntity(entity);
    const result = await this.innerSource.update(id, encrypted, context);
    return this.decryptEntity(result);
  }

  async delete(id: string, soft?: boolean, context?: RepositoryTransactionContext): Promise<boolean> {
    return this.innerSource.delete(id, soft, context);
  }

  async restore(id: string, context?: RepositoryTransactionContext): Promise<boolean> {
    return this.innerSource.restore(id, context);
  }

  async upsertBatch(entities: T[], context?: RepositoryTransactionContext): Promise<void> {
    const encryptedBatch = entities.map(e => this.encryptEntity(e));
    await this.innerSource.upsertBatch(encryptedBatch, context);
  }
}
