/**
 * Data Layer Architecture - Base Interfaces
 */

// 1. DTO (Data Transfer Object)
export interface DTO {
  // Base interface for all network payloads/responses
}

// 2. Mapper
export interface Mapper<TModel, TDto extends DTO> {
  toDomain(dto: TDto): TModel;
  toDto(domain: TModel): TDto;
}

// 3. Local Data Source
export interface LocalDataSource<T> {
  getById(id: string): Promise<T | null>;
  getAll(): Promise<T[]>;
  save(item: T): Promise<void>;
  saveAll(items: T[]): Promise<void>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

// 4. Remote Data Source
export interface RemoteDataSource<TDto extends DTO> {
  fetchById(id: string): Promise<TDto>;
  fetchAll(params?: any): Promise<TDto[]>;
  create(dto: Partial<TDto>): Promise<TDto>;
  update(id: string, dto: Partial<TDto>): Promise<TDto>;
  remove(id: string): Promise<void>;
}

// 5. Repository
export interface Repository<TModel> {
  getById(id: string, forceRefresh?: boolean): Promise<TModel>;
  getAll(params?: any, forceRefresh?: boolean): Promise<TModel[]>;
  create(item: Omit<TModel, 'id'>): Promise<TModel>;
  update(id: string, item: Partial<TModel>): Promise<TModel>;
  delete(id: string): Promise<void>;
}
