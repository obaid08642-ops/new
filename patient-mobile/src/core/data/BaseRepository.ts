import { Repository, LocalDataSource, RemoteDataSource, Mapper, DTO } from './Interfaces';

/**
 * Base Repository Implementation with Offline-First support
 */
export abstract class BaseRepository<TModel extends { id: string }, TDto extends DTO> implements Repository<TModel> {

  constructor(
    protected remoteSource: RemoteDataSource<TDto>,
    protected localSource: LocalDataSource<TModel>,
    protected mapper: Mapper<TModel, TDto>
  ) {}

  async getById(id: string, forceRefresh: boolean = false): Promise<TModel> {
    if (!forceRefresh) {
      const local = await this.localSource.getById(id);
      if (local) return local;
    }

    const remoteDto = await this.remoteSource.fetchById(id);
    const model = this.mapper.toDomain(remoteDto);
    await this.localSource.save(model);
    return model;
  }

  async getAll(params?: any, forceRefresh: boolean = false): Promise<TModel[]> {
    if (!forceRefresh) {
      const localList = await this.localSource.getAll();
      if (localList.length > 0) return localList;
    }

    const remoteList = await this.remoteSource.fetchAll(params);
    const models = remoteList.map(dto => this.mapper.toDomain(dto));
    await this.localSource.saveAll(models);
    return models;
  }

  async create(item: Omit<TModel, 'id'>): Promise<TModel> {
    // To be fully implemented in specific repos (optimistic UI logic)
    const dto = this.mapper.toDto(item as TModel);
    const createdDto = await this.remoteSource.create(dto);
    const createdModel = this.mapper.toDomain(createdDto);
    await this.localSource.save(createdModel);
    return createdModel;
  }

  async update(id: string, item: Partial<TModel>): Promise<TModel> {
    // To be fully implemented in specific repos
    const updatedDto = await this.remoteSource.update(id, item as any);
    const updatedModel = this.mapper.toDomain(updatedDto);
    await this.localSource.save(updatedModel);
    return updatedModel;
  }

  async delete(id: string): Promise<void> {
    await this.remoteSource.remove(id);
    await this.localSource.delete(id);
  }
}
