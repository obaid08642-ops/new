/**
 * AsyncStorage-based Local Data Source.
 * Implements LocalDataSource<T> for any module.
 * Key is auto-namespaced: @nabdah_{namespace}_{id}
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LocalDataSource } from './Repository';

export class AsyncStorageDataSource<TModel extends { id: string }>
  implements LocalDataSource<TModel, string> {

  private readonly listKey: string;

  constructor(private readonly namespace: string) {
    this.listKey = `@nabdah_${namespace}_list`;
  }

  private itemKey(id: string): string {
    return `@nabdah_${this.namespace}_${id}`;
  }

  async getById(id: string): Promise<TModel | null> {
    try {
      const raw = await AsyncStorage.getItem(this.itemKey(id));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async getAll(): Promise<TModel[]> {
    try {
      const ids = await this.getIds();
      if (!ids.length) return [];
      const keys = ids.map((id) => this.itemKey(id));
      const pairs = await AsyncStorage.multiGet(keys);
      return pairs
        .map(([, v]) => (v ? JSON.parse(v) : null))
        .filter(Boolean) as TModel[];
    } catch {
      return [];
    }
  }

  async save(item: TModel): Promise<void> {
    try {
      await AsyncStorage.setItem(this.itemKey(item.id), JSON.stringify(item));
      await this.addId(item.id);
    } catch { /* ignore */ }
  }

  async saveAll(items: TModel[]): Promise<void> {
    try {
      const pairs: [string, string][] = items.map((item) => [
        this.itemKey(item.id),
        JSON.stringify(item),
      ]);
      await AsyncStorage.multiSet(pairs);
      await this.setIds(items.map((i) => i.id));
    } catch { /* ignore */ }
  }

  async delete(id: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.itemKey(id));
      await this.removeId(id);
    } catch { /* ignore */ }
  }

  async clear(): Promise<void> {
    try {
      const ids = await this.getIds();
      const keys = ids.map((id) => this.itemKey(id));
      await AsyncStorage.multiRemove([...keys, this.listKey]);
    } catch { /* ignore */ }
  }

  // ── ID index ────────────────────────────────────────────────────────────
  private async getIds(): Promise<string[]> {
    const raw = await AsyncStorage.getItem(this.listKey);
    return raw ? JSON.parse(raw) : [];
  }

  private async setIds(ids: string[]): Promise<void> {
    const existing = await this.getIds();
    const merged = [...new Set([...existing, ...ids])];
    await AsyncStorage.setItem(this.listKey, JSON.stringify(merged));
  }

  private async addId(id: string): Promise<void> {
    await this.setIds([id]);
  }

  private async removeId(id: string): Promise<void> {
    const ids = await this.getIds();
    await AsyncStorage.setItem(
      this.listKey,
      JSON.stringify(ids.filter((i) => i !== id)),
    );
  }
}
