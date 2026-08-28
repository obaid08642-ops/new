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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingModule = exports.BillingController = exports.BillingService = exports.EInvoiceSchema = exports.EInvoice = void 0;
exports.tlvQr = tlvQr;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("@nestjs/mongoose");
const mongoose_3 = require("mongoose");
const crypto_1 = require("crypto");
const PDFDocument = __importStar(require("pdfkit"));
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const auth_guard_2 = require("../../common/auth.guard");
const mail_module_1 = require("../mail/mail.module");
const VAT_RATE = 0.15;
let EInvoice = class EInvoice {
};
exports.EInvoice = EInvoice;
__decorate([
    (0, mongoose_2.Prop)({ default: () => (0, crypto_1.randomUUID)() }),
    __metadata("design:type", String)
], EInvoice.prototype, "id", void 0);
__decorate([
    (0, mongoose_2.Prop)({ unique: true, index: true }),
    __metadata("design:type", String)
], EInvoice.prototype, "invoice_no", void 0);
__decorate([
    (0, mongoose_2.Prop)({ index: true }),
    __metadata("design:type", String)
], EInvoice.prototype, "booking_kind", void 0);
__decorate([
    (0, mongoose_2.Prop)({ index: true }),
    __metadata("design:type", String)
], EInvoice.prototype, "booking_id", void 0);
__decorate([
    (0, mongoose_2.Prop)({ index: true }),
    __metadata("design:type", String)
], EInvoice.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_2.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], EInvoice.prototype, "subtotal", void 0);
__decorate([
    (0, mongoose_2.Prop)({ default: VAT_RATE }),
    __metadata("design:type", Number)
], EInvoice.prototype, "vat_rate", void 0);
__decorate([
    (0, mongoose_2.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], EInvoice.prototype, "vat_amount", void 0);
__decorate([
    (0, mongoose_2.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], EInvoice.prototype, "total", void 0);
__decorate([
    (0, mongoose_2.Prop)({ default: 'SAR' }),
    __metadata("design:type", String)
], EInvoice.prototype, "currency", void 0);
__decorate([
    (0, mongoose_2.Prop)(),
    __metadata("design:type", String)
], EInvoice.prototype, "qr_base64", void 0);
__decorate([
    (0, mongoose_2.Prop)({ default: 'ISSUED', index: true }),
    __metadata("design:type", String)
], EInvoice.prototype, "status", void 0);
exports.EInvoice = EInvoice = __decorate([
    (0, mongoose_2.Schema)({ timestamps: true })
], EInvoice);
exports.EInvoiceSchema = mongoose_2.SchemaFactory.createForClass(EInvoice);
function tlvQr(sellerName, vatNumber, isoDate, total, vat) {
    const tlv = (tag, value) => {
        const buf = Buffer.from(value, 'utf8');
        return Buffer.concat([Buffer.from([tag, buf.length]), buf]);
    };
    const payload = Buffer.concat([
        tlv(1, sellerName),
        tlv(2, vatNumber),
        tlv(3, isoDate),
        tlv(4, total.toFixed(2)),
        tlv(5, vat.toFixed(2)),
    ]);
    return payload.toString('base64');
}
let BillingService = class BillingService {
    constructor(conn) {
        this.conn = conn;
    }
    get invoices() { return this.conn.model('EInvoice'); }
    async nextInvoiceNo() {
        const year = new Date().getFullYear();
        const counter = await this.conn.collection('counters').findOneAndUpdate({ _id: `invoice-${year}` }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
        const seq = counter?.seq ?? counter?.value?.seq ?? 1;
        return `INV-${year}-${String(seq).padStart(6, '0')}`;
    }
    bookingModelName(kind) {
        switch (kind) {
            case 'pharmacy':
            case 'order': return 'Order';
            case 'appointment':
            case 'consultation': return 'Appointment';
            case 'lab': return 'LabBooking';
            case 'radiology': return 'RadiologyBooking';
            case 'home_care':
            case 'nursing': return 'HomeCareBooking';
            default: throw new common_1.BadRequestException('unsupported booking_kind');
        }
    }
    async issue(user, kind, bookingId) {
        const existing = await this.invoices.findOne({ booking_kind: kind, booking_id: bookingId, status: 'ISSUED' }, { _id: 0, __v: 0 }).lean();
        if (existing)
            return existing;
        const booking = await this.conn.model(this.bookingModelName(kind)).findOne({ id: bookingId }).lean();
        if (!booking)
            throw new common_1.NotFoundException('booking not found');
        const isOwner = booking.patient_id === user.id || booking.user_id === user.id;
        if (!isOwner && user.role !== 'admin')
            throw new common_1.BadRequestException('not your booking');
        const total = Number(booking.total ?? booking.total_price ?? booking.price ?? 0);
        if (!(total > 0))
            throw new common_1.BadRequestException('booking has no payable amount');
        const vat = Math.round((total - total / (1 + VAT_RATE)) * 100) / 100;
        const subtotal = Math.round((total - vat) * 100) / 100;
        const sellerName = process.env.ZATCA_SELLER_NAME || 'منصة نَبْض للرعاية الصحية';
        const vatNumber = process.env.ZATCA_VAT_NUMBER
            || (process.env.NODE_ENV === 'production' ? null : '300000000000003');
        if (!vatNumber)
            throw new common_1.BadRequestException('ZATCA_VAT_NUMBER is not configured — cannot issue compliant invoices');
        const issuedAt = new Date();
        const qr = tlvQr(sellerName, vatNumber, issuedAt.toISOString(), total, vat);
        const doc = await this.invoices.create({
            invoice_no: await this.nextInvoiceNo(),
            booking_kind: kind,
            booking_id: bookingId,
            patient_id: booking.patient_id || booking.user_id,
            subtotal, vat_rate: VAT_RATE, vat_amount: vat, total,
            qr_base64: qr,
        });
        return this.invoices.findOne({ id: doc.id }, { _id: 0, __v: 0 }).lean();
    }
    myInvoices(user) {
        return this.invoices.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100).lean();
    }
    adminList(limit = 100) {
        return this.invoices.find({}, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(Math.min(limit, 500)).lean();
    }
    async invoicePdf(user, kind, bookingId) {
        const inv = await this.issue(user, kind, bookingId);
        const booking = await this.conn.model(this.bookingModelName(kind)).findOne({ id: bookingId }).lean();
        const sellerName = process.env.ZATCA_SELLER_NAME || 'Nabd Health Platform';
        const qrPng = await (async () => {
            try {
                const QRCode = require('qrcode');
                return await QRCode.toBuffer(inv.qr_base64, { type: 'png', width: 140, margin: 1 });
            }
            catch {
                return null;
            }
        })();
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks = [];
            doc.on('data', (c) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            doc.fontSize(20).fillColor('#0F766E').text('Nabd — Tax Invoice / فاتورة ضريبية', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor('#555555').text(sellerName, { align: 'center' });
            doc.moveDown(1.5);
            doc.fontSize(11).fillColor('#111111');
            doc.text(`Invoice No: ${inv.invoice_no}`);
            doc.text(`Issued At: ${new Date(inv.createdAt || Date.now()).toISOString()}`);
            doc.text(`Booking: ${inv.booking_kind} #${inv.booking_id}`);
            if (booking?.patient_name)
                doc.text(`Patient: ${booking.patient_name}`);
            doc.moveDown();
            if (Array.isArray(booking?.items) && booking.items.length) {
                doc.fontSize(12).text('Items:', { underline: true });
                booking.items.slice(0, 25).forEach((it) => {
                    doc.fontSize(10).text(`- ${it.name_en || it.name_ar || it.medicine_id}  x${it.qty || 1}  =  ${((it.price || 0) * (it.qty || 1)).toFixed(2)} SAR`);
                });
                doc.moveDown();
            }
            doc.fontSize(11);
            doc.text(`Subtotal (excl. VAT): ${Number(inv.subtotal).toFixed(2)} SAR`);
            doc.text(`VAT (${Math.round((inv.vat_rate || 0.15) * 100)}%): ${Number(inv.vat_amount).toFixed(2)} SAR`);
            doc.fontSize(13).fillColor('#0F766E').text(`Total (incl. VAT): ${Number(inv.total).toFixed(2)} SAR`);
            doc.moveDown(1.5);
            if (qrPng) {
                doc.image(qrPng, { fit: [140, 140], align: 'center' });
                doc.fontSize(8).fillColor('#555555').text('ZATCA TLV QR', { align: 'center' });
            }
            else {
                doc.fontSize(8).fillColor('#555555').text(`ZATCA TLV payload: ${inv.qr_base64}`);
            }
            doc.fontSize(9).fillColor('#999999').text('Generated by Nabd Health Platform — Phase-1 simplified e-invoice', 50, 760, { align: 'center' });
            doc.end();
        });
    }
    async emailInvoice(user, kind, bookingId, mail) {
        const inv = await this.issue(user, kind, bookingId);
        const u = await this.conn.collection('users').findOne({ id: inv.patient_id });
        const email = u?.email;
        if (!email)
            throw new common_1.BadRequestException('no_email_on_profile');
        const html = `
      <div dir="rtl" style="font-family:Arial">
        <h2>فاتورتك من نبض</h2>
        <p>رقم الفاتورة: <b>${inv.invoice_no}</b></p>
        <p>الإجمالي (شامل الضريبة): <b>${Number(inv.total).toFixed(2)} ر.س</b></p>
        <p>الضريبة (15%): ${Number(inv.vat_amount).toFixed(2)} ر.س</p>
        <p>يمكنك تحميل الفاتورة PDF من التطبيق.</p>
      </div>`;
        await mail.send(email, `فاتورة نبض ${inv.invoice_no}`, html, `Invoice ${inv.invoice_no} — total ${inv.total} SAR`);
        return { ok: true, emailed_to: email.replace(/(.{2}).*(@.*)/, '$1***$2') };
    }
};
exports.BillingService = BillingService;
exports.BillingService = BillingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_3.Connection])
], BillingService);
let BillingController = class BillingController {
    constructor(svc, mail) {
        this.svc = svc;
        this.mail = mail;
    }
    invoice(user, kind, bookingId) {
        return this.svc.issue(user, kind, bookingId);
    }
    async invoicePdf(user, kind, bookingId, res) {
        const pdf = await this.svc.invoicePdf(user, kind, bookingId);
        res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="invoice-${bookingId.slice(0, 8)}.pdf"` });
        const { Readable } = require('stream');
        return new common_1.StreamableFile(Readable.from(pdf));
    }
    emailInvoice(user, kind, bookingId) {
        return this.svc.emailInvoice(user, kind, bookingId, this.mail);
    }
    my(user) {
        return this.svc.myInvoices(user);
    }
    adminInvoices(limit) {
        return this.svc.adminList(Number(limit) || 100);
    }
};
exports.BillingController = BillingController;
__decorate([
    (0, common_1.Get)('invoice/:kind/:bookingId'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_1.Param)('kind')),
    __param(2, (0, common_1.Param)('bookingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "invoice", null);
__decorate([
    (0, common_1.Get)('invoice/:kind/:bookingId/pdf'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_1.Param)('kind')),
    __param(2, (0, common_1.Param)('bookingId')),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "invoicePdf", null);
__decorate([
    (0, common_1.Post)('invoice/:kind/:bookingId/email'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_1.Param)('kind')),
    __param(2, (0, common_1.Param)('bookingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "emailInvoice", null);
__decorate([
    (0, common_1.Get)('my'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "my", null);
__decorate([
    (0, common_1.Get)('admin/list'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "adminInvoices", null);
exports.BillingController = BillingController = __decorate([
    (0, common_1.Controller)('billing'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [BillingService, mail_module_1.MailService])
], BillingController);
let BillingModule = class BillingModule {
};
exports.BillingModule = BillingModule;
exports.BillingModule = BillingModule = __decorate([
    (0, common_1.Module)({
        imports: [mail_module_1.MailModule, mongoose_1.MongooseModule.forFeature([{ name: 'EInvoice', schema: exports.EInvoiceSchema }])],
        controllers: [BillingController],
        providers: [BillingService],
    })
], BillingModule);
//# sourceMappingURL=billing.module.js.map