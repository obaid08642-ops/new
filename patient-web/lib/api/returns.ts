/** The patient's return requests as GET /pharmacy/returns sends them (a list, or one under `data`, `returns` or `items`). */
export type ReturnRequest = { id: string; status: string; amount?: number; reason?: string; createdAt?: string };

export function extractReturns(payload: unknown): ReturnRequest[] {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null;
  const values = Array.isArray(payload) ? payload : [root?.data, root?.returns, root?.items].find(Array.isArray);
  if (!Array.isArray(values)) return [];
  return values.flatMap((value) => {
    const r = value && typeof value === "object" ? value as Record<string, unknown> : null;
    if (!r || !r.id) return [];
    return [{
      id: String(r.id),
      status: String(r.status ?? r.state ?? "processing"),
      amount: Number(r.refund_amount ?? r.amount ?? NaN) || undefined,
      reason: typeof r.reason === "string" ? r.reason : undefined,
      createdAt: typeof r.createdAt === "string" ? r.createdAt : undefined,
    }];
  });
}
