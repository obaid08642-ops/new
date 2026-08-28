"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var SmsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const axios_1 = __importDefault(require("axios"));
let SmsService = SmsService_1 = class SmsService {
    constructor(conn) {
        this.conn = conn;
        this.logger = new common_1.Logger(SmsService_1.name);
    }
    get flags() { return this.conn.collection('featureflags'); }
    async isEnabled() {
        try {
            const flag = await this.flags.findOne({ key: 'sms_enabled' });
            if (flag)
                return !!flag.enabled;
        }
        catch { }
        return process.env.SMS_ENABLED === 'true';
    }
    async sendOtp(phone, otp) {
        if (!(await this.isEnabled())) {
            this.logger.log('SMS delivery is disabled; no SMS message was sent.');
            return false;
        }
        if (!process.env.UNIFONIC_APP_ID && !process.env.TAQNYAT_API_KEY && !process.env.INFOBIP_API_KEY) {
            this.logger.warn('SMS provider is not configured; delivery failed closed.');
            return false;
        }
        try {
            if (process.env.TAQNYAT_API_KEY) {
                const res = await axios_1.default.post('https://api.taqnyat.sa/v1/messages', {
                    recipients: [phone],
                    body: `Your Nabdah Plus OTP is: ${otp}`,
                    sender: 'Nabdah'
                }, {
                    headers: { Authorization: `Bearer ${process.env.TAQNYAT_API_KEY}` }
                });
                return res.status === 200 || res.status === 201;
            }
            return false;
        }
        catch (e) {
            this.logger.error('SMS delivery failed.', e instanceof Error ? e.stack : undefined);
            return false;
        }
    }
};
exports.SmsService = SmsService;
exports.SmsService = SmsService = SmsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], SmsService);
//# sourceMappingURL=sms.service.js.map