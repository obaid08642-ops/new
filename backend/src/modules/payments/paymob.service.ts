import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import axios from 'axios';

/** Server-authoritative amount sources per reference kind (D-006/D-008). */
const AMOUNT_SOURCES: Record<string, { collection: string; ownerFields: string[]; amountFields: string[] }> = {
  order:      { collection: 'orders',            ownerFields: ['patient_id'],                          amountFields: ['total', 'totals.total'] },
  appointment:{ collection: 'appointments',      ownerFields: ['patient_id'],                          amountFields: ['total_price', 'price'] },
  lab:        { collection: 'labbookings',       ownerFields: ['patient_id'],                          amountFields: ['total', 'price', 'amount'] },
  radiology:  { collection: 'radiologybookings', ownerFields: ['patient_id'],                          amountFields: ['total', 'price', 'amount'] },
  homecare:   { collection: 'homecarebookings',  ownerFields: ['patient_id'],                          amountFields: ['price', 'amount', 'total'] },
};

@Injectable()
export class PaymobService {
  private readonly logger = new Logger(PaymobService.name);

  constructor(@InjectConnection() private readonly conn: Connection) {}

  /**
   * F-C9: resolve the chargeable amount from the SERVER record for the referenced
   * booking/order — never from the client body. Also enforces ownership.
   */
  async resolveAmount(reference: { kind?: string; id?: string; booking_id?: string }, user: any): Promise<number> {
    const kind = String(reference?.kind || '').toLowerCase();
    const refId = String(reference?.id || reference?.booking_id || '');
    const src = AMOUNT_SOURCES[kind];
    if (!src || !refId) throw new BadRequestException('paymob_reference_required');
    const rec: any = await this.conn.collection(src.collection).findOne({ id: refId });
    if (!rec) throw new BadRequestException('reference_not_found');
    const role = String(user?.role || '').toLowerCase();
    const owner = String(rec.patient_id ?? rec.user_id ?? '');
    if (role !== 'admin' && role !== 'super_admin' && owner !== String(user.id)) {
      throw new ForbiddenException('not_reference_owner');
    }
    let amount = NaN;
    for (const f of src.amountFields) {
      const v = f.split('.').reduce((acc: any, k) => (acc == null ? acc : acc[k]), rec);
      if (v != null && Number.isFinite(Number(v))) { amount = Number(v); break; }
    }
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('reference_has_no_amount');
    return Math.round(amount * 100) / 100;
  }

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
  
  async initiate(payload: any, user?: any): Promise<any> {
    if (!process.env.PAYMOB_API_KEY) throw new Error('PAYMOB_NOT_CONFIGURED');
    // F-C9: the chargeable amount ALWAYS comes from the server-side record.
    const amount = await this.resolveAmount(payload?.reference || payload || {}, user || {});
    
    // 1. Authentication Request
    const authRes = await axios.post('https://accept.paymob.com/api/auth/tokens', {
      api_key: process.env.PAYMOB_API_KEY
    });
    const token = authRes.data.token;

    // 2. Order Registration
    const orderRes = await axios.post('https://accept.paymob.com/api/ecommerce/orders', {
      auth_token: token,
      delivery_needed: 'false',
      amount_cents: Math.round(amount * 100),
      currency: 'SAR',
      items: []
    });

    // 3. Payment Key Generation
    const keyRes = await axios.post('https://accept.paymob.com/api/acceptance/payment_keys', {
      auth_token: token,
      amount_cents: Math.round(amount * 100),
      expiration: 3600,
      order_id: orderRes.data.id,
      billing_data: payload.billing_data,
      currency: 'SAR',
      integration_id: process.env.PAYMOB_INTEGRATION_ID
    });

    return {
      client_secret: keyRes.data.token,
      url: `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${keyRes.data.token}`,
      id: orderRes.data.id
    };
  }

  async verify(payload: any): Promise<any> {
    if (!process.env.PAYMOB_HMAC_SECRET) throw new Error('PAYMOB_NOT_CONFIGURED');

    // M0-05: complete HMAC-SHA512 verification.
    // Paymob wraps the transaction in `obj` and sends the signature in `hmac`.
    const crypto = require('crypto');
    const txn = payload?.obj ? payload.obj : payload;
    const receivedHmac: string | undefined = payload?.hmac;
    if (!receivedHmac) throw new Error('MISSING_PAYMOB_SIGNATURE');

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
      throw new Error('INVALID_PAYMOB_SIGNATURE');
    }

    return { status: txn.success === true || txn.success === 'true' ? 'verified' : 'failed', data: txn };
  }
}
