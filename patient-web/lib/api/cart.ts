import { z } from "zod";

const lineIdSchema = z.string().min(1).max(200);

export type PatientCartLine = { lineId: string; kind: string; serviceId: string; name?: string; quantity?: number; price?: number; paymentMethod?: string; homeVisit?: boolean };
export type PatientCartSummary = { groups: Array<{ kind: string; count?: number; subtotal?: number; items: PatientCartLine[] }>; subtotal?: number; homeVisitFee?: number; total?: number; currency?: string };

function record(value: unknown): Record<string, unknown> | null { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function stringField(value: Record<string, unknown>, names: string[]) { for (const name of names) if (typeof value[name] === "string" && value[name].trim()) return value[name] as string; return undefined; }
function numberField(value: Record<string, unknown>, names: string[]) { for (const name of names) if (typeof value[name] === "number" && Number.isFinite(value[name])) return value[name] as number; return undefined; }

export function parseCartLineId(value: string) { return lineIdSchema.safeParse(value); }

export function extractCartSummary(payload: unknown): PatientCartSummary | null {
  const root = record(payload);
  const groupsValue = root?.groups;
  if (!Array.isArray(groupsValue)) return { groups: [], subtotal: numberField(root ?? {}, ["subtotal"]), homeVisitFee: numberField(root ?? {}, ["home_visit_fee", "homeVisitFee"]), total: numberField(root ?? {}, ["total"]), currency: stringField(root ?? {}, ["currency"]) };
  const groups = groupsValue.flatMap((groupValue) => {
    const group = record(groupValue);
    if (!group || typeof group.kind !== "string") return [];
    const items = Array.isArray(group.items) ? group.items.flatMap((itemValue) => {
      const item = record(itemValue);
      if (!item) return [];
      const lineId = stringField(item, ["line_id", "lineId"]);
      const serviceId = stringField(item, ["service_id", "serviceId"]);
      if (!lineId || !serviceId) return [];
      return [{ lineId, serviceId, kind: group.kind as string, name: stringField(item, ["name_ar", "name_en"]), quantity: numberField(item, ["qty", "quantity"]), price: numberField(item, ["price"]), paymentMethod: stringField(item, ["payment_method", "paymentMethod"]), homeVisit: item.home_visit === true } satisfies PatientCartLine];
    }) : [];
    return [{ kind: group.kind as string, count: numberField(group, ["count"]), subtotal: numberField(group, ["subtotal"]), items }];
  });
  return { groups, subtotal: numberField(root ?? {}, ["subtotal"]), homeVisitFee: numberField(root ?? {}, ["home_visit_fee", "homeVisitFee"]), total: numberField(root ?? {}, ["total"]), currency: stringField(root ?? {}, ["currency"]) };
}
