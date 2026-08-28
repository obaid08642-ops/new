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
exports.ProviderMailerService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = __importStar(require("nodemailer"));
class DisabledAdapter {
    async send(_msg) {
        return { status: 'failed', error: 'mail_delivery_unavailable' };
    }
}
class ResendAdapter {
    constructor(apiKey, from) {
        this.apiKey = apiKey;
        this.from = from;
        this.logger = new common_1.Logger('Mailer:Resend');
    }
    async send(msg) {
        try {
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ from: this.from, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html, tags: msg.tag ? [{ name: 'tag', value: msg.tag }] : undefined }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                this.logger.error(`Resend failed: ${res.status} ${JSON.stringify(json)}`);
                return { status: 'failed', error: json?.message || res.statusText };
            }
            return { status: 'sent', id: json?.id };
        }
        catch (e) {
            this.logger.error('Resend exception: ' + e.message);
            return { status: 'failed', error: e.message };
        }
    }
}
class NodemailerAdapter {
    constructor(host, port, user, pass, from) {
        this.host = host;
        this.port = port;
        this.user = user;
        this.pass = pass;
        this.from = from;
        this.logger = new common_1.Logger('Mailer:Nodemailer');
        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
        });
    }
    async send(msg) {
        try {
            const info = await this.transporter.sendMail({
                from: this.from,
                to: msg.to,
                subject: msg.subject,
                text: msg.text,
                html: msg.html || `<p>${msg.text}</p>`,
            });
            return { status: 'sent', id: info.messageId };
        }
        catch (e) {
            this.logger.error('Nodemailer SMTP failed: ' + e.message);
            return { status: 'failed', error: e.message };
        }
    }
}
let ProviderMailerService = class ProviderMailerService {
    constructor() {
        this.logger = new common_1.Logger('Mailer');
        const key = process.env.RESEND_API_KEY;
        const from = process.env.PROVIDER_MAIL_FROM || 'noreply@nabd.app';
        const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
        const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        if (key && key.trim().length > 0) {
            this.adapter = new ResendAdapter(key, from);
            this.logger.log(`Initialised Resend adapter (from=${from})`);
        }
        else if (smtpUser && smtpPass && smtpUser.trim().length > 0) {
            const mailFrom = process.env.PROVIDER_MAIL_FROM || smtpUser;
            this.adapter = new NodemailerAdapter(smtpHost, smtpPort, smtpUser, smtpPass, mailFrom);
            this.logger.log(`Initialised Nodemailer SMTP adapter (host=${smtpHost}, port=${smtpPort}, from=${mailFrom})`);
        }
        else {
            this.adapter = new DisabledAdapter();
            this.logger.warn('Provider mail delivery is disabled because no delivery credentials are configured.');
        }
    }
    send(msg) { return this.adapter.send(msg); }
};
exports.ProviderMailerService = ProviderMailerService;
exports.ProviderMailerService = ProviderMailerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], ProviderMailerService);
//# sourceMappingURL=provider-mailer.service.js.map