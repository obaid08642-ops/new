import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class PaymobService {
  private readonly logger = new Logger(PaymobService.name);

  constructor(@InjectModel('PharmacyOrder') private readonly pharmacyOrders: Model<any>) {}

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
  
  async initiate(user: any, payload: { order_id?: string; method?: string; billing_data?: any }): Promise<any> {
    if (!process.env.PAYMOB_API_KEY) throw new Error('PAYMOB_NOT_CONFIGURED');
    if (!payload?.order_id) throw new Error('ORDER_ID_REQUIRED');

    const order: any = await this.pharmacyOrders.findOne({
      id: payload.order_id,
      patient_account_id: user?.id,
    }).lean();
    if (!order) throw new Error('ORDER_NOT_FOUND');

    const amount = Number(order?.totals?.total);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('ORDER_NOT_PRICED');
    if (order.basket_review_status !== 'patient_approved') {
      throw new Error('ORDER_NOT_APPROVED_FOR_PAYMENT');
    }
    
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
    // Implement HMAC validation here
    // Paymob sends a concatenated string of properties hashed with HMAC SHA512
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha512', process.env.PAYMOB_HMAC_SECRET);
    
    // Standard Paymob HMAC concatenated fields
    const fields = [
      'amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction', 
      'id', 'integration_id', 'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded', 
      'is_standalone_payment', 'is_voided', 'order', 'owner', 'pending', 'source_data.pan', 
      'source_data.sub_type', 'source_data.type', 'success'
    ];
    
    let concatenatedString = '';
    fields.forEach(field => {
      const keys = field.split('.');
      let val = payload;
      keys.forEach(k => { val = val ? val[k] : '' });
      concatenatedString += val;
    });

    hmac.update(concatenatedString);
    const calculatedHash = hmac.digest('hex');

    if (calculatedHash !== payload.hmac) {
      throw new Error('INVALID_PAYMOB_SIGNATURE');
    }

    return { status: payload.success ? 'verified' : 'failed', data: payload };
  }
}
