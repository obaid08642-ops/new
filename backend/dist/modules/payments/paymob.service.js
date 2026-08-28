"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var PaymobService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymobService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
let PaymobService = PaymobService_1 = class PaymobService {
    constructor() {
        this.logger = new common_1.Logger(PaymobService_1.name);
    }
    async getMethods() {
        const methods = [
            { id: 'mada', icon: 'credit_card', label: 'مدى', sub: 'بطاقة مدى المحلية', color: '#2BB89C' },
            { id: 'visa', icon: 'credit_score', label: 'Visa / Mastercard', sub: 'بطاقة ائتمانية دولية', color: '#4889D4' },
            { id: 'applepay', icon: 'account_balance_wallet', label: 'Apple Pay', sub: 'الدفع السريع من أبل', color: '#000000' }
        ];
        return methods;
    }
    async initiate(payload) {
        if (!process.env.PAYMOB_API_KEY)
            throw new Error('PAYMOB_NOT_CONFIGURED');
        const authRes = await axios_1.default.post('https://accept.paymob.com/api/auth/tokens', {
            api_key: process.env.PAYMOB_API_KEY
        });
        const token = authRes.data.token;
        const orderRes = await axios_1.default.post('https://accept.paymob.com/api/ecommerce/orders', {
            auth_token: token,
            delivery_needed: 'false',
            amount_cents: payload.amount * 100,
            currency: 'SAR',
            items: []
        });
        const keyRes = await axios_1.default.post('https://accept.paymob.com/api/acceptance/payment_keys', {
            auth_token: token,
            amount_cents: payload.amount * 100,
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
    async verify(payload) {
        if (!process.env.PAYMOB_HMAC_SECRET)
            throw new Error('PAYMOB_NOT_CONFIGURED');
        const crypto = require('crypto');
        const txn = payload?.obj ? payload.obj : payload;
        const receivedHmac = payload?.hmac;
        if (!receivedHmac)
            throw new Error('MISSING_PAYMOB_SIGNATURE');
        const fields = [
            'amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction',
            'id', 'integration_id', 'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded',
            'is_standalone_payment', 'is_voided', 'order', 'owner', 'pending', 'source_data.pan',
            'source_data.sub_type', 'source_data.type', 'success'
        ];
        let concatenatedString = '';
        for (const field of fields) {
            const keys = field.split('.');
            let val = txn;
            for (const k of keys) {
                val = val ? val[k] : '';
            }
            concatenatedString += val === undefined || val === null ? '' : String(val);
        }
        const calculatedHash = crypto
            .createHmac('sha512', process.env.PAYMOB_HMAC_SECRET)
            .update(concatenatedString)
            .digest('hex');
        const a = Buffer.from(calculatedHash, 'utf8');
        const b = Buffer.from(String(receivedHmac), 'utf8');
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
            this.logger.warn('Paymob webhook rejected: invalid HMAC signature');
            throw new Error('INVALID_PAYMOB_SIGNATURE');
        }
        return { status: txn.success === true || txn.success === 'true' ? 'verified' : 'failed', data: txn };
    }
};
exports.PaymobService = PaymobService;
exports.PaymobService = PaymobService = PaymobService_1 = __decorate([
    (0, common_1.Injectable)()
], PaymobService);
//# sourceMappingURL=paymob.service.js.map