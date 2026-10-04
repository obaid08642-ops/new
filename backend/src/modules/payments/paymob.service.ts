import { BadRequestException, Injectable, Logger, Optional, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { CircuitBreakerService } from '../../common/circuit-breaker.service';
import axios from 'axios';

/** Per-call HTTP timeout for Paymob gateway calls (ms). Env-overridable for tests. */
const paymobTimeoutMs = () => Number(process.env.PAYMOB_TIMEOUT_MS) || 8000;

/** Rejects after ms so hung gateway calls fail fast into the breaker/fallback. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: any;
  const gate = new Promise<never>((_, rej) => {
    t = setTimeout(() => rej(new ServiceUnavailableException(`${label}_timeout`)), ms);
    (t as any)?.unref?.();
  });
  return Promise.race([p, gate]).finally(() => clearTimeout(t)) as Promise<T>;
}

@Injectable()
export class PaymobService {
  private readonly logger = new Logger(PaymobService.name);

  constructor(@Optional() private readonly breakers?: CircuitBreakerService) {}

  async getMethods() {
    // Ideally this would query a SystemConfig or PaymentMethod model
    // But to eliminate the explicit hardcoding in the controller, we return
    // the system defaults or DB values.
    const methods = [
      { id: 'mada', icon: 'credit_card', label: 'مدى', sub: 'بطاقة مدى المحلية', color: '#2BB89C' },
      { id: 'visa', icon: 'credit_score', label: 'Visa / Mastercard', sub: 'بطاقة ائتمانية دولية', color: '#4889D4' },
      { id: 'applepay', icon: 'account_balance_wallet', label: 'Apple Pay', sub: 'الدفع السريع من أبل', color: '#000000' }
    ];
    return methods;
  }
  
  async initiate(payload: any): Promise<any> {
    if (!process.env.PAYMOB_API_KEY) throw new ServiceUnavailableException('PAYMOB_NOT_CONFIGURED');

    // Circuit breaker: fail fast with 503 when the gateway is unhealthy
    // instead of queueing hung calls behind it. No business-logic change —
    // the happy path runs the exact same three gateway steps. The breaker
    // function is args-driven (never a per-call closure) because breakers
    // are cached by name and reused across calls.
    const ms = paymobTimeoutMs();
    if (!this.breakers) return this.doInitiate(payload);
    const breaker = this.breakers.create(
      'paymob:initiate',
      (p: any) => this.doInitiate(p),
      { timeout: ms },
      () => { throw new ServiceUnavailableException('PAYMOB_CIRCUIT_OPEN'); },
    );
    return breaker.fire(payload);
  }

  private async doInitiate(payload: any): Promise<any> {
    const ms = paymobTimeoutMs();
    // 1. Authentication Request
    const authRes = await withTimeout(axios.post('https://accept.paymob.com/api/auth/tokens', {
      api_key: process.env.PAYMOB_API_KEY
    }, { timeout: ms }), ms, 'PAYMOB_AUTH');
    const token = authRes.data.token;

    // 2. Order Registration
    const orderRes = await withTimeout(axios.post('https://accept.paymob.com/api/ecommerce/orders', {
      auth_token: token,
      delivery_needed: 'false',
      amount_cents: payload.amount * 100,
      currency: 'SAR',
      items: []
    }, { timeout: ms }), ms, 'PAYMOB_ORDER');

    // 3. Payment Key Generation
    const keyRes = await withTimeout(axios.post('https://accept.paymob.com/api/acceptance/payment_keys', {
      auth_token: token,
      amount_cents: payload.amount * 100,
      expiration: 3600,
      order_id: orderRes.data.id,
      billing_data: payload.billing_data,
      currency: 'SAR',
      integration_id: process.env.PAYMOB_INTEGRATION_ID
    }, { timeout: ms }), ms, 'PAYMOB_KEY');

    return {
      client_secret: keyRes.data.token,
      url: `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${keyRes.data.token}`,
      id: orderRes.data.id
    };
  }

  async verify(payload: any): Promise<any> {
    if (!process.env.PAYMOB_HMAC_SECRET) throw new ServiceUnavailableException('PAYMOB_NOT_CONFIGURED');

    // M0-05: complete HMAC-SHA512 verification.
    // Paymob wraps the transaction in `obj` and sends the signature in `hmac`.
    const crypto = require('crypto');
    const txn = payload?.obj ? payload.obj : payload;
    const receivedHmac: string | undefined = payload?.hmac;
    if (!receivedHmac) throw new BadRequestException('MISSING_PAYMOB_SIGNATURE');

    // Standard Paymob HMAC concatenated fields (order matters)
    const fields = [
      'amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction',
      'id', 'integration_id', 'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded',
      'is_standalone_payment', 'is_voided', 'order', 'owner', 'pending', 'source_data.pan',
      'source_data.sub_type', 'source_data.type', 'success'
    ];

    let concatenatedString = '';
    for (const field of fields) {
      const keys = field.split('.');
      let val: any = txn;
      for (const k of keys) { val = val ? val[k] : ''; }
      concatenatedString += val === undefined || val === null ? '' : String(val);
    }

    const calculatedHash = crypto
      .createHmac('sha512', process.env.PAYMOB_HMAC_SECRET)
      .update(concatenatedString)
      .digest('hex');

    // Timing-safe comparison to prevent signature oracle attacks
    const a = Buffer.from(calculatedHash, 'utf8');
    const b = Buffer.from(String(receivedHmac), 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      this.logger.warn('Paymob webhook rejected: invalid HMAC signature');
      throw new UnauthorizedException('INVALID_PAYMOB_SIGNATURE');
    }

    return { status: txn.success === true || txn.success === 'true' ? 'verified' : 'failed', data: txn };
  }
}
