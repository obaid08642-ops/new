import { Money } from '../../domain/value-objects';

export interface PaymentRequest {
  orderId: string;
  userId: string;
  amount: Money;
  method: 'card' | 'cash' | 'apple-pay' | 'google-pay';
  idempotencyKey: string;
}

export interface PaymentResponse {
  transactionId: string;
  status: 'success' | 'failed' | 'pending_auth';
  authUrl?: string; // e.g. 3D Secure redirect URL
}

export interface WebhookEvent {
  provider: string;
  signature: string;
  payload: any;
}

/**
 * Interface that all external payment gateways (Stripe, PayTabs, Moyasar, etc.) MUST implement.
 * This ensures the business logic never couples directly to a specific provider's SDK.
 */
export interface PaymentProvider {
  /**
   * Initiate a payment transaction.
   */
  processPayment(request: PaymentRequest): Promise<PaymentResponse>;

  /**
   * Refund a previously successful transaction.
   */
  refundPayment(transactionId: string, amount?: Money): Promise<PaymentResponse>;

  /**
   * Verify an asynchronous webhook callback from the provider.
   */
  verifyWebhook(event: WebhookEvent): Promise<boolean>;

  /**
   * Check the final status of a pending transaction.
   */
  checkStatus(transactionId: string): Promise<PaymentResponse['status']>;
}
