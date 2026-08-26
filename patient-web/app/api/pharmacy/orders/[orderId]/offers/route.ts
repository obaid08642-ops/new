import { getOffers, guard, json } from "@/lib/api/pharmacy-flow";

export async function GET(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const g = await guard(request, null);
  if ("error" in g) return g.error;
  const { orderId } = await context.params;
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(orderId)) return json({ message: "invalid_order_id" }, 400);
  const r = await getOffers(g.token, orderId);
  return json(r.data, r.status);
}
