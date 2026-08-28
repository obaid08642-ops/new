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
exports.PharmacyChatService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const pharmacy_schema_1 = require("../schemas/pharmacy.schema");
const event_bus_service_1 = require("../../events/event-bus.service");
const pharmacychatthread_repository_1 = require("./repositories/pharmacychatthread.repository");
const pharmacychatmessage_repository_1 = require("./repositories/pharmacychatmessage.repository");
const pharmacyorder_repository_1 = require("./repositories/pharmacyorder.repository");
const pharmacyallocation_repository_1 = require("./repositories/pharmacyallocation.repository");
const BLOCK_PATTERNS = [
    { name: 'phone_e164', re: /(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?){2,4}\d{2,4}/g },
    { name: 'arabic_phone', re: /[٠-٩۰-۹]{6,}/g },
    { name: 'url', re: /\b(?:https?:\/\/|www\.|t\.me\/|wa\.me\/|bit\.ly\/)[^\s]+/gi },
    { name: 'external_app', re: /\b(whats?app|telegram|signal|messenger|viber|imo|skype|zoom|google\s*meet|teams)\b/gi },
    { name: 'email', re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
];
function screen(text) {
    if (!text)
        return { ok: true };
    const t = String(text);
    for (const p of BLOCK_PATTERNS)
        if (p.re.test(t))
            return { ok: false, reason: p.name };
    return { ok: true };
}
let PharmacyChatService = class PharmacyChatService {
    constructor(threads, messages, orders, allocs, bus) {
        this.threads = threads;
        this.messages = messages;
        this.orders = orders;
        this.allocs = allocs;
        this.bus = bus;
    }
    async openOrGetThread(order_id, order_item_id, pharmacy_account_id) {
        const order = await this.orders.findOne({ id: order_id }).lean();
        if (!order)
            throw new common_1.NotFoundException('order_not_found');
        let t = await this.threads.findOne({ order_id, order_item_id, pharmacy_account_id });
        if (!t) {
            t = await this.threads.create({
                id: (0, uuid_1.v4)(),
                order_id, patient_account_id: order.patient_account_id, pharmacy_account_id, order_item_id,
                status: 'open',
            });
        }
        return t;
    }
    async listThreads(user, order_id) {
        const q = {};
        if (user.role === 'patient')
            q.patient_account_id = user.id;
        else if (user.role === 'provider')
            q.pharmacy_account_id = user.id;
        else
            throw new common_1.ForbiddenException();
        if (order_id)
            q.order_id = order_id;
        return this.threads.find(q).sort({ updatedAt: -1 }).lean();
    }
    async listMessages(user, thread_id) {
        const t = await this.threads.findOne({ id: thread_id }).lean();
        if (!t)
            throw new common_1.NotFoundException();
        if (user.role === 'patient' && t.patient_account_id !== user.id)
            throw new common_1.ForbiddenException();
        if (user.role === 'provider' && t.pharmacy_account_id !== user.id)
            throw new common_1.ForbiddenException();
        const msgs = await this.messages.find({ thread_id, blocked: { $ne: true } }).sort({ createdAt: 1 }).lean();
        return { thread: t, messages: msgs };
    }
    async postMessage(user, thread_id, body) {
        const t = await this.threads.findOne({ id: thread_id });
        if (!t)
            throw new common_1.NotFoundException();
        if (t.status !== 'open')
            throw new common_1.BadRequestException('thread_closed');
        const isPatient = t.patient_account_id === user.id;
        const isPharmacy = t.pharmacy_account_id === user.id;
        if (!isPatient && !isPharmacy)
            throw new common_1.ForbiddenException();
        const screened = screen(body.text || '');
        if (!screened.ok) {
            const blockedMsg = await this.messages.create({
                id: (0, uuid_1.v4)(), thread_id, sender_account_id: user.id,
                sender_role: isPatient ? 'patient' : 'pharmacy',
                text: '[BLOCKED]', blocked: true, blocked_reason: screened.reason,
            });
            throw new common_1.BadRequestException({ code: 'content_blocked', reason: screened.reason, message_id: blockedMsg.id });
        }
        const m = await this.messages.create({
            id: (0, uuid_1.v4)(), thread_id, sender_account_id: user.id,
            sender_role: isPatient ? 'patient' : 'pharmacy',
            text: body.text, image_uri: body.image_uri, substitute_offer: body.substitute_offer,
        });
        t.last_message_at = new Date();
        await t.save();
        if (body.substitute_offer) {
            await this.bus.emit({ type: 'substitute.proposed', entity_type: 'chat', entity_id: t.id, actor_account_id: user.id, actor_role: isPatient ? 'patient' : 'provider', patient_account_id: t.patient_account_id, pharmacy_account_id: t.pharmacy_account_id, meta: { order_id: t.order_id, order_item_id: t.order_item_id, message_id: m.id, offer: body.substitute_offer } });
        }
        return m.toObject();
    }
    async acceptSubstitute(user, thread_id, message_id) {
        const t = await this.threads.findOne({ id: thread_id });
        if (!t)
            throw new common_1.NotFoundException();
        if (t.patient_account_id !== user.id)
            throw new common_1.ForbiddenException();
        if (t.status !== 'open')
            throw new common_1.BadRequestException('thread_closed');
        const msg = await this.messages.findOne({ id: message_id, thread_id }).lean();
        if (!msg || !msg.substitute_offer)
            throw new common_1.BadRequestException('no_substitute_offer');
        const alloc = await this.allocs.findOne({ order_id: t.order_id, pharmacy_account_id: t.pharmacy_account_id });
        if (alloc) {
            const item = alloc.items.find(i => i.order_item_id === t.order_item_id);
            if (item) {
                item.action = pharmacy_schema_1.AllocationItemAction.SUBSTITUTE;
                item.substitute_for_sku = item.sku;
                item.sku = msg.substitute_offer.sku || item.sku;
                item.name = msg.substitute_offer.name || item.name;
                item.substitute_reason = msg.substitute_offer.notes || 'patient_accepted_in_chat';
                item.unit_price = msg.substitute_offer.price || item.unit_price;
                item.updated_at = new Date();
                alloc.markModified('items');
                await alloc.save();
            }
        }
        t.status = 'closed';
        t.resolution = 'accepted';
        await t.save();
        await this.messages.create({ id: (0, uuid_1.v4)(), thread_id, sender_account_id: 'system', sender_role: 'system', text: `البديل مقبول من المريض.` });
        await this.bus.emit({ type: 'substitute.accepted', entity_type: 'chat', entity_id: t.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: t.patient_account_id, pharmacy_account_id: t.pharmacy_account_id, meta: { order_id: t.order_id, order_item_id: t.order_item_id, message_id: msg.id } });
        return { ok: true };
    }
    async rejectOrRemove(user, thread_id, action) {
        const t = await this.threads.findOne({ id: thread_id });
        if (!t)
            throw new common_1.NotFoundException();
        if (t.patient_account_id !== user.id)
            throw new common_1.ForbiddenException();
        if (t.status !== 'open')
            throw new common_1.BadRequestException('thread_closed');
        t.status = 'closed';
        t.resolution = action;
        await t.save();
        if (action === 'removed') {
            const order = await this.orders.findOne({ id: t.order_id });
            if (order) {
                order.items = order.items.filter((it) => it.id !== t.order_item_id);
                order.markModified('items');
                order.timeline.push({ ts: new Date(), event: 'item_removed_from_order', meta: { order_item_id: t.order_item_id } });
                await order.save();
            }
        }
        await this.messages.create({ id: (0, uuid_1.v4)(), thread_id, sender_account_id: 'system', sender_role: 'system', text: action === 'rejected' ? `المريض رفض البديل.` : `تم حذف الصنف من الطلب.` });
        await this.bus.emit({ type: action === 'rejected' ? 'substitute.rejected' : 'substitute.item_removed', entity_type: 'chat', entity_id: t.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: t.patient_account_id, pharmacy_account_id: t.pharmacy_account_id, meta: { order_id: t.order_id, order_item_id: t.order_item_id } });
        return { ok: true };
    }
    async sweepAutoClose() {
        const cutoff = new Date(Date.now() - 12 * 3600 * 1000);
        const completedOrders = await this.orders.find({ status: { $in: [pharmacy_schema_1.PharmacyOrderState.DELIVERED, pharmacy_schema_1.PharmacyOrderState.COMPLETED, pharmacy_schema_1.PharmacyOrderState.CANCELLED] }, updatedAt: { $lt: cutoff } }, { id: 1 }).lean();
        const ids = completedOrders.map(o => o.id);
        const res = await this.threads.updateMany({ order_id: { $in: ids }, status: 'open' }, { $set: { status: 'archived', resolution: 'timeout' } });
        return { archived: res.modifiedCount, scanned: completedOrders.length };
    }
};
exports.PharmacyChatService = PharmacyChatService;
exports.PharmacyChatService = PharmacyChatService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('PharmacyChatThreadRepository')),
    __param(1, (0, common_1.Inject)('PharmacyChatMessageRepository')),
    __param(2, (0, common_1.Inject)('PharmacyOrderRepository')),
    __param(3, (0, common_1.Inject)('PharmacyAllocationRepository')),
    __metadata("design:paramtypes", [pharmacychatthread_repository_1.PharmacyChatThreadRepository,
        pharmacychatmessage_repository_1.PharmacyChatMessageRepository,
        pharmacyorder_repository_1.PharmacyOrderRepository,
        pharmacyallocation_repository_1.PharmacyAllocationRepository,
        event_bus_service_1.EventBusService])
], PharmacyChatService);
//# sourceMappingURL=pharmacy-chat.service.js.map