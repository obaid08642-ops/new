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
exports.NabdExtensionsService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const schedule_1 = require("@nestjs/schedule");
const jwt_1 = require("@nestjs/jwt");
const notifications_service_1 = require("../notifications/notifications.service");
const enums_1 = require("../../common/enums");
const universalactivity_repository_1 = require("./repositories/universalactivity.repository");
const wallet_repository_1 = require("./repositories/wallet.repository");
const wallettransaction_repository_1 = require("./repositories/wallettransaction.repository");
const referralcode_repository_1 = require("./repositories/referralcode.repository");
const referralreward_repository_1 = require("./repositories/referralreward.repository");
const featureflag_repository_1 = require("./repositories/featureflag.repository");
const treatmentprogram_repository_1 = require("./repositories/treatmentprogram.repository");
const slalog_repository_1 = require("./repositories/slalog.repository");
const fraudalert_repository_1 = require("./repositories/fraudalert.repository");
const adplacement_repository_1 = require("./repositories/adplacement.repository");
const corporateaccount_repository_1 = require("./repositories/corporateaccount.repository");
const appointment_repository_1 = require("./repositories/appointment.repository");
const prescription_repository_1 = require("./repositories/prescription.repository");
const labresult_repository_1 = require("./repositories/labresult.repository");
const vitalreading_repository_1 = require("./repositories/vitalreading.repository");
const order_repository_1 = require("./repositories/order.repository");
const providerprofile_repository_1 = require("./repositories/providerprofile.repository");
const user_repository_1 = require("./repositories/user.repository");
let NabdExtensionsService = class NabdExtensionsService {
    constructor(activityModel, walletModel, walletTxModel, referralCodeModel, referralRewardModel, featureFlagModel, treatmentProgramModel, slaLogModel, fraudAlertModel, adPlacementModel, corporateModel, appointmentModel, prescriptionModel, labResultModel, vitalModel, orderModel, providerProfileModel, userModel, notificationsService, jwtService) {
        this.activityModel = activityModel;
        this.walletModel = walletModel;
        this.walletTxModel = walletTxModel;
        this.referralCodeModel = referralCodeModel;
        this.referralRewardModel = referralRewardModel;
        this.featureFlagModel = featureFlagModel;
        this.treatmentProgramModel = treatmentProgramModel;
        this.slaLogModel = slaLogModel;
        this.fraudAlertModel = fraudAlertModel;
        this.adPlacementModel = adPlacementModel;
        this.corporateModel = corporateModel;
        this.appointmentModel = appointmentModel;
        this.prescriptionModel = prescriptionModel;
        this.labResultModel = labResultModel;
        this.vitalModel = vitalModel;
        this.orderModel = orderModel;
        this.providerProfileModel = providerProfileModel;
        this.userModel = userModel;
        this.notificationsService = notificationsService;
        this.jwtService = jwtService;
        this.logger = new common_1.Logger('NabdExtensions');
    }
    async logActivity(eventType, userId, providerId, metadata = {}) {
        return this.activityModel.create({
            eventType,
            userId,
            providerId,
            metadata,
            timestamp: new Date(),
        });
    }
    async onAppointmentCreated(payload) {
        this.logger.log(`Event Listener: appointment.created triggered`);
        await this.logActivity('appointment.created', payload.patient_id, payload.doctor_id, payload);
        await this.notificationsService.create({
            user_id: payload.patient_id,
            title_key: 'notification.appointment.created.title',
            body_key: 'notification.appointment.created.body',
            type: enums_1.NotificationType.INFO,
            priority: enums_1.NotificationPriority.NORMAL,
        });
    }
    async onOrderCancelled(payload) {
        this.logger.log(`Event Listener: order.cancelled triggered`);
        await this.logActivity('order.cancelled', payload.patient_id, payload.provider_id, payload);
        await this.notificationsService.create({
            user_id: payload.patient_id,
            title_key: 'notification.order.cancelled.title',
            body_key: 'notification.order.cancelled.body',
            type: enums_1.NotificationType.ALERT,
            priority: enums_1.NotificationPriority.HIGH,
        });
    }
    async onPrescriptionIssued(payload) {
        this.logger.log(`Event Listener: prescription.issued triggered`);
        await this.logActivity('prescription.issued', payload.patient_id, payload.doctor_id, payload);
        await this.notificationsService.create({
            user_id: payload.patient_id,
            title_key: 'notification.prescription.issued.title',
            body_key: 'notification.prescription.issued.body',
            type: enums_1.NotificationType.INFO,
            priority: enums_1.NotificationPriority.NORMAL,
        });
    }
    async getWalletBalance(ownerId, ownerType) {
        const wallet = await this.walletModel.findOne({ ownerId, ownerType });
        return wallet ? wallet.balance : 0;
    }
    async processWalletTransaction(opts) {
        let wallet = await this.walletModel.findOne({ ownerId: opts.ownerId, ownerType: opts.ownerType });
        if (!wallet) {
            wallet = await this.walletModel.create({
                ownerId: opts.ownerId,
                ownerType: opts.ownerType,
                balance: 0,
            });
        }
        if (opts.type === 'debit' && wallet.balance < opts.amount) {
            throw new common_1.BadRequestException('Insufficient wallet balance');
        }
        wallet.balance += opts.type === 'credit' ? opts.amount : -opts.amount;
        await wallet.save();
        return this.walletTxModel.create({
            walletId: wallet.id,
            amount: opts.amount,
            type: opts.type,
            referenceType: opts.referenceType,
            referenceId: opts.referenceId,
            description: opts.description,
        });
    }
    async generateReferralCode(ownerId) {
        const existing = await this.referralCodeModel.findOne({ ownerId });
        if (existing)
            return existing.code;
        const code = `NABD-${ownerId.substring(0, 5).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        await this.referralCodeModel.create({ ownerId, code, useCount: 0 });
        return code;
    }
    async claimReferral(refereeId, code) {
        const referralCode = await this.referralCodeModel.findOne({ code });
        if (!referralCode)
            throw new common_1.NotFoundException('Referral code not found');
        if (referralCode.ownerId === refereeId)
            throw new common_1.BadRequestException('Cannot use your own referral code');
        const alreadyRewarded = await this.referralRewardModel.findOne({ refereeId });
        if (alreadyRewarded)
            throw new common_1.BadRequestException('Referral reward already claimed');
        const reward = await this.referralRewardModel.create({
            referrerId: referralCode.ownerId,
            refereeId,
            rewardType: 'wallet',
            amount: 50,
            status: 'completed',
        });
        referralCode.useCount += 1;
        await referralCode.save();
        await this.processWalletTransaction({
            ownerId: referralCode.ownerId,
            ownerType: 'patient',
            amount: 50,
            type: 'credit',
            referenceType: 'referral',
            referenceId: reward.id,
            description: `Referral bonus for recruiting user ${refereeId}`,
        });
        await this.processWalletTransaction({
            ownerId: refereeId,
            ownerType: 'patient',
            amount: 50,
            type: 'credit',
            referenceType: 'referral',
            referenceId: reward.id,
            description: `Welcome referral bonus using code ${code}`,
        });
        return { success: true, rewardAmount: 50 };
    }
    async getFlags() {
        return this.featureFlagModel.find({});
    }
    async updateFlag(flagName, isEnabled, updatedBy) {
        return this.featureFlagModel.findOneAndUpdate({ flagName }, { $set: { isEnabled, updatedBy } }, { new: true, upsert: true });
    }
    async getTimeline(patientId) {
        const appointments = await this.appointmentModel.find({ patient_id: patientId }).lean();
        const prescriptions = await this.prescriptionModel.find({ patient_id: patientId }).lean();
        const labResults = await this.labResultModel.find({ patient_id: patientId }).lean();
        const vitals = await this.vitalModel.find({ patient_id: patientId }).lean();
        const feed = [
            ...appointments.map((a) => ({ id: a.id, date: a.createdAt || new Date(), kind: 'appointment', details: a })),
            ...prescriptions.map((p) => ({ id: p.id, date: p.createdAt || new Date(), kind: 'prescription', details: p })),
            ...labResults.map((l) => ({ id: l.id, date: l.createdAt || new Date(), kind: 'lab_result', details: l })),
            ...vitals.map((v) => ({ id: v.id, date: v.measured_at || v.createdAt || new Date(), kind: 'vital', details: v })),
        ];
        return feed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    async getHealthPassport(patientId) {
        const user = await this.userModel.findOne({ id: patientId });
        if (!user)
            throw new common_1.NotFoundException('Patient not found');
        const medicalProfile = await this.userModel.db.model('MedicalProfile').findOne({ patient_id: patientId }).lean();
        const chronicDiseases = medicalProfile?.chronic_diseases || [];
        const allergies = medicalProfile?.allergies || [];
        const passportData = {
            patientId,
            name: user.full_name,
            bloodType: medicalProfile?.blood_type || 'unknown',
            chronicDiseases,
            allergies,
            timestamp: new Date(),
        };
        const token = await this.jwtService.signAsync(passportData);
        return {
            passport: passportData,
            verificationToken: token,
            qrContent: `nabd://passport/verify?token=${token}`,
        };
    }
    async enrollProgram(patientId, programType) {
        const existing = await this.treatmentProgramModel.findOne({ patientId, programType });
        if (existing)
            return existing;
        const nextSchedule = new Date();
        nextSchedule.setDate(nextSchedule.getDate() + 7);
        return this.treatmentProgramModel.create({
            patientId,
            programType,
            status: 'active',
            completedSteps: [],
            nextSchedule,
        });
    }
    async getActivePrograms(patientId) {
        const MASTER_PROGRAMS = [
            {
                id: 'diabetes',
                title: 'برنامج إدارة السكري المكثف',
                duration: '6 أشهر',
                totalSessions: 6,
                milestoneReward: '150 نقطة نبض',
                rewardDesc: 'عند إكمال الجلسة الرابعة بنجاح ورشاقة!',
                sessionsList: [
                    { id: 1, title: 'الاستشارة التأسيسية لغدد الصماء' },
                    { id: 2, title: 'تحليل سكر صائم وتراكمي دوري' },
                    { id: 3, title: 'جلسة وضع الخطة الغذائية مع أخصائي التغذية' },
                    { id: 4, title: 'زيارة ممرضة منزلية لسحب عينة السكر التراكمي' },
                    { id: 5, title: 'استشارة طبيب لمراجعة المؤشرات والجرعات' },
                    { id: 6, title: 'تقييم فحص شبكية وقاع العين السنوي' }
                ]
            },
            {
                id: 'pregnancy',
                title: 'برنامج متابعة الحمل الصحي الآمن',
                duration: '9 أشهر',
                totalSessions: 4,
                milestoneReward: 'استشارة مجانية لطب الأطفال',
                rewardDesc: 'عند إكمال الشهر السادس من الحمل ومتابعة الفيتامينات.',
                sessionsList: [
                    { id: 1, title: 'استشارة تأكيد الحمل والفحص الأولي' },
                    { id: 2, title: 'فحوصات الربع الأول الشاملة والمكملات' },
                    { id: 3, title: 'جلسة الأشعة الصوتية ثلاثية الأبعاد (السونار)' },
                    { id: 4, title: 'فحص سكر الحمل وتحديث المؤشرات الغذائية' }
                ]
            }
        ];
        const enrolled = await this.treatmentProgramModel.find({ patientId });
        return MASTER_PROGRAMS.map(master => {
            const enrollment = enrolled.find(e => e.programType === master.id);
            const completedSteps = enrollment?.completedSteps || [];
            const completedCount = completedSteps.length;
            const mappedSessions = master.sessionsList.map(s => ({
                ...s,
                status: completedSteps.includes(s.id.toString()) ? 'completed' : 'pending'
            }));
            const nextPending = mappedSessions.find(s => s.status === 'pending');
            return {
                ...master,
                completedSessions: completedCount,
                nextSessionDate: enrollment?.nextSchedule ? enrollment.nextSchedule.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }) : 'غير محدد',
                nextSessionTime: '09:00 ص',
                nextSessionTitle: nextPending ? nextPending.title : 'اكتملت جميع الجلسات',
                sessionsList: mappedSessions
            };
        });
    }
    async completeProgramSession(patientId, programType, sessionId) {
        let program = await this.treatmentProgramModel.findOne({ patientId, programType });
        if (!program) {
            program = await this.enrollProgram(patientId, programType);
        }
        if (!program.completedSteps.includes(sessionId)) {
            program.completedSteps.push(sessionId);
            await program.save();
        }
        return this.getActivePrograms(patientId);
    }
    async matchPharmacy(lat, lng, requiredMedName) {
        const approvedAccounts = await this.userModel.db.model('ProviderAccount')
            .find({ status: 'approved' }, { _id: 1, id: 1 }).lean();
        const approvedIds = new Set(approvedAccounts.map((a) => a.id));
        const pharmacies = await this.providerProfileModel.find({ provider_type: 'pharmacy' }).lean();
        const matches = [];
        for (const p of pharmacies) {
            if (!approvedIds.has(p.account_id))
                continue;
            let hasInventory = true;
            if (requiredMedName) {
                const rx = new RegExp(requiredMedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
                const item = await this.userModel.db.model('PharmacyInventoryItem').findOne({
                    provider_account_id: p.account_id,
                    $or: [{ name_ar: { $regex: rx } }, { name_en: { $regex: rx } }, { generic_name: { $regex: rx } }],
                    stock: { $gt: 0 },
                    available: true,
                });
                if (!item)
                    hasInventory = false;
            }
            if (hasInventory) {
                const geo = p.geo;
                const dist = geo?.lat != null && geo?.lng != null ? this.haversine(lat, lng, geo.lat, geo.lng) / 1000 : 9999;
                matches.push({
                    provider: p,
                    distanceKm: dist,
                });
            }
        }
        return matches.sort((a, b) => a.distanceKm - b.distanceKm);
    }
    async matchNurse(lat, lng) {
        const approvedAccounts = await this.userModel.db.model('ProviderAccount')
            .find({ status: 'approved' }, { _id: 1, id: 1 }).lean();
        const approvedIds = new Set(approvedAccounts.map((a) => a.id));
        const nurses = await this.providerProfileModel.find({ provider_type: 'nursing' }).lean();
        const matches = [];
        for (const n of nurses) {
            if (!approvedIds.has(n.account_id))
                continue;
            const geo = n.geo;
            const dist = geo?.lat != null && geo?.lng != null ? this.haversine(lat, lng, geo.lat, geo.lng) / 1000 : 9999;
            matches.push({
                provider: n,
                distanceKm: dist,
            });
        }
        return matches.sort((a, b) => a.distanceKm - b.distanceKm);
    }
    async runSlaAudit() {
        this.logger.log('Running SLA Audit Cron job...');
        const fiveMinutesAgo = new Date();
        fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 3);
        const orders = await this.orderModel.find({
            state: 'CREATED',
            createdAt: { $lt: fiveMinutesAgo },
        });
        for (const o of orders) {
            this.logger.warn(`SLA Breach: Order ${o.id} exceeded response threshold`);
            await this.slaLogModel.create({
                providerId: o.pharmacy_id || 'unknown_provider',
                orderId: o.id,
                durationSeconds: 180,
                slaLimit: 180,
                isBreached: true,
            });
            o.state = 'ESCALATED_TO_ADMIN';
            o.state_history = [
                ...(o.state_history || []),
                { from: 'CREATED', to: 'ESCALATED_TO_ADMIN', by_user_id: 'system', by_role: 'system', reason: 'sla-breach:no-pharmacy-response', at: new Date() },
            ];
            await o.save();
            try {
                await this.orderModel.db.collection('notifications').insertOne({
                    id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    role: 'admin',
                    title_key: 'تجاوز مهلة استجابة الصيدلية',
                    body_key: `الطلب ${o.id} لم تستجب له أي صيدلية خلال 3 دقائق — يحتاج إعادة إسناد.`,
                    type: 'alert', priority: 'high', is_read: false,
                    data: { order_id: o.id, reason: 'sla_breach' },
                    createdAt: new Date(), updatedAt: new Date(),
                });
            }
            catch { }
        }
    }
    async rankProviders(lat, lng, type) {
        const list = await this.providerProfileModel.find({ type, status: 'verified' }).lean();
        const ranked = [];
        for (const p of list) {
            const distance = p.location ? this.haversine(lat, lng, p.location.lat, p.location.lng) / 1000 : 10;
            const rating = 4.5;
            const slaRate = 0.95;
            const cancellationRate = 0.05;
            const isSponsored = p.is_sponsored || false;
            const score = (rating * 40) + (slaRate * 100 * 30 / 100) - (distance * 10) + (isSponsored ? 100 : 0) - (cancellationRate * 100 * 20 / 100);
            ranked.push({
                provider: p,
                distanceKm: distance,
                score,
            });
        }
        return ranked.sort((a, b) => b.score - a.score);
    }
    async detectFraud() {
        const alerts = [];
        const db = this.userModel.db;
        try {
            const since = new Date(Date.now() - 24 * 3600_000);
            const rapid = await db.collection('appointments').aggregate([
                { $match: { createdAt: { $gte: since } } },
                { $group: { _id: '$patient_id', bookings: { $sum: 1 }, providers: { $addToSet: '$doctor_id' } } },
                { $match: { bookings: { $gte: 10 } } },
            ]).toArray();
            for (const r of rapid) {
                const existing = await this.fraudAlertModel.findOne({ userId: r._id, flagType: 'rapid_bookings', status: 'pending' });
                if (existing)
                    continue;
                alerts.push(await this.fraudAlertModel.create({
                    userId: r._id,
                    providerId: (r.providers && r.providers[0]) || 'unknown',
                    flagType: 'rapid_bookings',
                    confidenceScore: Math.min(60 + r.bookings * 3, 99),
                    status: 'pending',
                }));
            }
        }
        catch { }
        try {
            const since = new Date(Date.now() - 6 * 3600_000);
            const fails = await db.collection('payment_transactions').aggregate([
                { $match: { createdAt: { $gte: since }, status: { $in: ['failed', 'FAILED', 'declined'] } } },
                { $group: { _id: '$user_id', attempts: { $sum: 1 }, bookings: { $addToSet: '$booking_id' } } },
                { $match: { attempts: { $gte: 5 } } },
            ]).toArray();
            for (const f of fails) {
                const existing = await this.fraudAlertModel.findOne({ userId: f._id, flagType: 'payment_velocity_abuse', status: 'pending' });
                if (existing)
                    continue;
                alerts.push(await this.fraudAlertModel.create({
                    userId: f._id,
                    providerId: 'unknown',
                    flagType: 'payment_velocity_abuse',
                    confidenceScore: Math.min(55 + f.attempts * 5, 99),
                    status: 'pending',
                }));
            }
        }
        catch { }
        return alerts;
    }
    async verifyNurseAttendance(nurseId, visitId, lat, lng) {
        const booking = await this.userModel.db.model('HomeCareBooking').findOne({ id: visitId }).lean();
        if (!booking)
            throw new common_1.NotFoundException('Home care visit booking not found');
        const patientLoc = booking.location || { lat: 24.7136, lng: 46.6753 };
        const dist = this.haversine(lat, lng, patientLoc.lat, patientLoc.lng);
        const success = dist < 50;
        await this.logActivity('nurse.attendance.verified', nurseId, booking.provider_id, {
            visitId,
            nurseCoordinates: { lat, lng },
            patientCoordinates: patientLoc,
            distanceMeters: dist,
            success,
        });
        return { success, distanceM: dist };
    }
    async getNursingChecklist(visitId) {
        const booking = await this.userModel.db.model('HomeCareBooking').findOne({ id: visitId }).lean();
        if (!booking)
            throw new common_1.NotFoundException('Visit not found');
        return {
            visitId,
            checklist: booking.checklist || []
        };
    }
    async checkInventoryExpiry() {
        this.logger.log('Checking inventory expiry schedules...');
        const ninetyDaysFromNow = new Date();
        ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
        const expiringItems = await this.userModel.db.model('PharmacyInventoryItem').find({
            expiry_date: { $ne: null, $lt: ninetyDaysFromNow },
            stock: { $gt: 0 },
        });
        for (const item of expiringItems) {
            await this.notificationsService.create({
                user_id: item.provider_account_id,
                title_key: 'notification.inventory.expiry.title',
                body_key: 'notification.inventory.expiry.body',
                params: { drugName: item.name_ar || item.name_en || item.sku, expiryDate: new Date(item.expiry_date).toDateString() },
                type: enums_1.NotificationType.ALERT,
                priority: enums_1.NotificationPriority.NORMAL,
            });
        }
    }
    async getExpiringInventory(providerAccountId) {
        const ninetyDaysFromNow = new Date();
        ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
        const expiringItems = await this.userModel.db.model('PharmacyInventoryItem').find({
            provider_account_id: providerAccountId,
            expiry_date: { $ne: null, $lt: ninetyDaysFromNow },
            stock: { $gt: 0 },
        }).sort({ expiry_date: 1 }).lean();
        return {
            expiringSoon: expiringItems
        };
    }
    async verifyLabResultRanges(sampleId, actualValue) {
        const sample = await this.userModel.db.model('LabSample').findOne({ sampleId });
        if (!sample)
            throw new common_1.NotFoundException('Lab sample not found');
        sample.actualValue = actualValue;
        sample.status = 'completed';
        await sample.save();
        let isCritical = false;
        if (actualValue < sample.criticalMin || actualValue > sample.criticalMax) {
            isCritical = true;
            await this.notificationsService.create({
                user_id: sample.patientId,
                title_key: 'notification.labs.critical.title',
                body_key: 'notification.labs.critical.body',
                params: { testName: sample.testName, actualValue },
                type: enums_1.NotificationType.ALERT,
                priority: enums_1.NotificationPriority.HIGH,
            });
        }
        return { sample, isCritical };
    }
    async getHeatmaps() {
        return this.orderModel.aggregate([
            {
                $group: {
                    _id: {
                        city: '$delivery_address.city',
                        category: '$booking_kind',
                    },
                    count: { $sum: 1 },
                    coordinates: { $first: '$delivery_address.coordinates' },
                },
            },
            {
                $project: {
                    city: '$_id.city',
                    category: '$_id.category',
                    count: 1,
                    coordinates: 1,
                    _id: 0,
                },
            },
        ]);
    }
    async verifyCorporateCredit(companyName, employeeId, requestedAmount) {
        const corp = await this.corporateModel.findOne({ companyName });
        if (!corp)
            throw new common_1.NotFoundException('Corporate account not found');
        if (corp.usedCredit + requestedAmount > corp.individualCreditLimit) {
            return { approved: false, limitRemaining: corp.individualCreditLimit - corp.usedCredit };
        }
        corp.usedCredit += requestedAmount;
        await corp.save();
        return { approved: true, limitRemaining: corp.individualCreditLimit - corp.usedCredit };
    }
    haversine(lat1, lon1, lat2, lon2) {
        const R = 6371e3;
        const phi1 = (lat1 * Math.PI) / 180;
        const phi2 = (lat2 * Math.PI) / 180;
        const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
        const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
                Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
};
exports.NabdExtensionsService = NabdExtensionsService;
__decorate([
    (0, event_emitter_1.OnEvent)('appointment.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NabdExtensionsService.prototype, "onAppointmentCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.cancelled'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NabdExtensionsService.prototype, "onOrderCancelled", null);
__decorate([
    (0, event_emitter_1.OnEvent)('prescription.issued'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NabdExtensionsService.prototype, "onPrescriptionIssued", null);
__decorate([
    (0, schedule_1.Cron)('*/1 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NabdExtensionsService.prototype, "runSlaAudit", null);
__decorate([
    (0, schedule_1.Cron)('0 0 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NabdExtensionsService.prototype, "checkInventoryExpiry", null);
exports.NabdExtensionsService = NabdExtensionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('UniversalActivityRepository')),
    __param(1, (0, common_1.Inject)('WalletRepository')),
    __param(2, (0, common_1.Inject)('WalletTransactionRepository')),
    __param(3, (0, common_1.Inject)('ReferralCodeRepository')),
    __param(4, (0, common_1.Inject)('ReferralRewardRepository')),
    __param(5, (0, common_1.Inject)('FeatureFlagRepository')),
    __param(6, (0, common_1.Inject)('TreatmentProgramRepository')),
    __param(7, (0, common_1.Inject)('SlaLogRepository')),
    __param(8, (0, common_1.Inject)('FraudAlertRepository')),
    __param(9, (0, common_1.Inject)('AdPlacementRepository')),
    __param(10, (0, common_1.Inject)('CorporateAccountRepository')),
    __param(11, (0, common_1.Inject)('AppointmentRepository')),
    __param(12, (0, common_1.Inject)('PrescriptionRepository')),
    __param(13, (0, common_1.Inject)('LabResultRepository')),
    __param(14, (0, common_1.Inject)('VitalReadingRepository')),
    __param(15, (0, common_1.Inject)('OrderRepository')),
    __param(16, (0, common_1.Inject)('ProviderProfileRepository')),
    __param(17, (0, common_1.Inject)('UserRepository')),
    __metadata("design:paramtypes", [universalactivity_repository_1.UniversalActivityRepository,
        wallet_repository_1.WalletRepository,
        wallettransaction_repository_1.WalletTransactionRepository,
        referralcode_repository_1.ReferralCodeRepository,
        referralreward_repository_1.ReferralRewardRepository,
        featureflag_repository_1.FeatureFlagRepository,
        treatmentprogram_repository_1.TreatmentProgramRepository,
        slalog_repository_1.SlaLogRepository,
        fraudalert_repository_1.FraudAlertRepository,
        adplacement_repository_1.AdPlacementRepository,
        corporateaccount_repository_1.CorporateAccountRepository,
        appointment_repository_1.AppointmentRepository,
        prescription_repository_1.PrescriptionRepository,
        labresult_repository_1.LabResultRepository,
        vitalreading_repository_1.VitalReadingRepository,
        order_repository_1.OrderRepository,
        providerprofile_repository_1.ProviderProfileRepository,
        user_repository_1.UserRepository,
        notifications_service_1.NotificationsService,
        jwt_1.JwtService])
], NabdExtensionsService);
//# sourceMappingURL=nabd-extensions.service.js.map