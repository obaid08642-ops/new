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
exports.ContractPdfService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const PDFDocument = __importStar(require("pdfkit"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
function ar(line) {
    return line.split(' ').reverse().join(' ');
}
let ContractPdfService = class ContractPdfService {
    constructor(conn) {
        this.conn = conn;
        this.logger = new common_1.Logger('ContractPdf');
    }
    fontPath(name) {
        const candidates = [
            path.join(__dirname, '..', '..', 'assets', 'fonts', name),
            path.join(process.cwd(), 'dist', 'assets', 'fonts', name),
            path.join(process.cwd(), 'src', 'assets', 'fonts', name),
        ];
        for (const p of candidates)
            if (fs.existsSync(p) && this.isValidFont(p))
                return p;
        return null;
    }
    isValidFont(p) {
        try {
            const stat = fs.statSync(p);
            if (stat.size < 1024)
                return false;
            const fd = fs.openSync(p, 'r');
            const head = Buffer.alloc(4);
            fs.readSync(fd, head, 0, 4, 0);
            fs.closeSync(fd);
            const sig = head.toString('latin1');
            return head.readUInt32BE(0) === 0x00010000 || sig === 'OTTO' || sig === 'true' || sig === 'ttcf';
        }
        catch {
            return false;
        }
    }
    async loadSignature(url) {
        if (!url)
            return null;
        try {
            if (url.startsWith('data:')) {
                const base64 = url.slice(url.indexOf(',') + 1);
                return Buffer.from(base64, 'base64');
            }
            if (!/^https?:\/\//.test(url)) {
                const obj = await this.conn.collection('storage_objects').findOne({ id: url, deleted: { $ne: true } });
                if (!obj)
                    return null;
                if (obj.data_base64)
                    return Buffer.from(obj.data_base64, 'base64');
                if (obj.backend === 'cloudinary' && obj.external_key) {
                    const cloudinary = require('cloudinary').v2;
                    cloudinary.config({
                        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                        api_key: process.env.CLOUDINARY_API_KEY,
                        api_secret: process.env.CLOUDINARY_API_SECRET,
                        secure: true,
                    });
                    const signed = obj.visibility === 'public_read'
                        ? obj.external_url
                        : cloudinary.url(obj.external_key, { sign_url: true, secure: true, type: 'authenticated' });
                    const res = await fetch(signed);
                    if (!res.ok)
                        return null;
                    return Buffer.from(await res.arrayBuffer());
                }
                if (obj.external_url) {
                    const res = await fetch(obj.external_url);
                    if (!res.ok)
                        return null;
                    return Buffer.from(await res.arrayBuffer());
                }
                return null;
            }
            const res = await fetch(url);
            if (!res.ok)
                return null;
            return Buffer.from(await res.arrayBuffer());
        }
        catch (e) {
            this.logger.warn(`signature fetch failed: ${e.message}`);
        }
        return null;
    }
    async generate(party) {
        const sig = await this.loadSignature(party.signatureUrl);
        const Doc = PDFDocument.default || PDFDocument;
        const doc = new Doc({ size: 'A4', margin: 50, info: { Title: 'Nabd Provider Partnership Agreement' } });
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
        const fontRegular = this.fontPath('Amiri-Regular.ttf') || this.fontPath('NotoNaskhArabic-Regular.ttf');
        const fontBold = this.fontPath('Amiri-Bold.ttf') || this.fontPath('NotoNaskhArabic-Bold.ttf');
        if (fontRegular)
            doc.registerFont('ar', fontRegular);
        if (fontBold)
            doc.registerFont('ar-b', fontBold);
        const F = fontRegular ? 'ar' : 'Helvetica';
        const FB = fontBold ? 'ar-b' : 'Helvetica-Bold';
        const right = (txt, opts = {}) => doc.text(txt, { align: 'right', ...opts });
        const W = doc.page.width - 100;
        doc.font(FB).fontSize(18).fillColor('#0f766e');
        right(ar('عقد شراكة مزود خدمة') + '  —  ' + ar('منصة نبض'));
        doc.font(FB).fontSize(12).fillColor('#111');
        doc.text('Nabd Platform — Provider Partnership Agreement', { align: 'right' });
        doc.moveDown(0.5);
        doc.font(F).fontSize(9).fillColor('#555');
        right(ar(`رقم العقد: ${party.profileId}`));
        right(ar(`تاريخ الإبرام: ${new Date().toISOString().slice(0, 10)}`));
        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(50 + W, doc.y).strokeColor('#0f766e').lineWidth(1.5).stroke();
        doc.moveDown(1);
        doc.font(FB).fontSize(13).fillColor('#111');
        right(ar('أطراف الاتفاق'));
        doc.moveDown(0.4);
        doc.font(F).fontSize(11);
        right(ar('الطرف الأول: منصة نبض الصحية (المشغّل المرخص للمنصة).'));
        right(ar(`الطرف الثاني: ${party.nameAr || party.nameEn || '—'} — مزود خدمة من فئة (${party.providerType}).`));
        if (party.licenseNumber)
            right(ar(`رقم الترخيص: ${party.licenseNumber}`));
        if (party.crNumber)
            right(ar(`السجل التجاري: ${party.crNumber}`));
        if (party.city)
            right(ar(`المدينة: ${party.city}`));
        if (party.email)
            right(ar(`البريد الإلكتروني: ${party.email}`));
        if (party.phone)
            right(ar(`الجوال: ${party.phone}`));
        doc.moveDown(1);
        doc.font(FB).fontSize(13);
        right(ar('البنود الأساسية'));
        doc.moveDown(0.4);
        doc.font(F).fontSize(10.5);
        const terms = [
            'يلتزم الطرف الثاني بصحة جميع البيانات والتراخيص والمستندات المقدمة عبر المنصة، ويتحمل كامل المسؤولية النظامية عن أي بيانات غير صحيحة.',
            'تخضع العلاقة بين الطرفين لأنظمة المملكة العربية السعودية، ويلتزم المزود بضوابط وزارة الصحة والجهات الرقابية ذات العلاقة.',
            'تُعرض خدمات المزود على المنصة بعد اعتماد الإدارة، ويحق للإدارة إيقاف الحساب عند مخالفة الشروط أو ورود بلاغات مؤثرة على سلامة المرضى.',
            'تُسوّى المستحقات المالية وفق سياسة المحفظة والعمولة المعتمدة داخل المنصة، وتُحوّل إلى الحساب البنكي الموثق لدى المزود.',
            'يلتزم الطرفان بالسرية التامة لبيانات المرضى وفق نظام حماية البيانات الشخصية، ولا يجوز استخدامها لأي غرض خارج الخدمة.',
            'يُعد التوقيع الإلكتروني المدرج في هذا العقد موافقة نهائية وملزمة من الطرف الثاني على جميع البنود أعلاه.',
        ];
        terms.forEach((t, i) => { right(ar(`${i + 1}. ${t}`)); doc.moveDown(0.35); });
        doc.moveDown(0.8);
        doc.font(FB).fontSize(13).fillColor('#111');
        right(ar('التوقيع والإقرار'));
        doc.moveDown(0.6);
        const topY = doc.y;
        const colW = W / 2 - 10;
        doc.font(FB).fontSize(11);
        doc.text(ar('توقيع الطرف الثاني (المزود)'), 50 + W - colW, topY, { width: colW, align: 'right' });
        doc.font(F).fontSize(10).fillColor('#333');
        doc.text(ar(`الاسم: ${party.signerName || '—'} (${party.signerRole || 'مفوّض'})`), 50 + W - colW, topY + 22, { width: colW, align: 'right' });
        if (sig) {
            doc.image(sig, 50 + W - colW / 2 - 60, topY + 42, { fit: [120, 60] });
        }
        else {
            doc.font(F).fontSize(10).fillColor('#b91c1c');
            doc.text(ar('(لم يُرفق توقيع إلكتروني)'), 50 + W - colW, topY + 46, { width: colW, align: 'right' });
        }
        doc.font(FB).fontSize(11).fillColor('#111');
        doc.text(ar('توقيع الطرف الأول (المنصة)'), 50, topY, { width: colW, align: 'right' });
        doc.font(F).fontSize(10).fillColor('#333');
        doc.text(ar('منصة نبض الصحية — الإدارة القانونية'), 50, topY + 22, { width: colW, align: 'right' });
        doc.font(F).fontSize(9).fillColor('#0f766e');
        doc.text('NABD PLATFORM — DIGITALLY EXECUTED', 50, topY + 46, { width: colW, align: 'right' });
        doc.moveDown(6);
        doc.y = Math.max(doc.y, topY + 120);
        const preliminary = Buffer.concat(chunks);
        const sha = (0, crypto_1.createHash)('sha256').update(preliminary).update(party.profileId).digest('hex').slice(0, 24);
        doc.font(F).fontSize(8).fillColor('#777');
        right(ar(`بصمة التحقق من سلامة المستند: ${sha}`));
        right(ar('هذا المستند محفوظ لدى منصة نبض ولا يُتاح إلا للإدارة المخولة، ويمكن إتاحته للمزود بقرار إداري.'));
        doc.end();
        const pdf = await done;
        return { pdf, sha256: sha };
    }
};
exports.ContractPdfService = ContractPdfService;
exports.ContractPdfService = ContractPdfService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], ContractPdfService);
//# sourceMappingURL=contract-pdf.service.js.map