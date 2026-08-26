import { createAndSendOrder, createOrderSchema, guard, json } from "@/lib/api/pharmacy-flow";

export async function POST(request: Request) {
  const g = await guard(request, createOrderSchema);
  if ("error" in g) return g.error;
  const r = await createAndSendOrder(g.token, g.body);
  return json(r.data, r.status);
}
