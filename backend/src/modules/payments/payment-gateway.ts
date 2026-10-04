import { ServiceUnavailableException } from '@nestjs/common';

/**
 * F60 (plan item): one PaymentGateway contract, adapter chosen by
 * `PAYMENT_PROVIDER`, sandbox first.
 *
 * The audit complaint behind this item was that the gateway was scattered: the
 * adapter was picked by *whichever API key happened to be present*
 * (STRIPE_SECRET_KEY > TAP_API_KEY > MOYASAR_API_KEY), so a deployment carrying
 * two keys silently charged through the wrong processor, and nothing in the
 * configuration said which one was meant. `PAYMENT_PROVIDER` makes the choice
 * explicit and lets an operator switch processors by configuration alone.
 *
 * Q104: Moyasar is the only processor (the Stripe and Tap adapters were
 * removed: no client could complete their flows). Any other PAYMENT_PROVIDER
 * value fails loudly instead of pretending.
 */
/** `disabled` is the fail-closed state, not a real processor. */
export type PaymentProvider = 'moyasar' | 'disabled';

export interface CreateIntentRequest {
  amount: number;
  currency: string;
  description: string;
  metadata: Record<string, unknown>;
}

export interface CreateIntentResult {
  intent_id: string;
  client_secret?: string;
  checkout_url?: string;
}

export interface VerifyResult {
  status: 'paid' | 'pending' | 'failed' | 'cancelled';
  charge_id?: string;
  raw?: unknown;
}

export interface RefundOutcome {
  refunded: boolean;
  raw?: unknown;
}

/** Every processor implements this and nothing more. */
export interface PaymentGateway {
  readonly name: PaymentProvider;
  createIntent(req: CreateIntentRequest): Promise<CreateIntentResult>;
  verify(intentId: string): Promise<VerifyResult>;
  refund(chargeId: string, amount?: number): Promise<RefundOutcome>;
}

/**
 * Fail-closed adapter for a deployment with no processor configured. The app
 * still boots; every gateway call answers 503 payment_gateway_not_configured
 * instead of crashing the process or silently reporting success.
 */
export class DisabledGatewayAdapter implements PaymentGateway {
  readonly name = 'disabled' as PaymentProvider;
  private fail(): never {
    throw new ServiceUnavailableException('payment_gateway_not_configured');
  }
  async createIntent(): Promise<CreateIntentResult> { return this.fail(); }
  async verify(): Promise<VerifyResult> { return this.fail(); }
  async refund(): Promise<RefundOutcome> { return this.fail(); }
}

/** The key each provider needs before it can be selected. */
// Q104: one payment system (owner decision 2026-10-04) — Moyasar only.
const REQUIRED_KEY: Partial<Record<PaymentProvider, string>> = {
  moyasar: 'MOYASAR_API_KEY',
};

export function isProviderConfigured(provider: PaymentProvider): boolean {
  const key = REQUIRED_KEY[provider];
  return !!key && !!process.env[key];
}

/**
 * Resolve the active adapter. PAYMENT_PROVIDER decides; it no longer depends on
 * key presence order. With PAYMENT_PROVIDER unset the previous behaviour is
 * preserved (first configured provider wins) so existing deployments keep
 * working until they set the variable explicitly.
 */
export function selectGateway(
  factories: Partial<Record<PaymentProvider, () => PaymentGateway>>,
): PaymentGateway {
  const requested = (process.env.PAYMENT_PROVIDER || '').trim().toLowerCase();

  if (requested) {
    if (!REQUIRED_KEY[requested as PaymentProvider]) {
      throw new ServiceUnavailableException(
        `payment_provider_unknown: PAYMENT_PROVIDER="${requested}" is not one of ${Object.keys(REQUIRED_KEY).join(', ')}`,
      );
    }
    if (!isProviderConfigured(requested as PaymentProvider)) {
      // An explicit request that cannot be honoured is a configuration error,
      // never a silent fallback to some other processor.
      throw new ServiceUnavailableException(
        `payment_gateway_not_configured: PAYMENT_PROVIDER="${requested}" requires ${REQUIRED_KEY[requested as PaymentProvider]}`,
      );
    }
    const factory = factories[requested as PaymentProvider];
    if (!factory) {
      throw new ServiceUnavailableException(
        `payment_provider_not_implemented: "${requested}" is configured (${REQUIRED_KEY[requested as PaymentProvider]} is set) but has no adapter`,
      );
    }
    return factory();
  }

  for (const provider of Object.keys(REQUIRED_KEY) as PaymentProvider[]) {
    if (isProviderConfigured(provider)) {
      const factory = factories[provider];
      if (factory) return factory();
    }
  }
  return new DisabledGatewayAdapter();
}
