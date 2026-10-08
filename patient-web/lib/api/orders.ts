import { z } from "zod";

const orderIdSchema = z.string().uuid();

export type PatientOrderSummary = { id: string; status?: string; reference?: string; createdAt?: string; itemCount?: number; total?: number; currency?: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringField(record: Record<string, unknown>, fields: string[]) {
  for (const field of fields) if (typeof record[field] === "string" && record[field].trim()) return record[field] as string;
  return undefined;
}

export function parseOrderId(value: string) { return orderIdSchema.safeParse(value); }

export function extractOrderRows(payload: unknown): PatientOrderSummary[] {
  const root = asRecord(payload);
  const candidate = Array.isArray(payload) ? payload : [root?.data, root?.orders, root?.items].find(Array.isArray);
  if (!Array.isArray(candidate)) return [];
  return candidate.flatMap((value) => {
    const record = asRecord(value);
    if (!record) return [];
    const id = stringField(record, ["id", "orderId", "uuid"]);
    if (!id) return [];
    const items = Array.isArray(record.items) ? record.items : [];
    const totals = asRecord(record.totals);
    const rawTotal = totals?.total ?? record.total ?? record.total_price;
    const total = typeof rawTotal === "number" && Number.isFinite(rawTotal) ? rawTotal : undefined;
    const createdAt = stringField(record, ["createdAt", "created_at", "updatedAt", "updated_at"]);
    const currency = stringField(totals ?? {}, ["currency"]) ?? stringField(record, ["currency"]);
    return [{ id, status: stringField(record, ["effective_status", "status", "state"]), reference: stringField(record, ["orderNumber", "reference", "code"]), createdAt, itemCount: items.length || undefined, total, currency }];
  });
}

export type PatientOrderTracking = { status?: string; pharmacyName?: string; deliveryMode?: string; etaMinutes?: number; total?: number; currency?: string; updatedAt?: string; courier?: PatientCourierInfo; slot?: PatientDeliverySlot };

export type PatientCourierInfo = { name?: string; phoneMasked?: string; lat?: number; lng?: number };

export type PatientDeliverySlot = { label?: string; start?: string; end?: string };

function numberField(record: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

/** P22: mask all but the last two digits of a courier phone (privacy). */
export function maskCourierPhone(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 2) return undefined;
  return `••• ••${digits.slice(-2)}`;
}

function extractCourier(record: Record<string, unknown>, delivery: Record<string, unknown> | null): PatientCourierInfo | undefined {
  const source = asRecord(record.courier) ?? asRecord(record.driver) ?? asRecord(delivery?.courier) ?? asRecord(delivery?.driver);
  if (!source) return undefined;
  const lat = numberField(source, ["lat", "latitude"]);
  const lng = numberField(source, ["lng", "lon", "longitude"]);
  const courier: PatientCourierInfo = {
    name: stringField(source, ["name", "courier_name", "driver_name"]),
    phoneMasked: maskCourierPhone(source.phone ?? source.phone_number ?? source.mobile),
    lat: lat !== undefined && lat >= -90 && lat <= 90 ? lat : undefined,
    lng: lng !== undefined && lng >= -180 && lng <= 180 ? lng : undefined,
  };
  return courier.name || courier.phoneMasked || courier.lat !== undefined ? courier : undefined;
}

function extractDeliverySlot(record: Record<string, unknown>, delivery: Record<string, unknown> | null): PatientDeliverySlot | undefined {
  const source = asRecord(record.delivery_slot) ?? asRecord(record.deliverySlot) ?? asRecord(record.slot) ?? asRecord(delivery?.slot);
  if (!source) return undefined;
  const slot: PatientDeliverySlot = {
    label: stringField(source, ["label", "name", "window"]),
    start: stringField(source, ["start", "start_at", "from", "window_start"]),
    end: stringField(source, ["end", "end_at", "to", "window_end"]),
  };
  return slot.label || slot.start || slot.end ? slot : undefined;
}

export function extractOrderTracking(payload: unknown): PatientOrderTracking | null {
  const root = asRecord(payload);
  const record = asRecord(root?.data) ?? root;
  if (!record) return null;
  const delivery = asRecord(record.delivery);
  const rawEta = delivery?.eta_minutes ?? delivery?.etaMinutes;
  const rawTotal = record.total ?? asRecord(record.totals)?.total;
  const etaMinutes = typeof rawEta === "number" && Number.isFinite(rawEta) ? rawEta : undefined;
  const total = typeof rawTotal === "number" && Number.isFinite(rawTotal) ? rawTotal : undefined;
  return {
    status: stringField(record, ["state", "effective_status", "status"]),
    pharmacyName: stringField(record, ["pharmacy_name", "pharmacyName"]),
    deliveryMode: stringField(record, ["delivery_mode", "deliveryMode"]),
    etaMinutes,
    total,
    currency: stringField(record, ["currency"]) ?? stringField(asRecord(record.totals) ?? {}, ["currency"]),
    updatedAt: stringField(record, ["updated_at", "updatedAt"]),
    courier: extractCourier(record, delivery),
    slot: extractDeliverySlot(record, delivery),
  };
}

export function extractOrderDetail(payload: unknown): Record<string, unknown> | null {
  const root = asRecord(payload);
  return asRecord(root?.data) ?? root;
}
