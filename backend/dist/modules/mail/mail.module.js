"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailModule = exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const resend_1 = require("resend");
const nodemailer = __importStar(require("nodemailer"));
let MailService = class MailService {
    constructor(events) {
        this.events = events;
        this.logger = new common_1.Logger('MailService');
        this.resend = null;
        if (process.env.RESEND_API_KEY) {
            this.resend = new resend_1.Resend(process.env.RESEND_API_KEY);
        }
    }
    get fromAddress() {
        return process.env.MAIL_FROM || 'نَبْض <no-reply@nabd.plus>';
    }
    sesConfigured() {
        return !!(process.env.SES_SMTP_HOST && process.env.SES_SMTP_USER && process.env.SES_SMTP_PASS);
    }
    async sendViaResend(to, subject, html, text) {
        if (!this.resend)
            throw new Error('resend_not_configured');
        const { error } = await this.resend.emails.send({
            from: this.fromAddress,
            to,
            subject,
            html,
            ...(text ? { text } : {}),
        });
        if (error)
            throw new Error(error.message || 'resend_error');
    }
    async sendViaSes(to, subject, html, text) {
        if (!this.sesConfigured())
            throw new Error('ses_not_configured');
        const transporter = nodemailer.createTransport({
            host: process.env.SES_SMTP_HOST,
            port: parseInt(process.env.SES_SMTP_PORT || '587', 10),
            secure: process.env.SES_SMTP_PORT === '465',
            auth: { user: process.env.SES_SMTP_USER, pass: process.env.SES_SMTP_PASS },
        });
        await transporter.sendMail({
            from: process.env.SES_FROM || this.fromAddress,
            to,
            subject,
            html,
            ...(text ? { text } : {}),
        });
    }
    async send(to, subject, html, text) {
        return this.sendWithAttachment({ to, subject, html, text });
    }
    async sendWithAttachment(opts) {
        const attachment = opts.filename && opts.content
            ? { filename: opts.filename, content: opts.content }
            : null;
        try {
            if (!this.resend)
                throw new Error('resend_not_configured');
            const { error } = await this.resend.emails.send({
                from: this.fromAddress,
                to: opts.to,
                subject: opts.subject,
                html: opts.html,
                ...(opts.text ? { text: opts.text } : {}),
                ...(attachment ? { attachments: [{ filename: attachment.filename, content: Buffer.from(attachment.content, 'utf-8').toString('base64') }] } : {}),
            });
            if (error)
                throw new Error(error.message || 'resend_error');
            this.events.emit('mail.sent', { to: opts.to, subject: opts.subject, provider: 'resend', fallback_used: false });
            return { ok: true, provider: 'resend', fallback_used: false };
        }
        catch (e) {
            if (!this.sesConfigured()) {
                this.logger.error(`No mail provider delivered to ${opts.to}: ${e.message}`);
                this.events.emit('mail.failed', { to: opts.to, subject: opts.subject, error: e.message });
                return { ok: false, provider: 'none', fallback_used: false, error: e.message };
            }
            this.logger.warn(`Resend failed for ${opts.to}: ${e.message} — attempting SES fallback`);
        }
        try {
            await this.sendViaSesWithAttachment(opts, attachment);
            this.logger.log(`SES fallback delivered mail to ${opts.to}`);
            this.events.emit('mail.sent', { to: opts.to, subject: opts.subject, provider: 'ses', fallback_used: true });
            return { ok: true, provider: 'ses', fallback_used: true };
        }
        catch (e2) {
            this.logger.error(`Both mail providers failed for ${opts.to}: ${e2.message}`);
            this.events.emit('mail.failed', { to: opts.to, subject: opts.subject, error: e2.message });
            return { ok: false, provider: 'none', fallback_used: true, error: e2.message };
        }
    }
    async sendViaSesWithAttachment(opts, attachment) {
        if (!this.sesConfigured())
            throw new Error('ses_not_configured');
        const transporter = nodemailer.createTransport({
            host: process.env.SES_SMTP_HOST,
            port: parseInt(process.env.SES_SMTP_PORT || '587', 10),
            secure: process.env.SES_SMTP_PORT === '465',
            auth: { user: process.env.SES_SMTP_USER, pass: process.env.SES_SMTP_PASS },
        });
        await transporter.sendMail({
            from: process.env.SES_FROM || this.fromAddress,
            to: opts.to,
            subject: opts.subject,
            html: opts.html,
            ...(opts.text ? { text: opts.text } : {}),
            ...(attachment ? { attachments: [{ filename: attachment.filename, content: Buffer.from(attachment.content, 'utf-8') }] } : {}),
        });
    }
    async sendOtp(to, code) {
        const html = `
      <div style="direction: rtl; font-family: system-ui, sans-serif; padding: 30px; text-align: right; background-color: #ffffff; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px;">منظومة نَبْض الطبية</h2>
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">رمز التحقق (OTP) الخاص بك هو:</p>
        <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 20px; font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 6px; color: #0284c7; margin: 25px 0;">
          ${code}
        </div>
        <p style="color: #64748b; font-size: 14px;">ينتهي مفعول هذا الرمز تلقائياً خلال 10 دقائق. يرجى عدم مشاركته مع أي شخص.</p>
      </div>`;
        return this.send(to, 'رمز التحقق — نَبْض', html, `رمز التحقق الخاص بك: ${code}`);
    }
};
exports.MailService = MailService;
exports.MailService = MailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2])
], MailService);
let MailModule = class MailModule {
};
exports.MailModule = MailModule;
exports.MailModule = MailModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [MailService],
        exports: [MailService],
    })
], MailModule);
//# sourceMappingURL=mail.module.js.map