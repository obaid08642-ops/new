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
exports.OrdersConsoleService = exports.ORDER_KINDS = void 0;
exports.getKindSpec = getKindSpec;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const rbac_1 = require("../../common/rbac");
const audit_service_1 = require("./audit.service");
const wallet_service_1 = require("../wallet/wallet.service");
exports.ORDER_KINDS = [
    {
        kind: 'pharmacy', collection: 'orders', stateField: 'state', historyField: 'state_history',
        patientField: 'patient_id', patientNameField: 'patient_name', providerField: 'pharmacy_id',
        amountExpr: '$total', cancelledStates: ['CANCELLED'], completedStates: ['DELIVERED'],
        label_ar: 'طلب صيدلية',
    },
    {
        kind: 'lab', collection: 'labbookings', stateField: 'state', historyField: 'state_history',
        patientField: 'patient_id', patientNameField: 'patient_name', providerField: 'facility_id',
        amountExpr: '$total_price', cancelledStates: ['CANCELLED', 'SAMPLE_REJECTED'], completedStates: ['REPORTED'],
        label_ar: 'حجز مختبر',
    },
    {
        kind: 'radiology', collection: 'radiologybookings', stateField: 'state', historyField: 'state_history',
        patientField: 'patient_id', patientNameField: 'patient_name', providerField: 'facility_id',
        amountExpr: '$total_price', cancelledStates: ['CANCELLED'], completedStates: ['REPORT_PUBLISHED'],
        label_ar: 'حجز أشعة',
    },
    {
        kind: 'nursing', collection: 'homecarebookings', stateField: 'state', historyField: 'state_history',
        patientField: 'patient_id', patientNameField: 'patient_name', providerField: 'provider_id',
        amountExpr: '$total_price', cancelledStates: ['CANCELLED', 'REJECTED'], completedStates: ['COMPLETED', 'DONE'],
        label_ar: 'تمريض منزلي',
    },
    {
        kind: 'consultation', collection: 'appointments', stateField: 'status', historyField: 'state_history',
        patientField: 'patient_id', providerField: 'doctor_user_id',
        amountExpr: '$total_price', cancelledStates: ['CANCELLED', 'REJECTED'], completedStates: ['COMPLETED'],
        label_ar: 'استشارة',
    },
];
function getKindSpec(kind) {
    const spec = exports.ORDER_KINDS.find((k) => k.kind === kind);
    if (!spec)
        throw new common_1.BadRequestException(`unknown_order_kind:${kind}`);
    return spec;
}
const CANCELLED_SETS = new Map(exports.ORDER_KINDS.map((k) => [k.kind, new Set(k.cancelledStates)]));
let OrdersConsoleService = class OrdersConsoleService {
    constructor(conn, audit, wallet) {
        this.conn = conn;
        this.audit = audit;
        this.wallet = wallet;
    }
    async list(opts) {
        const page = Math.max(1, opts.page || 1);
        const limit = Math.min(100, Math.max(1, opts.limit || 25));
        const kinds = opts.kind && opts.kind !== 'all' ? [getKindSpec(opts.kind)] : exports.ORDER_KINDS;
        const rx = opts.q?.trim() ? new RegExp(opts.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
        const rows = [];
        let total = 0;
        for (const spec of kinds) {
            const match = {};
            if (opts.status)
                match[spec.stateField] = String(opts.status).toUpperCase();
            if (opts.from || opts.to) {
                match.createdAt = {
                    ...(opts.from ? { $gte: new Date(opts.from) } : {}),
                    ...(opts.to ? { $lte: new Date(opts.to) } : {}),
                };
            }
            if (rx) {
                const or = [{ id: rx }, ...(spec.patientNameField ? [{ [spec.patientNameField]: rx }] : [])];
                if (spec.patientField)
                    or.push({ [spec.patientField]: rx });
                match.$or = or;
            }
            const col = this.conn.collection(spec.collection);
            const [count] = await col.aggregate([{ $match: match }, { $count: 'n' }]).toArray().catch(() => [{ n: 0 }]);
            total += count?.n || 0;
            const perCol = opts.kind && opts.kind !== 'all' ? limit : page * limit;
            const mongoSort = opts.sort === 'oldest' || opts.sort === 'amount_asc'
                ? (opts.sort === 'amount_asc' ? { total: 1, total_price: 1, createdAt: -1 } : { createdAt: 1 })
                : (opts.sort === 'amount_desc' ? { total: -1, total_price: -1, createdAt: -1 } : { createdAt: -1 });
            const items = await col.find(match)
                .sort(mongoSort)
                .limit(perCol)
                .project({
                _id: 0, id: 1, tracking_id: 1,
                state: `$${spec.stateField}`,
                created_at: '$createdAt',
                patient_id: `$${spec.patientField}`,
                patient_name: spec.patientNameField ? `$${spec.patientNameField}` : null,
                patient_phone: 1,
                provider_id: spec.providerField ? `$${spec.providerField}` : null,
                payment_method: 1, payment_status: 1,
                total: {
                    $ifNull: [
                        spec.amountExpr === '$total_price' ? '$total_price'
                            : spec.amountExpr === '$total' ? '$total' : '$total_price',
                        0,
                    ],
                },
                sla_due_at: 1,
            })
                .toArray();
            for (const it of items) {
                it.kind = spec.kind;
                it.kind_label_ar = spec.label_ar;
                it.is_cancelled = CANCELLED_SETS.get(spec.kind)?.has(String(it.state)) || false;
                it.is_completed = spec.completedStates.includes(String(it.state));
                rows.push(it);
            }
        }
        rows.sort((a, b) => {
            if (opts.sort === 'oldest')
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            if (opts.sort === 'amount_asc')
                return Number(a.total || 0) - Number(b.total || 0);
            if (opts.sort === 'amount_desc')
                return Number(b.total || 0) - Number(a.total || 0);
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        const sliced = opts.kind && opts.kind !== 'all' ? rows : rows.slice((page - 1) * limit, page * limit);
        const byStatus = {};
        if (kinds.length === 1) {
            const spec = kinds[0];
            const facetRows = await this.conn.collection(spec.collection).aggregate([
                { $group: { _id: `$${spec.stateField}`, n: { $sum: 1 } } },
            ]).toArray().catch(() => []);
            for (const r of facetRows)
                byStatus[String(r._id || 'unknown')] = r.n;
        }
        const byKind = {};
        for (const spec of exports.ORDER_KINDS) {
            const [c] = await this.conn.collection(spec.collection).aggregate([{ $count: 'n' }]).toArray().catch(() => [{ n: 0 }]);
            byKind[spec.kind] = c?.n || 0;
        }
        return { data: sliced, total, page, pages: Math.ceil(total / limit), by_status: byStatus, by_kind: byKind };
    }
    async exportCsv(opts) {
        const maxRows = Math.max(1, Math.min(10_000, Number(process.env.ADMIN_EXPORT_MAX_ROWS || 10_000)));
        const first = await this.list({ ...opts, page: 1, limit: 100 });
        const rows = [...first.data];
        for (let page = 2; rows.length < Math.min(first.total, maxRows) && page <= first.pages; page += 1) {
            const next = await this.list({ ...opts, page, limit: 100 });
            rows.push(...next.data);
        }
        const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const header = ['id', 'kind', 'state', 'patient_id', 'patient_name', 'provider_id', 'payment_status', 'total', 'created_at', 'sla_due_at'];
        const lines = rows.slice(0, maxRows).map((row) => [
            row.id, row.kind, row.state, row.patient_id, row.patient_name, row.provider_id,
            row.payment_status, row.total, row.created_at, row.sla_due_at,
        ].map(escape).join(','));
        return {
            filename: `orders-${new Date().toISOString().slice(0, 10)}.csv`,
            csv: [header.join(','), ...lines].join('\n'),
            truncated: first.total > maxRows,
            total_matching: first.total,
            exported_rows: Math.min(rows.length, maxRows),
        };
    }
    async detail(kind, id) {
        const spec = getKindSpec(kind);
        const doc = await this.conn.collection(spec.collection).findOne({ id });
        if (!doc)
            throw new common_1.NotFoundException('order_not_found');
        const payments = await this.conn.collection('moyasar_payments')
            .find({ $or: [{ booking_id: id }, { reference_id: id }, { order_id: id }] })
            .project({ _id: 0 })
            .sort({ createdAt: -1 }).limit(20).toArray()
            .catch(() => []);
        const refunds = await this.conn.collection('wallet_transactions')
            .find({ referenceType: 'refund', referenceId: id, type: 'credit' })
            .project({ _id: 0, amount: 1, description: 1, createdAt: 1 })
            .toArray();
        const refundsTotal = refunds.reduce((a, r) => a + Number(r.amount || 0), 0);
        const paid = payments.filter((p) => ['paid', 'confirmed', 'succeeded'].includes(String(p.status || '').toLowerCase()))
            .reduce((a, p) => a + Number(p.amount || 0), 0);
        const { _id, __v, ...clean } = doc;
        return {
            order: clean,
            kind, kind_label_ar: spec.label_ar,
            timeline: doc[spec.historyField] || [],
            payments,
            financials: { gross_paid: Math.round(paid * 100) / 100, refunded_total: Math.round(refundsTotal * 100) / 100, refundable_max: Math.max(0, Math.round((paid - refundsTotal) * 100) / 100) },
            refunds,
        };
    }
    async pushHistory(spec, id, fromState, toState, admin, note) {
        await this.conn.collection(spec.collection).updateOne({ id }, {
            $push: {
                [spec.historyField]: {
                    from: fromState, to: toState,
                    by_user_id: admin.id, by_role: 'admin',
                    at: new Date(), note,
                },
            },
        });
    }
    async cancel(kind, id, rawReason, admin) {
        const reason = this.reason(rawReason);
        const spec = getKindSpec(kind);
        const doc = await this.conn.collection(spec.collection).findOne({ id });
        if (!doc)
            throw new common_1.NotFoundException('order_not_found');
        const from = String(doc[spec.stateField]);
        if (CANCELLED_SETS.get(kind)?.has(from))
            throw new common_1.BadRequestException('already_cancelled');
        if (spec.completedStates.includes(from))
            throw new common_1.BadRequestException(`cannot_cancel_completed_state_${from}`);
        await this.conn.collection(spec.collection).updateOne({ id }, { $set: { [spec.stateField]: 'CANCELLED', cancelled_at: new Date(), cancellation_reason: reason } });
        await this.pushHistory(spec, id, from, 'CANCELLED', admin, `admin_cancel: ${reason}`);
        await this.audit.write({
            action: 'order_cancel', actor: admin, target_type: spec.collection, target_id: id,
            reason, before: { state: from }, after: { state: 'CANCELLED' },
        });
        return { ok: true, id, previous_state: from, state: 'CANCELLED' };
    }
    async refund(kind, id, body, admin) {
        const reason = this.financialReason(body?.reason);
        const spec = getKindSpec(kind);
        const doc = await this.conn.collection(spec.collection).findOne({ id });
        if (!doc)
            throw new common_1.NotFoundException('order_not_found');
        const payments = await this.conn.collection('moyasar_payments').find({
            $or: [{ booking_id: id }, { reference_id: id }, { order_id: id }],
            status: { $in: ['paid', 'confirmed', 'succeeded'] },
        }).toArray().catch(() => []);
        const paid = payments.reduce((a, p) => a + Number(p.amount || 0), 0);
        if (paid <= 0)
            throw new common_1.BadRequestException('no_confirmed_payment_to_refund');
        const priorRefunds = await this.conn.collection('wallet_transactions')
            .find({ referenceType: 'refund', referenceId: id, type: 'credit' }).toArray();
        const refunded = priorRefunds.reduce((a, r) => a + Number(r.amount || 0), 0);
        const maxRefundable = Math.round((paid - refunded) * 100) / 100;
        if (maxRefundable <= 0)
            throw new common_1.BadRequestException('fully_refunded_already');
        let amount;
        if ((body?.mode || 'full') === 'full')
            amount = maxRefundable;
        else {
            amount = Math.round(Number(body?.amount) * 100) / 100;
            if (!Number.isFinite(amount) || amount <= 0)
                throw new common_1.BadRequestException('amount_required_positive');
            if (amount > maxRefundable)
                throw new common_1.BadRequestException(`amount_exceeds_refundable_${maxRefundable}`);
        }
        await this.wallet.topup(doc[spec.patientField], 'patient', amount, `refund ${kind}:${id} — ${reason}`.slice(0, 180), 'refund', id);
        const fullyRefunded = Math.round((refunded + amount) * 100) / 100 >= paid;
        for (const p of payments) {
            await this.conn.collection('moyasar_payments').updateOne({ _id: p._id }, { $set: {
                    status: fullyRefunded ? 'refunded' : p.status,
                    refunded_amount: Math.min(paid, Number(p.refunded_amount || 0) + amount),
                    refunded_at: new Date(),
                } });
        }
        await this.conn.collection(spec.collection).updateOne({ id }, { $set: { refund_status: 'refunded', refunded_amount: Math.round((refunded + amount) * 100) / 100, last_refund_at: new Date() } });
        await this.audit.write({
            action: 'order_refund', actor: admin, target_type: spec.collection, target_id: id,
            reason, before: { refunded }, after: { refunded: refunded + amount, paid },
            meta: { patient_id: doc[spec.patientField], mode: body?.mode || 'full' },
        });
        return { ok: true, id, credited_amount: amount, refunded_total: Math.round((refunded + amount) * 100) / 100 };
    }
    async compensate(kind, id, body, admin) {
        const reason = this.financialReason(body?.reason);
        const cap = Number(process.env.COMPENSATION_MAX_SAR || 500);
        const spec = getKindSpec(kind);
        const doc = await this.conn.collection(spec.collection).findOne({ id });
        if (!doc)
            throw new common_1.NotFoundException('order_not_found');
        const amount = Math.round(Number(body?.amount) * 100) / 100;
        if (!Number.isFinite(amount) || amount <= 0)
            throw new common_1.BadRequestException('amount_required_positive');
        if (amount > cap)
            throw new common_1.BadRequestException(`amount_exceeds_compensation_cap_${cap}`);
        await this.wallet.topup(doc[spec.patientField], 'patient', amount, `compensation ${kind}:${id} — ${reason}`.slice(0, 180), 'refund', `comp_${id}`);
        await this.audit.write({
            action: 'order_compensate', actor: admin, target_type: spec.collection, target_id: id,
            reason, after: { amount }, meta: { patient_id: doc[spec.patientField] },
        });
        return { ok: true, id, compensated_amount: amount };
    }
    async reassign(kind, id, body, admin) {
        const reason = this.reason(body?.reason);
        const spec = getKindSpec(kind);
        if (!spec.providerField)
            throw new common_1.BadRequestException('kind_has_no_provider_field');
        const newProvider = String(body?.provider_id || '').trim();
        if (!newProvider)
            throw new common_1.BadRequestException('provider_id_required');
        const doc = await this.conn.collection(spec.collection).findOne({ id });
        if (!doc)
            throw new common_1.NotFoundException('order_not_found');
        if (CANCELLED_SETS.get(kind)?.has(String(doc[spec.stateField])))
            throw new common_1.BadRequestException('cannot_reassign_cancelled');
        const oldProvider = doc[spec.providerField] || null;
        await this.conn.collection(spec.collection).updateOne({ id }, { $set: { [spec.providerField]: newProvider, reassigned_at: new Date(), reassigned_by: admin.id } });
        await this.pushHistory(spec, id, String(doc[spec.stateField]), String(doc[spec.stateField]), admin, `reassign ${oldProvider}→${newProvider}: ${reason}`);
        await this.audit.write({
            action: 'order_reassign', actor: admin, target_type: spec.collection, target_id: id,
            reason, before: { provider: oldProvider }, after: { provider: newProvider },
        });
        return { ok: true, id, previous_provider: oldProvider, provider: newProvider };
    }
    async extendSla(kind, id, body, admin) {
        const reason = this.reason(body?.reason);
        const hours = Number(body?.hours);
        if (!Number.isFinite(hours) || hours <= 0 || hours > 72)
            throw new common_1.BadRequestException('hours_must_be_1_to_72');
        const spec = getKindSpec(kind);
        const doc = await this.conn.collection(spec.collection).findOne({ id });
        if (!doc)
            throw new common_1.NotFoundException('order_not_found');
        const base = doc.sla_due_at ? new Date(doc.sla_due_at) : new Date();
        const newDue = new Date(base.getTime() + hours * 3600_000);
        await this.conn.collection(spec.collection).updateOne({ id }, { $set: { sla_due_at: newDue, sla_extended_at: new Date(), sla_extended_by_hours: hours } });
        await this.audit.write({
            action: 'order_sla_extend', actor: admin, target_type: spec.collection, target_id: id,
            reason, before: { sla_due_at: doc.sla_due_at || null }, after: { sla_due_at: newDue, hours },
        });
        return { ok: true, id, sla_due_at: newDue, extended_hours: hours };
    }
    async addInternalNote(kind, id, rawNote, admin) {
        const note = this.reason(rawNote);
        const spec = getKindSpec(kind);
        const doc = await this.conn.collection(spec.collection).findOne({ id });
        if (!doc)
            throw new common_1.NotFoundException('order_not_found');
        const entry = { by_user_id: admin.id, by_role: 'admin', at: new Date(), note: `internal_note: ${note}` };
        await this.conn.collection(spec.collection).updateOne({ id }, { $push: { internal_notes: entry } });
        await this.audit.write({
            action: 'order_internal_note', actor: admin, target_type: spec.collection, target_id: id,
            reason: note, after: { internal_note_added: true },
        });
        return { ok: true, id, note: entry };
    }
    reason(raw) {
        try {
            return (0, rbac_1.validateReason)(raw);
        }
        catch (e) {
            if (e instanceof rbac_1.ReasonError)
                throw new common_1.BadRequestException(e.code);
            throw e;
        }
    }
    financialReason(raw) {
        try {
            return (0, rbac_1.validateReason)(raw, rbac_1.MIN_FINANCIAL_REASON_LENGTH);
        }
        catch (e) {
            if (e instanceof rbac_1.ReasonError)
                throw new common_1.BadRequestException(e.code);
            throw e;
        }
    }
};
exports.OrdersConsoleService = OrdersConsoleService;
exports.OrdersConsoleService = OrdersConsoleService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        audit_service_1.AdminAuditService,
        wallet_service_1.WalletService])
], OrdersConsoleService);
//# sourceMappingURL=orders-console.service.js.map