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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const mail_module_1 = require("../../mail/mail.module");
let MailProcessor = class MailProcessor {
    constructor(mail) {
        this.mail = mail;
    }
    async processOtpEmail(job) {
        const { destinationEmail, secureCode } = job.data;
        const result = await this.mail.sendOtp(destinationEmail, secureCode);
        if (!result.ok) {
            throw new Error(`Transactional delivery engine error mapping: ${result.error}`);
        }
    }
};
exports.MailProcessor = MailProcessor;
__decorate([
    (0, bull_1.Process)('send-otp-transactional'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MailProcessor.prototype, "processOtpEmail", null);
exports.MailProcessor = MailProcessor = __decorate([
    (0, bull_1.Processor)('email-queue'),
    __metadata("design:paramtypes", [mail_module_1.MailService])
], MailProcessor);
//# sourceMappingURL=mail.processor.js.map