import { CompositeRepository } from './core/CompositeRepository';
import { ILocalDataSource } from './interfaces/ILocalDataSource';
import { IRemoteDataSource } from './interfaces/IRemoteDataSource';
import { IBaseEntity } from './interfaces/IRepository';

export interface UserEntity extends IBaseEntity {
  email?: string;
  phone?: string;
  password?: string; // Hashed password
  is_active: number;
}

export class UsersRepository extends CompositeRepository<UserEntity> {
  constructor(
    localSource?: ILocalDataSource<UserEntity>,
    remoteSource?: IRemoteDataSource<UserEntity>
  ) {
    super('users', localSource, remoteSource);
  }
}
