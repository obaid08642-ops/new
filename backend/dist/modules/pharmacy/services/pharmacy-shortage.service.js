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
exports.PharmacyShortageService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const drugshortageflag_repository_1 = require("./repositories/drugshortageflag.repository");
const drugrejectionlog_repository_1 = require("./repositories/drugrejectionlog.repository");
const medicine_repository_1 = require("./repositories/medicine.repository");
const pharmacyorder_repository_1 = require("./repositories/pharmacyorder.repository");
const enums_1 = require("../../../common/enums");
let PharmacyShortageService = class PharmacyShortageService {
    constructor(flags, rejections, medicines, orders) {
        this.flags = flags;
        this.rejections = rejections;
        this.medicines = medicines;
        this.orders = orders;
    }
    toObj(doc) {
        return doc && doc.toObject ? doc.toObject() : doc;
    }
    async reportByPharmacy(user, body) {
        if (!(0, enums_1.isProviderRole)(user?.role))
            throw new common_1.ForbiddenException();
        const flag = await this.flags.create({
            id: (0, uuid_1.v4)(),
            sku: body.sku, generic_name: body.generic_name, name_ar: body.name_ar, dosage: body.dosage, form: body.form,
            source: 'pharmacy', reported_by_pharmacy_account_id: user.id,
            status: 'pending', reason: body.reason,
        });
        return this.toObj(flag);
    }
    async createByAdmin(user, body) {
        if (user?.role !== 'admin')
            throw new common_1.ForbiddenException();
        const flag = await this.flags.create({
            id: (0, uuid_1.v4)(),
            sku: body.sku, generic_name: body.generic_name, name_ar: body.name_ar, dosage: body.dosage, form: body.form,
            source: 'admin', status: 'approved', reason: body.reason, approved_by: user.id, approved_at: new Date(),
        });
        if (body.sku) {
            await this.medicines.updateOne({ barcode: body.sku }, { availability_status: 'admin_flagged_shortage', shortage_notes: body.reason });
        }
        return this.toObj(flag);
    }
    async approve(user, id) {
        if (user?.role !== 'admin')
            throw new common_1.ForbiddenException();
        const f = await this.flags.findOneAndUpdate({ id, status: 'pending' }, { $set: { status: 'approved', approved_by: user.id, approved_at: new Date() } }, { new: true });
        if (!f)
            throw new common_1.NotFoundException();
        if (f.sku) {
            await this.medicines.updateOne({ barcode: f.sku }, { availability_status: 'availability_may_be_limited', shortage_notes: f.reason });
        }
        return this.toObj(f);
    }
    async reject(user, id, reason) {
        if (user?.role !== 'admin')
            throw new common_1.ForbiddenException();
        const f = await this.flags.findOneAndUpdate({ id, status: 'pending' }, { $set: { status: 'rejected', reason } }, { new: true });
        if (!f)
            throw new common_1.NotFoundException();
        return this.toObj(f);
    }
    async resolve(user, id) {
        if (user?.role !== 'admin')
            throw new common_1.ForbiddenException();
        const f = await this.flags.findOneAndUpdate({ id, status: 'approved' }, { $set: { status: 'resolved', resolved_at: new Date() } }, { new: true });
        if (!f)
            throw new common_1.NotFoundException();
        if (f.sku) {
            await this.medicines.updateOne({ barcode: f.sku }, { availability_status: 'none', shortage_notes: '' });
        }
        return this.toObj(f);
    }
    async list(user, status) {
        const q = {};
        if (status)
            q.status = status;
        if (user?.role === 'provider')
            q.$or = [{ source: 'admin', status: 'approved' }, { reported_by_pharmacy_account_id: user.id }];
        return this.flags.find(q).sort({ createdAt: -1 }).limit(200).lean();
    }
    async lookupForPatient(sku, generic_name) {
        const q = {};
        if (sku)
            q.barcode = sku;
        else if (generic_name)
            q.active_ingredient = { $regex: new RegExp(generic_name, 'i') };
        else
            return null;
        const med = await this.medicines.findOne(q).lean();
        if (med && med.availability_status && med.availability_status !== 'none') {
            return {
                availability_status: med.availability_status,
                shortage_notes: med.shortage_notes || '',
                message_en: 'Availability may be limited in some areas',
                message_ar: 'قد يكون غير متوفر حالياً في بعض المناطق',
            };
        }
        return null;
    }
    async logRejection(medicineId, orderId, pharmacyId) {
        await this.rejections.create({
            id: (0, uuid_1.v4)(),
            medicine_id: medicineId,
            order_id: orderId,
            pharmacy_id: pharmacyId,
            type: 'reject',
            timestamp: new Date()
        });
        const last5 = await this.rejections.find({ medicine_id: medicineId }).sort({ timestamp: -1 }).limit(5).lean();
        if (last5.length === 5 && last5.every(log => log.type === 'reject')) {
            await this.medicines.updateOne({ id: medicineId }, { availability_status: 'availability_may_be_limited' });
            return;
        }
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
        const rejectionCount = await this.rejections.countDocuments({
            medicine_id: medicineId,
            type: 'reject',
            timestamp: { $gte: sevenDaysAgo }
        });
        if (rejectionCount >= 10) {
            await this.medicines.updateOne({ id: medicineId }, { availability_status: 'availability_may_be_limited' });
        }
    }
    async logAcceptance(medicineId, orderId, pharmacyId) {
        await this.rejections.create({
            id: (0, uuid_1.v4)(),
            medicine_id: medicineId,
            order_id: orderId,
            pharmacy_id: pharmacyId,
            type: 'accept',
            timestamp: new Date()
        });
        const med = await this.medicines.findOne({ id: medicineId });
        if (med && med.availability_status === 'availability_may_be_limited') {
            await this.medicines.updateOne({ id: medicineId }, { availability_status: 'none' });
        }
    }
    async adminMarkShortage(user, medicineId, body) {
        if (user?.role !== 'admin')
            throw new common_1.ForbiddenException('Admin role required');
        const med = await this.medicines.findOneAndUpdate({ id: medicineId }, { availability_status: body.status, shortage_notes: body.notes || '' }, { new: true });
        if (!med)
            throw new common_1.NotFoundException('Medicine not found');
        return this.toObj(med);
    }
    async getShortageDashboard(user) {
        if (user?.role !== 'admin')
            throw new common_1.ForbiddenException('Admin role required');
        const aggregateRejections = await this.rejections.aggregate([
            { $match: { type: 'reject' } },
            { $group: { _id: '$medicine_id', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        const most_rejected = [];
        for (const item of aggregateRejections) {
            const med = await this.medicines.findOne({ id: item._id }).lean();
            if (med) {
                most_rejected.push({
                    medicine_id: item._id,
                    name_ar: med.name_ar,
                    name_en: med.name_en || '',
                    barcode: med.barcode || '',
                    rejection_count: item.count,
                    availability_status: med.availability_status
                });
            }
        }
        const cancelledOrders = await this.orders.find({ status: 'cancelled' }).lean();
        const cancellationMap = {};
        for (const order of cancelledOrders) {
            for (const item of order.items) {
                const med = await this.medicines.findOne({ $or: [{ barcode: item.matched_sku }, { name_ar: item.raw_name }] });
                if (med) {
                    cancellationMap[med.id] = (cancellationMap[med.id] || 0) + 1;
                }
            }
        }
        const cancellation_counts = Object.keys(cancellationMap).map(medId => ({
            medicine_id: medId,
            cancelled_orders_count: cancellationMap[medId]
        }));
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
        const trends = await this.rejections.aggregate([
            { $match: { type: 'reject', timestamp: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                    rejections: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        return {
            most_rejected,
            cancellation_counts,
            shortage_trends: trends.map(t => ({ date: t._id, count: t.rejections }))
        };
    }
};
exports.PharmacyShortageService = PharmacyShortageService;
exports.PharmacyShortageService = PharmacyShortageService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DrugShortageFlagRepository')),
    __param(1, (0, common_1.Inject)('DrugRejectionLogRepository')),
    __param(2, (0, common_1.Inject)('MedicineRepository')),
    __param(3, (0, common_1.Inject)('PharmacyOrderRepository')),
    __metadata("design:paramtypes", [drugshortageflag_repository_1.DrugShortageFlagRepository,
        drugrejectionlog_repository_1.DrugRejectionLogRepository,
        medicine_repository_1.MedicineRepository,
        pharmacyorder_repository_1.PharmacyOrderRepository])
], PharmacyShortageService);
//# sourceMappingURL=pharmacy-shortage.service.js.map