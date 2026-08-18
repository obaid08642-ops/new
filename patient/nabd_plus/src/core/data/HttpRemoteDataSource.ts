/**
 * HttpRemoteDataSource — concrete RemoteDataSource built on HttpClient.
 * Provides a typed, convention-based REST data source for any entity.
 *
 * Example:
 *   const doctorRemote = new HttpRemoteDataSource<DoctorDTO>('/doctors');
 */
import { http } from '../../services/HttpClient';
import type {
  RemoteDataSource, PaginationParams, PaginatedResult,
  ApiResponseDTO, ListDTO,
} from './Repository';

export class HttpRemoteDataSource<
  TModel,
  TId = string,
  TCreateDTO = Partial<TModel>,
  TUpdateDTO = Partial<TModel>,
> implements RemoteDataSource<TModel, TId, TCreateDTO, TUpdateDTO> {

  constructor(
    private readonly endpoint: string,
    private readonly options?: { baseUrl?: string },
  ) {}

  async getById(id: TId): Promise<TModel> {
    const res = await http.get<ApiResponseDTO<TModel>>(
      `${this.endpoint}/${id}`,
      { baseURL: this.options?.baseUrl },
    );
    return (res.data as any).data;
  }

  async getAll(params?: PaginationParams): Promise<PaginatedResult<TModel>> {
    const query = params ? new URLSearchParams({
      page:     String(params.page),
      page_size: String(params.pageSize ?? 20),
      ...(params.sort   ? { sort: params.sort }   : {}),
      ...(params.order  ? { order: params.order } : {}),
      ...(params.search ? { search: params.search } : {}),
      ...(params.filters
        ? Object.fromEntries(
            Object.entries(params.filters).map(([k, v]) => [k, String(v)]),
          )
        : {}),
    }).toString() : '';

    const res = await http.get<ListDTO<TModel> | ApiResponseDTO<TModel[]>>(
      `${this.endpoint}${query ? `?${query}` : ''}`,
      { baseURL: this.options?.baseUrl },
    );

    // Handle both DRF (ListDTO) and custom (ApiResponseDTO) response shapes
    if ('results' in (res.data as any)) {
      const list = res.data as any;
      const pageSize = params?.pageSize ?? 20;
      return {
        items: list.results,
        total: list.count,
        page: params?.page ?? 1,
        pageSize,
        totalPages: Math.ceil(list.count / pageSize),
        hasMore: !!list.next,
      };
    } else {
      const data = res.data as ApiResponseDTO<TModel[]>;
      const items = data.data ?? [];
      return {
        items,
        total: data.meta?.totalCount ?? items.length,
        page: data.meta?.page ?? 1,
        pageSize: params?.pageSize ?? items.length,
        totalPages: data.meta?.totalPages ?? 1,
        hasMore: false,
      };
    }
  }

  async create(dto: TCreateDTO): Promise<TModel> {
    const res = await http.post<ApiResponseDTO<TModel>>(
      this.endpoint,
      dto,
      { baseURL: this.options?.baseUrl },
    );
    return (res.data as any).data;
  }

  async update(id: TId, dto: TUpdateDTO): Promise<TModel> {
    const res = await http.patch<ApiResponseDTO<TModel>>(
      `${this.endpoint}/${id}`,
      dto,
      { baseURL: this.options?.baseUrl },
    );
    return (res.data as any).data;
  }

  async delete(id: TId): Promise<void> {
    await http.delete(`${this.endpoint}/${id}`, {
      baseURL: this.options?.baseUrl,
    });
  }
}
