import { z } from "zod";

const methodSchema = z.enum(["card", "apple-pay", "google-pay"]);
const capabilitySchema = z.object({
  bookingId: z.string().uuid(),
  amount: z.number().finite().positive(),
  currency: z.string().trim().min(3).max(8),
  methods: z.array(z.object({ id: methodSchema, kind: z.literal("online") })),
});

export type PatientPharmacyPaymentCapabilities = z.infer<typeof capabilitySchema>;
export type PatientPharmacyOnlineMethod = z.infer<typeof methodSchema>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function parsePatientPharmacyPaymentCapabilities(value: unknown): PatientPharmacyPaymentCapabilities | null {
  const root = asRecord(value);
  const source = asRecord(root?.data) ?? root;
  if (!source) return null;
  const methods = Array.isArray(source.methods) ? source.methods.map((method) => {
    const item = asRecord(method);
    return { id: item?.id, kind: item?.kind };
  }) : [];
  const bookingId = typeof source.booking_id === "string" ? source.booking_id : source.bookingId;
  const quote = asRecord(source.accepted_quote);
  const amount = typeof source.amount === "number" ? source.amount : quote?.amount;
  const currency = typeof source.currency === "string" ? source.currency : quote?.currency;
  const parsed = capabilitySchema.safeParse({ bookingId, amount, currency, methods });
  return parsed.success ? parsed.data : null;
}

export function isTrustedCheckoutUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}
