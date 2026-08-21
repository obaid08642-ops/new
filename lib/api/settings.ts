import { z } from "zod";

const privacySchema = z.object({ profile_visible: z.boolean().optional(), share_data: z.boolean().optional() }).passthrough();
const securitySchema = z.object({ biometric: z.boolean().optional(), two_factor: z.boolean().optional() }).passthrough();
const storageItemSchema = z.object({ label: z.string().max(120), val: z.string().max(80), pct: z.number().min(0).max(100) }).passthrough();
const storageSchema = z.object({ used: z.string().max(80).optional(), total: z.string().max(80).optional(), items: z.array(storageItemSchema).max(20).optional() }).passthrough();

function record(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const root = payload as Record<string, unknown>;
  return root.data && typeof root.data === "object" && !Array.isArray(root.data) ? root.data as Record<string, unknown> : root;
}

export type PrivacySettings = { profileVisible?: boolean; shareData?: boolean };
export type SecuritySettings = { biometric?: boolean; twoFactor?: boolean };
export type StorageSummary = { used?: string; total?: string; items: { label: string; value: string; percent: number }[] };

export function parsePrivacySettings(payload: unknown): PrivacySettings {
  const parsed = privacySchema.safeParse(record(payload));
  return parsed.success ? { profileVisible: parsed.data.profile_visible, shareData: parsed.data.share_data } : {};
}

export function parseSecuritySettings(payload: unknown): SecuritySettings {
  const parsed = securitySchema.safeParse(record(payload));
  return parsed.success ? { biometric: parsed.data.biometric, twoFactor: parsed.data.two_factor } : {};
}

export function parseStorageSummary(payload: unknown): StorageSummary {
  const parsed = storageSchema.safeParse(record(payload));
  if (!parsed.success) return { items: [] };
  return { used: parsed.data.used, total: parsed.data.total, items: (parsed.data.items ?? []).map((item) => ({ label: item.label, value: item.val, percent: item.pct })) };
}
