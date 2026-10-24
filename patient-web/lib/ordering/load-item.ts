import { extractLabService, parseLabServiceId } from "@/lib/api/labs";
import { getPublicLabPackage, getPublicLabService } from "@/lib/api/labs-server";
import { extractNursingCatalog } from "@/lib/api/nursing-catalog";
import { getPublicNursingCatalog } from "@/lib/api/nursing-catalog-server";
import { parseRadiologyService, parseRadiologyServiceId } from "@/lib/api/radiology";
import { getPublicRadiologyServiceDetail } from "@/lib/api/radiology-server";
import { fromLab, fromNursing, fromRadiology, type ItemView } from "./item";

/** One catalogue item by id from the public catalogue reads (item page, medical-order names). */
export async function loadItem(kind: "lab" | "radiology" | "nursing", id: string): Promise<{ item: ItemView | null; failed: boolean }> {
  try {
    if (kind === "radiology") {
      if (!parseRadiologyServiceId(id).success) return { item: null, failed: false };
      const res = await getPublicRadiologyServiceDetail(id);
      if (res.status === 404) return { item: null, failed: false };
      if (!res.ok) return { item: null, failed: true };
      const body = (await res.json().catch(() => null)) as { data?: unknown } | null;
      const parsed = parseRadiologyService(body && typeof body === "object" && "data" in body ? body.data : body);
      return { item: parsed ? fromRadiology(parsed) : null, failed: !parsed };
    }
    if (kind === "nursing") {
      const res = await getPublicNursingCatalog();
      if (!res || !res.ok) return { item: null, failed: true };
      const found = extractNursingCatalog(await res.json().catch(() => null)).find((s) => s.id === id);
      return { item: found ? fromNursing(found) : null, failed: false };
    }
    if (!parseLabServiceId(id).success) return { item: null, failed: false };
    let res = await getPublicLabService(id);
    if (res && res.status === 404) res = await getPublicLabPackage(id);
    if (!res) return { item: null, failed: true };
    if (res.status === 404) return { item: null, failed: false };
    if (!res.ok) return { item: null, failed: true };
    const parsed = extractLabService(await res.json().catch(() => null));
    return { item: parsed ? fromLab(parsed) : null, failed: !parsed };
  } catch {
    return { item: null, failed: true };
  }
}
