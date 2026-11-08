import { loadItem } from "./load-item";
import { preparationFor } from "./item";
import type { ServiceKind } from "./quote";

/**
 * The preparation lines of one catalogue item for the confirm step (Ord07), whatever its kind: the same catalogue read as the item page
 * (`loadItem`: lab test or package, radiology scan, nursing service). Empty when the catalogue does not answer or the item has none;
 * nothing is made up.
 */
export async function itemPreparation(kind: ServiceKind, locale: string, id: string): Promise<string[]> {
  const { item } = await loadItem(kind, id);
  return item ? preparationFor(locale, item) : [];
}
