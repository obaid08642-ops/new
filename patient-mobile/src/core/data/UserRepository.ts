import { BaseRepository, LocalDataSource, RemoteDataSource, Result, Ok, Err } from './Repository';
import { IUserRepository } from './IRepository';
import { User } from '../domain/entities/Users';

export class UserRepository extends BaseRepository<User, string> implements IUserRepository {
  constructor(
    remote: RemoteDataSource<User, string>,
    local?: LocalDataSource<User, string>,
  ) {
    super(remote, local);
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      // 1. Try local cache
      if (this.local) {
        const cached = await this.local.getAll();
        const found = cached.find(u => u.email === email);
        if (found) return found;
      }

      // 2. Fetch from remote (using findAll with search param)
      const remoteRes = await this.remote.getAll({ search: email, page: 1, pageSize: 1 });
      if (remoteRes.items.length > 0) {
        const found = remoteRes.items[0];
        if (this.local) await this.local.save(found);
        return found;
      }
    } catch (e) {
      console.warn('[UserRepository] findByEmail error', e);
    }

    return null;
  }

  async exists(id: string): Promise<boolean> {
    try {
      const res = await this.findById(id);
      return res.ok;
    } catch {
      return false;
    }
  }

  // Map IRepository methods (getById, getAll) to the Result pattern in Repository.ts
  async getById(id: string): Promise<User | null> {
    const res = await this.findById(id);
    return res.ok ? res.data : null;
  }

  async getAll(params?: any): Promise<User[]> {
    const res = await this.findAll(params);
    return res.ok ? res.data.items : [];
  }

  async add(entity: User): Promise<void> {
    await this.create(entity);
  }

  async delete(id: string): Promise<void> {
    await this.remove(id);
  }
}
