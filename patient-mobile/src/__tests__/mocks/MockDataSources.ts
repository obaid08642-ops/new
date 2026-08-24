/**
 * Mock Services — Injectable mock implementations for testing.
 * Use in integration tests and when real network/storage is unavailable.
 */
import type { RemoteDataSource, PaginationParams, PaginatedResult } from '../../core/data/Repository';

// ─────────────────────────────────────────────────────────────────────────────
// In-memory Remote Data Source (for integration tests)
// ─────────────────────────────────────────────────────────────────────────────
export class InMemoryRemoteDataSource<TModel extends { id: string }>
  implements RemoteDataSource<TModel, string> {

  private store: Map<string, TModel>;

  constructor(initialData: TModel[] = []) {
    this.store = new Map(initialData.map((item) => [item.id, item]));
  }

  async getById(id: string): Promise<TModel> {
    const item = this.store.get(id);
    if (!item) throw new Error(`Not found: ${id}`);
    return item;
  }

  async getAll(params?: PaginationParams): Promise<PaginatedResult<TModel>> {
    let items = Array.from(this.store.values());
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter((item) =>
        Object.values(item).some((v) => String(v).toLowerCase().includes(q)),
      );
    }
    const total = items.length;
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasMore: start + pageSize < total,
    };
  }

  async create(dto: Partial<TModel>): Promise<TModel> {
    const item = { ...dto, id: dto.id ?? `mock-${Date.now()}` } as TModel;
    this.store.set(item.id, item);
    return item;
  }

  async update(id: string, dto: Partial<TModel>): Promise<TModel> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Not found: ${id}`);
    const updated = { ...existing, ...dto };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  /** Test helper — seed data */
  seed(items: TModel[]): void {
    items.forEach((item) => this.store.set(item.id, item));
  }

  /** Test helper — dump all items */
  dump(): TModel[] {
    return Array.from(this.store.values());
  }
}
