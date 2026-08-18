import { IRemoteDataSource } from '../interfaces/IRemoteDataSource';
import { IBaseEntity } from '../interfaces/IRepository';
import { http } from '../../../services/HttpClient';

/**
 * Concrete implementation of IRemoteDataSource using Phase 1A HttpClient.
 * Maps entity operations to RESTful API calls.
 */
export class RemoteDataSource<T extends IBaseEntity> implements IRemoteDataSource<T> {
  private endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async fetchById(id: string): Promise<T | null> {
    try {
      const response = await http.get<T>(`${this.endpoint}/${id}`);
      return response.data;
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  async fetchAll(params?: any): Promise<T[]> {
    try {
      let url = this.endpoint;
      if (params) {
        const query = new URLSearchParams(
          Object.entries(params).reduce<Record<string, string>>((acc, [k, v]) => {
            acc[k] = String(v);
            return acc;
          }, {})
        ).toString();
        url += `?${query}`;
      }
      const response = await http.get<T[]>(url);
      return response.data;
    } catch (e: any) {
      console.error(`[RemoteDataSource] fetchAll failed for ${this.endpoint}`, e);
      return [];
    }
  }

  async create(entity: Omit<T, 'created_at' | 'updated_at' | 'version'>): Promise<T> {
    const response = await http.post<T>(this.endpoint, entity);
    return response.data;
  }

  async update(id: string, entity: Partial<T>): Promise<T> {
    const response = await http.put<T>(`${this.endpoint}/${id}`, entity);
    return response.data;
  }

  async delete(id: string): Promise<boolean> {
    try {
      await http.delete(`${this.endpoint}/${id}`);
      return true;
    } catch (e: any) {
      console.error(`[RemoteDataSource] delete failed for ${this.endpoint}/${id}`, e);
      return false;
    }
  }
}
