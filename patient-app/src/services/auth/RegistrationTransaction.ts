export interface RegistrationPayload {
  fullName: string;
  phone: string;
  email: string;
  password: string;
}

const TTL_MS = 10 * 60 * 1000;
const transactions = new Map<string, { payload: RegistrationPayload; expiresAt: number }>();

function createTransactionId(): string {
  return `reg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Stores credentials in process memory only. A process restart deliberately
 * invalidates the transaction and requires the user to register again.
 */
export function createRegistrationTransaction(payload: RegistrationPayload): string {
  const transactionId = createTransactionId();
  transactions.set(transactionId, { payload, expiresAt: Date.now() + TTL_MS });
  return transactionId;
}

/** Consumes the transaction exactly once so an OTP screen cannot replay credentials. */
export function consumeRegistrationTransaction(transactionId?: string): RegistrationPayload | null {
  if (!transactionId) return null;
  const record = transactions.get(transactionId);
  transactions.delete(transactionId);
  if (!record || record.expiresAt <= Date.now()) return null;
  return record.payload;
}

export function clearRegistrationTransaction(transactionId?: string): void {
  if (transactionId) transactions.delete(transactionId);
}
