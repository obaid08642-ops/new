/**
 * `POST /pharmacy/procurement/analyze-file` answers `{ ok, provider, model, items, counts }`
 * (backend/src/modules/pharmacy/controllers/procurement.controller.ts). The HTTP client hands the screen the axios
 * response, so the items are at `response.data.items`; reading `response.items` found nothing and the smart
 * procurement cart never received a line.
 */
export interface AnalysedItem {
  raw_name_string: string;
  requested_quantity: number;
  matched?: boolean;
  medicine_id?: string | null;
  medicine_name?: string | null;
  category_group?: string;
}

export function analysisItems(response: unknown): AnalysedItem[] {
  const data = (response as { data?: { items?: unknown } } | null)?.data;
  return Array.isArray(data?.items) ? (data.items as AnalysedItem[]).filter(i => i && typeof i.raw_name_string === 'string') : [];
}
