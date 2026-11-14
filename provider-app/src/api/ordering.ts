import client from './client';

// M1 provider ordering declaration (backend: provider/ordering/*). The kind of every call must be the provider's own.
export type ServiceKind = 'lab' | 'radiology' | 'nursing';
export type OrderMode = 'home' | 'facility';
export interface InsurerClasses { company_id: string; classes: string[]; active: boolean }
export interface OrderingSettings {
  modes: OrderMode[];
  home_fee: number;
  home_radius_km: number | null;
  auto_accept: boolean;
  walk_in: boolean;
  staff_genders: string[];
  accepted_insurance: InsurerClasses[];
}
export interface OrderingItemView {
  service_kind: ServiceKind;
  catalog_id: string;
  name_ar: string | null;
  name_en: string | null;
  modes: OrderMode[];
  prices: Partial<Record<OrderMode, number>>;
  accepted_insurance: InsurerClasses[];
  turnaround_hours: number | null;
  preparation: { ar?: string; en?: string } | null;
  available: boolean;
  inherited: { modes: boolean; accepted_insurance: boolean };
}
export interface OrderingItemInput {
  service_kind: ServiceKind;
  catalog_id: string;
  modes?: OrderMode[] | null;
  prices?: Partial<Record<OrderMode, number>>;
  accepted_insurance?: InsurerClasses[] | null;
  turnaround_hours?: number | null;
  preparation?: { ar?: string; en?: string } | null;
  available?: boolean;
}
export type CompletenessPart = 'prices' | 'modes_hours' | 'insurance' | 'prep_turnaround' | 'photo_licence';
export interface OrderingCompleteness {
  score: number;
  parts: Record<CompletenessPart, number>;
  missing: Array<{ part: CompletenessPart; count: number }>;
  weights: Record<CompletenessPart, number>;
}
export interface ImportResult { imported: number; rejected: Array<{ line: number; reason: string }> }
export interface CatalogRow { id: string; name_ar: string; name_en: string }
export interface InsurerOption { id: string; ar: string; en: string; classes: string[] }

const unwrap = <T,>(d: unknown): T => d as T;

export const OrderingApi = {
  getSettings: async (): Promise<OrderingSettings> => unwrap<OrderingSettings>((await client.get('/provider/ordering/settings')).data),
  putSettings: async (s: OrderingSettings): Promise<OrderingSettings> => unwrap<OrderingSettings>((await client.put('/provider/ordering/settings', s)).data),
  listItems: async (kind: ServiceKind): Promise<OrderingItemView[]> => {
    const d = (await client.get('/provider/ordering/items', { params: { service_kind: kind } })).data;
    return Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
  },
  putItem: async (b: OrderingItemInput): Promise<OrderingItemView> => unwrap<OrderingItemView>((await client.put('/provider/ordering/items', b)).data),
  bulkPrice: async (b: { service_kind: ServiceKind; mode: OrderMode; percent?: number; set_price?: number; catalog_ids?: string[] }): Promise<{ updated: number }> =>
    (await client.post('/provider/ordering/items/bulk-price', b)).data,
  copyMode: async (b: { service_kind: ServiceKind; from: OrderMode; to: OrderMode }): Promise<{ copied: number }> =>
    (await client.post('/provider/ordering/items/copy-mode', b)).data,
  exportCsv: async (kind: ServiceKind): Promise<string> =>
    String((await client.get('/provider/ordering/items/export', { params: { service_kind: kind }, responseType: 'text', transformResponse: (r: any) => r })).data ?? ''),
  importCsv: async (kind: ServiceKind, csv: string): Promise<ImportResult> =>
    (await client.post('/provider/ordering/items/import', { service_kind: kind, csv })).data,
  completeness: async (): Promise<OrderingCompleteness> => (await client.get('/provider/ordering/completeness')).data,
  /** National catalogue of the provider's kind (admin-governed): /catalogs/labs | radiology | nursing. */
  catalogue: async (kind: ServiceKind): Promise<CatalogRow[]> => {
    const path = kind === 'lab' ? 'labs' : kind;
    const d = (await client.get(`/catalogs/${path}`)).data;
    const raw: any[] = Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
    return raw.filter((r) => r && r.id).map((r) => ({
      id: String(r.id),
      name_ar: r.test_name_ar || r.name_ar || r.name || String(r.id),
      name_en: r.test_name_en || r.name_en || r.name || String(r.id),
    }));
  },
  /** Insurers with the raw company id the ordering API validates (catalogs.ts keeps the code instead). */
  insurers: async (): Promise<InsurerOption[]> => {
    const d = (await client.get('/insurance/companies')).data;
    const raw: any[] = Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
    return raw.filter((c) => c && c.id).map((c) => ({
      id: String(c.id),
      ar: c.name_ar || c.name_en || c.code || String(c.id),
      en: c.name_en || c.name_ar || c.code || String(c.id),
      classes: (c.plans || []).map((p: any) => String(p.code || p.name_en || p.name_ar || '')).filter(Boolean),
    }));
  },
};
