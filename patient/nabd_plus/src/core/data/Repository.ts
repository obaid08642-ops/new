/**
 * Data Layer — Repository Pattern interfaces.
 * Every business module has a Repository that abstracts local + remote sources.
 * Screens/ViewModels talk ONLY to the Repository — never to raw APIs.
 *
 * Architecture:
 *   Screen → Repository → [RemoteDataSource | LocalDataSource]
 *                              ↓                    ↓
 *                         HttpClient           AsyncStorage/SQLite
 */

// ─────────────────────────────────────────────────────────────────────────────
// Base result type — typed success/failure without throwing
// ─────────────────────────────────────────────────────────────────────────────
export type Result<T, E = Error> =
  | { ok: true;  data: T }
  | { ok: false; error: E };

export function Ok<T>(data: T): Result<T> {
  return { ok: true, data };
}
export function Err<E extends Error>(error: E): Result<never, E> {
  return { ok: false, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// Data Source interfaces — each module implements these
// ─────────────────────────────────────────────────────────────────────────────

/** Local data source — reads/writes from device storage */
export interface LocalDataSource<TModel, TId = string> {
  getById(id: TId): Promise<TModel | null>;
  getAll(): Promise<TModel[]>;
  save(item: TModel): Promise<void>;
  saveAll(items: TModel[]): Promise<void>;
  delete(id: TId): Promise<void>;
  clear(): Promise<void>;
}

/** Remote data source — reads/writes from API */
export interface RemoteDataSource<TModel, TId = string, TCreateDTO = Partial<TModel>, TUpdateDTO = Partial<TModel>> {
  getById(id: TId): Promise<TModel>;
  getAll(params?: PaginationParams): Promise<PaginatedResult<TModel>>;
  create(dto: TCreateDTO): Promise<TModel>;
  update(id: TId, dto: TUpdateDTO): Promise<TModel>;
  delete(id: TId): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────────────────
export interface PaginationParams {
  page: number;
  pageSize: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, string | number | boolean>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository interface — combines local + remote with sync strategy
// ─────────────────────────────────────────────────────────────────────────────
export interface Repository<TModel, TId = string, TCreateDTO = Partial<TModel>, TUpdateDTO = Partial<TModel>> {
  findById(id: TId): Promise<Result<TModel>>;
  findAll(params?: PaginationParams): Promise<Result<PaginatedResult<TModel>>>;
  create(dto: TCreateDTO): Promise<Result<TModel>>;
  update(id: TId, dto: TUpdateDTO): Promise<Result<TModel>>;
  remove(id: TId): Promise<Result<void>>;
  /** Sync local cache with remote */
  sync?(): Promise<Result<void>>;
  /** Clear local cache */
  clearCache?(): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Base Repository implementation — extend for each module
// ─────────────────────────────────────────────────────────────────────────────
export abstract class BaseRepository<
  TModel,
  TId = string,
  TCreateDTO = Partial<TModel>,
  TUpdateDTO = Partial<TModel>,
> implements Repository<TModel, TId, TCreateDTO, TUpdateDTO> {
  constructor(
    protected readonly remote: RemoteDataSource<TModel, TId, TCreateDTO, TUpdateDTO>,
    protected readonly local?: LocalDataSource<TModel, TId>,
  ) {}

  async findById(id: TId): Promise<Result<TModel>> {
    try {
      // 1. Try local cache
      if (this.local) {
        const cached = await this.local.getById(id);
        if (cached) return Ok(cached);
      }
      // 2. Fetch from remote
      const data = await this.remote.getById(id);
      // 3. Cache locally
      if (this.local) await this.local.save(data);
      return Ok(data);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async findAll(params?: PaginationParams): Promise<Result<PaginatedResult<TModel>>> {
    try {
      const data = await this.remote.getAll(params);
      if (this.local && data.items.length > 0) {
        await this.local.saveAll(data.items);
      }
      return Ok(data);
    } catch (error) {
      // Fallback to local cache
      if (this.local) {
        const cached = await this.local.getAll();
        if (cached.length > 0) {
          return Ok({
            items: cached,
            total: cached.length,
            page: 1,
            pageSize: cached.length,
            totalPages: 1,
            hasMore: false,
          });
        }
      }
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async create(dto: TCreateDTO): Promise<Result<TModel>> {
    try {
      const data = await this.remote.create(dto);
      if (this.local) await this.local.save(data);
      return Ok(data);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async update(id: TId, dto: TUpdateDTO): Promise<Result<TModel>> {
    try {
      const data = await this.remote.update(id, dto);
      if (this.local) await this.local.save(data);
      return Ok(data);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async remove(id: TId): Promise<Result<void>> {
    try {
      await this.remote.delete(id);
      if (this.local) await this.local.delete(id);
      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async sync(): Promise<Result<void>> {
    // Override in subclass for module-specific sync logic
    return Ok(undefined);
  }

  async clearCache(): Promise<void> {
    await this.local?.clear();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DTO — Data Transfer Objects
// DTOs are the shape of data as received from the API.
// Models are the app's internal representation (may differ).
// ─────────────────────────────────────────────────────────────────────────────

/** Base API response envelope */
export interface ApiResponseDTO<T> {
  data: T;
  message?: string;
  success: boolean;
  meta?: {
    page?: number;
    totalCount?: number;
    totalPages?: number;
  };
}

/** Generic list DTO */
export interface ListDTO<T> {
  results: T[];
  count: number;
  next?: string | null;
  previous?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Model Mapper interface — transforms DTOs to domain models
// ─────────────────────────────────────────────────────────────────────────────
export interface ModelMapper<TDTO, TModel> {
  toDomain(dto: TDTO): TModel;
  toDTO(model: TModel): TDTO;
  toDomainList(dtos: TDTO[]): TModel[];
}

/** Helper base class */
export abstract class BaseModelMapper<TDTO, TModel>
  implements ModelMapper<TDTO, TModel> {
  abstract toDomain(dto: TDTO): TModel;
  abstract toDTO(model: TModel): TDTO;
  toDomainList(dtos: TDTO[]): TModel[] {
    return dtos.map((dto) => this.toDomain(dto));
  }
}
