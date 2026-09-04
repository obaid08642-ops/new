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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartModule = exports.CartController = exports.CartService = exports.UnifiedCartSchema = exports.UnifiedCart = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const idempotency_interceptor_1 = require("../../common/idempotency.interceptor");
const mongoose_2 = require("mongoose");
const mongoose_3 = require("@nestjs/mongoose");
const mongoose_4 = require("mongoose");
const uuid_1 = require("uuid");
const auth_guard_1 = require("../../common/auth.guard");
const prescription_schema_1 = require("../../schemas/prescription.schema");
const medicine_schema_1 = require("../../schemas/medicine.schema");
const enums_1 = require("../../common/enums");
const orders_module_1 = require("../orders/orders.module");
const orders_service_1 = require("../orders/orders.service");
const users_module_1 = require("../users/users.module");
const users_service_1 = require("../users/users.service");
const product_ranking_event_service_1 = require("../product-ranking/product-ranking-event.service");
let UnifiedCart = class UnifiedCart extends mongoose_4.Document {
};
exports.UnifiedCart = UnifiedCart;
__decorate([
    (0, mongoose_3.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], UnifiedCart.prototype, "id", void 0);
__decorate([
    (0, mongoose_3.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], UnifiedCart.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_3.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], UnifiedCart.prototype, "lines", void 0);
__decorate([
    (0, mongoose_3.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], UnifiedCart.prototype, "home_visit_fee", void 0);
__decorate([
    (0, mongoose_3.Prop)(),
    __metadata("design:type", String)
], UnifiedCart.prototype, "last_action", void 0);
exports.UnifiedCart = UnifiedCart = __decorate([
    (0, mongoose_3.Schema)({ timestamps: true, collection: 'unified_carts' })
], UnifiedCart);
exports.UnifiedCartSchema = mongoose_3.SchemaFactory.createForClass(UnifiedCart);
let CartService = class CartService {
    constructor(model, medicines, orders, users, rankingEvents) {
        this.model = model;
        this.medicines = medicines;
        this.orders = orders;
        this.users = users;
        this.rankingEvents = rankingEvents;
    }
    async ensureCart(patient_id) {
        let c = await this.model.findOne({ patient_id });
        if (!c)
            c = await this.model.create({ patient_id, lines: [] });
        return c;
    }
    async get(user) {
        const c = await this.ensureCart(user.id);
        return this.summarize(c);
    }
    summarize(c) {
        const obj = c.toObject ? c.toObject() : c;
        const groups = {};
        for (const l of obj.lines || []) {
            groups[l.kind] = groups[l.kind] || { kind: l.kind, items: [], subtotal: 0, count: 0 };
            groups[l.kind].items.push(l);
            groups[l.kind].subtotal += (l.price || 0) * (l.qty || 1);
            groups[l.kind].count += l.qty || 1;
        }
        const subtotal = Object.values(groups).reduce((s, g) => s + g.subtotal, 0);
        const home_visit_fee = (obj.lines || []).some((l) => l.home_visit) ? 50 : 0;
        const total = subtotal + home_visit_fee;
        return { ...obj, groups: Object.values(groups), subtotal, home_visit_fee, total };
    }
    async addLine(user, line) {
        if (!line.service_id || !line.name_ar || !line.kind)
            throw new common_1.BadRequestException('invalid_line');
        const c = await this.ensureCart(user.id);
        const existing = c.lines.find((l) => l.service_id === line.service_id && l.kind === line.kind);
        if (existing) {
            existing.qty = (existing.qty || 1) + (line.qty || 1);
        }
        else {
            c.lines.push({
                line_id: (0, uuid_1.v4)(),
                kind: line.kind,
                service_id: line.service_id,
                name_ar: line.name_ar,
                name_en: line.name_en,
                price: Number(line.price) || 0,
                qty: line.qty || 1,
                payment_method: line.payment_method || 'cash',
                insurance_provider: line.insurance_provider,
                home_visit: !!line.home_visit,
                notes: line.notes,
                meta: line.meta,
            });
        }
        c.last_action = 'add';
        await c.save();
        if (line.kind === 'pharmacy' && line.service_id && this.rankingEvents) {
            this.rankingEvents.recordEvent({
                eventType: 'product_added_to_cart',
                drugId: line.service_id,
                quantity: line.qty || 1,
                userId: user?.id,
            }).catch(() => {});
        }
        return this.summarize(c);
    }
    async addContractItem(user, body) {
        const quantity = Number(body?.quantity);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100)
            throw new common_1.BadRequestException('invalid_quantity');
        const medicineId = String(body?.medicine_id || '').trim();
        const manualName = String(body?.manual_name || '').trim();
        if ((medicineId && manualName) || (!medicineId && !manualName))
            throw new common_1.BadRequestException('medicine_id_or_manual_name_required');
        if (medicineId) {
            const medicine = await this.medicines.findOne({ id: medicineId, is_deleted: { $ne: true } }).lean();
            if (!medicine)
                throw new common_1.NotFoundException('medicine_not_found');
            return this.addLine(user, {
                kind: 'pharmacy', service_id: medicine.id, name_ar: medicine.name_ar,
                name_en: medicine.name_en, price: Number(medicine.price || 0), qty: quantity,
                meta: { source: 'catalog', requires_prescription: Boolean(medicine.requires_prescription) },
            });
        }
        if (manualName.length > 160)
            throw new common_1.BadRequestException('invalid_manual_name');
        return this.addLine(user, {
            kind: 'pharmacy', service_id: `manual:${(0, uuid_1.v4)()}`, name_ar: manualName,
            price: 0, qty: quantity, meta: { source: 'patient_manual', review_status: 'PENDING_REVIEW' },
        });
    }
    async updateLine(user, line_id, patch) {
        const c = await this.ensureCart(user.id);
        const idx = c.lines.findIndex((l) => l.line_id === line_id);
        if (idx < 0)
            throw new common_1.NotFoundException();
        const allowed = ['qty', 'payment_method', 'insurance_provider', 'home_visit', 'notes'];
        for (const k of allowed)
            if (patch[k] !== undefined)
                c.lines[idx][k] = patch[k];
        if (patch.qty !== undefined && patch.qty <= 0)
            c.lines.splice(idx, 1);
        c.markModified('lines');
        c.last_action = 'update';
        await c.save();
        return this.summarize(c);
    }
    async removeLine(user, line_id) {
        const c = await this.ensureCart(user.id);
        c.lines = c.lines.filter((l) => l.line_id !== line_id);
        c.last_action = 'remove';
        await c.save();
        return this.summarize(c);
    }
    async clear(user, kind) {
        const c = await this.ensureCart(user.id);
        c.lines = kind ? c.lines.filter((l) => l.kind !== kind) : [];
        c.last_action = 'clear';
        await c.save();
        return this.summarize(c);
    }
    async prepareCheckout(user) {
        const c = await this.ensureCart(user.id);
        return this.summarize(c);
    }
    async checkoutContract(user, body) {
        const addressId = String(body?.address_id || '').trim();
        if (!addressId)
            throw new common_1.BadRequestException('address_id_required');
        const requestedPayment = String(body?.payment_method_id || 'cash');
        if (requestedPayment !== 'cash')
            throw new common_1.BadRequestException('payment_method_not_supported');
        if (Array.isArray(body?.prescription_media_ids) && body.prescription_media_ids.length > 0) {
            throw new common_1.BadRequestException('prescription_media_not_supported');
        }
        const cart = await this.ensureCart(user.id);
        const lines = (cart.lines || []).filter((line) => line.kind === 'pharmacy');
        if (!lines.length)
            throw new common_1.BadRequestException('pharmacy_cart_empty');
        if ((cart.lines || []).some((line) => line.kind !== 'pharmacy')) {
            throw new common_1.BadRequestException('checkout_contains_unsupported_items');
        }
        const profile = await this.users.getPatientProfile(user.id);
        const address = (profile?.addresses || []).find((entry) => String(entry?.id) === addressId);
        if (!address)
            throw new common_1.NotFoundException('address_not_found');
        if (!Number.isFinite(Number(address.lat)) || !Number.isFinite(Number(address.lng))) {
            throw new common_1.BadRequestException('address_coordinates_required');
        }
        const created = await this.orders.create(user, {
            items: lines.map((line) => line.meta?.source === 'patient_manual'
                ? { name_ar: line.name_ar, name_en: line.name_en, qty: line.qty }
                : { medicine_id: line.service_id, qty: line.qty }),
            delivery_address: { lat: Number(address.lat), lng: Number(address.lng), address: address.street || '', district: '', city: address.city || '' },
            payment_method: 'cash',
            coupon_code: body?.coupon_code,
        });
        cart.lines = [];
        cart.last_action = 'checkout';
        await cart.save();
        return { order_id: created.id, status: created.state, total: created.total };
    }
};
exports.CartService = CartService;
exports.CartService = CartService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('UnifiedCart')),
    __param(1, (0, mongoose_1.InjectModel)(medicine_schema_1.Medicine.name)),
    __param(4, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        orders_service_1.OrdersService,
        users_service_1.UsersService,
        product_ranking_event_service_1.ProductRankingEventService])
], CartService);
let CartController = class CartController {
    constructor(svc, prescriptions) {
        this.svc = svc;
        this.prescriptions = prescriptions;
    }
    get(u) { return this.svc.get(u); }
    addContractItem(b, u) { return this.svc.addContractItem(u, b); }
    updateContractItem(id, b, u) { return this.svc.updateLine(u, id, { qty: b?.quantity }); }
    removeContractItem(id, u) { return this.svc.removeLine(u, id); }
    add(b, u) { return this.svc.addLine(u, b); }
    upd(id, b, u) { return this.svc.updateLine(u, id, b); }
    rm(id, u) { return this.svc.removeLine(u, id); }
    clr(b, u) { return this.svc.clear(u, b?.kind); }
    checkout(b, u) { return this.svc.checkoutContract(u, b); }
    chk(u) { return this.svc.prepareCheckout(u); }
    async prescription(u) {
        const prescription = await this.prescriptions.findOne({
            patient_id: u.id,
            state: { $nin: [enums_1.PrescriptionState.DISPENSED, enums_1.PrescriptionState.ARCHIVED] },
        }).sort({ createdAt: -1 }).lean();
        if (!prescription)
            return { prescription_id: null, medications: [] };
        return {
            prescription_id: prescription.id,
            date: prescription.createdAt || null,
            medications: (prescription.items || []).map((item) => ({
                id: item.substituted_to_medicine_id || item.medicine_id || null,
                name: item.medicine_name_ar || item.medicine_name_en || '',
                dose: item.dose || null,
                qty: item.quantity || 1,
                requiresRx: true,
                is_manual_entry: Boolean(item.is_manual_entry),
            })).filter((item) => item.name),
        };
    }
};
exports.CartController = CartController;
__decorate([
    (0, common_1.Get)(''),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "get", null);
__decorate([
    (0, common_1.Post)('items'),
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "addContractItem", null);
__decorate([
    (0, common_1.Patch)('items/:lineId'),
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    __param(0, (0, common_1.Param)('lineId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "updateContractItem", null);
__decorate([
    (0, common_1.Delete)('items/:lineId'),
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    __param(0, (0, common_1.Param)('lineId')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "removeContractItem", null);
__decorate([
    (0, common_1.Post)('lines'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "add", null);
__decorate([
    (0, common_1.Patch)('lines/:lineId'),
    __param(0, (0, common_1.Param)('lineId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "upd", null);
__decorate([
    (0, common_1.Delete)('lines/:lineId'),
    __param(0, (0, common_1.Param)('lineId')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "rm", null);
__decorate([
    (0, common_1.Post)('clear'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "clr", null);
__decorate([
    (0, common_1.Post)('checkout'),
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "checkout", null);
__decorate([
    (0, common_1.Get)('checkout'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "chk", null);
__decorate([
    (0, common_1.Get)('prescription'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "prescription", null);
exports.CartController = CartController = __decorate([
    (0, common_1.Controller)('cart'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(1, (0, mongoose_1.InjectModel)(prescription_schema_1.Prescription.name)),
    __metadata("design:paramtypes", [CartService,
        mongoose_2.Model])
], CartController);
let CartModule = class CartModule {
};
exports.CartModule = CartModule;
exports.CartModule = CartModule = __decorate([
    (0, common_1.Module)({
        imports: [orders_module_1.OrdersModule, users_module_1.UsersModule, mongoose_1.MongooseModule.forFeature([
                { name: 'UnifiedCart', schema: exports.UnifiedCartSchema },
                { name: prescription_schema_1.Prescription.name, schema: prescription_schema_1.PrescriptionSchema },
                { name: medicine_schema_1.Medicine.name, schema: medicine_schema_1.MedicineSchema },
            ])],
        controllers: [CartController],
        providers: [CartService],
        exports: [CartService],
    })
], CartModule);
//# sourceMappingURL=cart.module.js.map