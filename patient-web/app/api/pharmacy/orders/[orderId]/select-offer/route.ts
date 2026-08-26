import { z } from "zod";
import { guard, json, selectOffer } from "@/lib/api/pharmacy-flow";

const schema = z.object({ pharmacy_account_id: z.string().min(4).max(80) });

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const g = await guard(request, schema);
  if ("error" in g) return g.error;
  const { orderId } = await context.params;
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(orderId)) return json({ message: "invalid_order_id" }, 400);
  const r = await selectOffer(g.token, orderId, g.body.pharmacy_account_id);
  return json(r.data, r.status);
}
