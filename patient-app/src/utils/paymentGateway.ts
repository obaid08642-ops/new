/**
 * The payment service refuses cleanly when the server has no gateway set up (503 payment_gateway_not_configured) or no
 * https return address (503 payment_return_url_not_configured). Screens show a translated sentence for these instead of
 * the server's raw text.
 */
const GATEWAY_DOWN = /payment_gateway_not_configured|payment_return_url_not_configured|payment_gateway_unavailable/i;

/** The translation key to show when the payment service is not set up; null for any other failure. */
export function gatewayDownKey(error: unknown): string | null {
  const raw = typeof error === 'string' ? error : error instanceof Error ? error.message : (error as { message?: unknown } | null)?.message;
  return typeof raw === 'string' && GATEWAY_DOWN.test(raw) ? 'pharmacy.pay.err.gateway' : null;
}
