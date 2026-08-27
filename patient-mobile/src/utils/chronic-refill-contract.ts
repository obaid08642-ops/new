export type RefillTrackingParams = { orderId: string };

/** Accept only a server-created pharmacy order before opening its tracking route. */
export function refillTrackingParams(response: unknown): RefillTrackingParams | null {
  if (!response || typeof response !== 'object' || Array.isArray(response)) return null;
  const result = response as { ok?: unknown; order_id?: unknown };
  if (result.ok !== true || typeof result.order_id !== 'string' || !result.order_id.trim()) return null;
  return { orderId: result.order_id };
}
