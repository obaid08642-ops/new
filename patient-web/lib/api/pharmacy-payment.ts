// No validation library: payment-actions.tsx (a client component) imports this, and a schema library would put its
// whole runtime into the browser bundle (QUALITY_STANDARDS §2, JS budget).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const METHODS = ["card", "apple-pay", "google-pay"] as const;

export type PatientPharmacyOnlineMethod = (typeof METHODS)[number];
export type PatientPharmacyPaymentCapabilities = {
  bookingId: string;
  amount: number;
  currency: string;
  methods: Array<{ id: PatientPharmacyOnlineMethod; kind: "online" }>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

const isMethod = (value: unknown): value is PatientPharmacyOnlineMethod => typeof value === "string" && (METHODS as readonly string[]).includes(value);

/** The server's own payment capabilities: valid order id, a positive finite amount, a currency and only known online methods. */
export function parsePatientPharmacyPaymentCapabilities(value: unknown): PatientPharmacyPaymentCapabilities | null {
  const root = asRecord(value);
  const source = asRecord(root?.data) ?? root;
  if (!source) return null;
  const rawMethods = Array.isArray(source.methods) ? source.methods.map((method) => asRecord(method)) : [];
  const bookingId = typeof source.booking_id === "string" ? source.booking_id : source.bookingId;
  const quote = asRecord(source.accepted_quote);
  const amount = typeof source.amount === "number" ? source.amount : quote?.amount;
  const currency = typeof source.currency === "string" ? source.currency : quote?.currency;
  if (typeof bookingId !== "string" || !UUID.test(bookingId)) return null;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return null;
  if (typeof currency !== "string") return null;
  const code = currency.trim();
  if (code.length < 3 || code.length > 8) return null;
  const methods: PatientPharmacyPaymentCapabilities["methods"] = [];
  for (const method of rawMethods) {
    if (!method || !isMethod(method.id) || method.kind !== "online") return null;
    methods.push({ id: method.id, kind: "online" });
  }
  return { bookingId, amount, currency: code, methods };
}

export function isTrustedCheckoutUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

/** The transaction a payment intent answer names (a uuid), or nothing: the result screen asks the backend about it later. */
export function transactionIdOf(value: unknown): string | undefined {
  const root = asRecord(value);
  const source = asRecord(root?.data) ?? root;
  if (!source) return undefined;
  const transaction = [source.transaction_id, source.transactionId, source.id].find((candidate) => typeof candidate === "string" && candidate.trim());
  return typeof transaction === "string" && UUID.test(transaction) ? transaction : undefined;
}

/** The secure checkout address of a payment intent answer, only when the answer names its transaction (a uuid); nothing else is read. */
export function checkoutUrlOf(value: unknown): string | undefined {
  const root = asRecord(value);
  const source = asRecord(root?.data) ?? root;
  if (!source || !transactionIdOf(value)) return undefined;
  for (const key of ["checkout_url", "checkoutUrl", "url"]) {
    const candidate = source[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }
  return undefined;
}
