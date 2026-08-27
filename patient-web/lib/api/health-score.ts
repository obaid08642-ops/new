import { z } from "zod";

const componentSchema = z.object({ key: z.string().min(1).max(64), score: z.number().finite().min(0).max(100) }).passthrough();
const scoreSchema = z.object({ score: z.number().finite().min(0).max(100).nullable(), status: z.string().min(1).max(64), components: z.array(componentSchema).max(32).optional() }).passthrough();
export type HealthScore = { score: number | null; status: string; components: Array<{ key: string; score: number }> };
export function parseHealthScore(payload: unknown): HealthScore | null {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null;
  const parsed = scoreSchema.safeParse(root?.data ?? root);
  if (!parsed.success) return null;
  return { score: parsed.data.score, status: parsed.data.status, components: (parsed.data.components ?? []).map(({ key, score }) => ({ key, score })) };
}
