// @ts-nocheck
import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationPriority } from '../../common/enums';
import { UniversalActivity, UniversalActivityDocument } from '../../schemas/universal-activity.schema';
import { Wallet, WalletDocument, WalletTransaction, WalletTransactionDocument } from '../../schemas/wallet.schema';
import { ReferralCode, ReferralCodeDocument, ReferralReward, ReferralRewardDocument } from '../../schemas/referral.schema';
import { FeatureFlag, FeatureFlagDocument } from '../../schemas/feature-flag.schema';
import { TreatmentProgram, TreatmentProgramDocument } from '../../schemas/treatment-program.schema';
import { SlaLog, SlaLogDocument } from '../../schemas/sla-log.schema';
import { FraudAlert, FraudAlertDocument } from '../../schemas/fraud-alert.schema';
import { AdPlacement, AdPlacementDocument } from '../../schemas/ad-placement.schema';
import { CorporateAccount, CorporateAccountDocument } from '../../schemas/corporate-account.schema';
import { Appointment, AppointmentDocument } from '../../schemas/appointment.schema';
import { Prescription, PrescriptionDocument } from '../../schemas/prescription.schema';
import { LabResult } from '../../schemas/lab-result.schema';
import { VitalReading } from '../../schemas/health.schema';
import { Order, OrderDocument } from '../../schemas/order.schema';
import { ProviderProfile, ProviderProfileDocument } from '../../schemas/provider-profile.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { UniversalActivityRepository } from "./repositories/universalactivity.repository";
import { WalletRepository } from "./repositories/wallet.repository";
import { WalletTransactionRepository } from "./repositories/wallettransaction.repository";
import { ReferralCodeRepository } from "./repositories/referralcode.repository";
import { ReferralRewardRepository } from "./repositories/referralreward.repository";
import { FeatureFlagRepository } from "./repositories/featureflag.repository";
import { TreatmentProgramRepository } from "./repositories/treatmentprogram.repository";
import { SlaLogRepository } from "./repositories/slalog.repository";
import { FraudAlertRepository } from "./repositories/fraudalert.repository";
import { AdPlacementRepository } from "./repositories/adplacement.repository";
import { CorporateAccountRepository } from "./repositories/corporateaccount.repository";
import { AppointmentRepository } from "./repositories/appointment.repository";
import { PrescriptionRepository } from "./repositories/prescription.repository";
import { LabResultRepository } from "./repositories/labresult.repository";
import { VitalReadingRepository } from "./repositories/vitalreading.repository";
import { OrderRepository } from "./repositories/order.repository";
import { ProviderProfileRepository } from "./repositories/providerprofile.repository";
import { UserRepository } from "./repositories/user.repository";

@Injectable()
export class NabdExtensionsService {
  private readonly logger = new Logger('NabdExtensions');

  constructor(
    @Inject('UniversalActivityRepository') private readonly activityModel: UniversalActivityRepository,
    @Inject('WalletRepository') private readonly walletModel: WalletRepository,
    @Inject('WalletTransactionRepository') private readonly walletTxModel: WalletTransactionRepository,
    @Inject('ReferralCodeRepository') private readonly referralCodeModel: ReferralCodeRepository,
    @Inject('ReferralRewardRepository') private readonly referralRewardModel: ReferralRewardRepository,
    @Inject('FeatureFlagRepository') private readonly featureFlagModel: FeatureFlagRepository,
    @Inject('TreatmentProgramRepository') private readonly treatmentProgramModel: TreatmentProgramRepository,
    @Inject('SlaLogRepository') private readonly slaLogModel: SlaLogRepository,
    @Inject('FraudAlertRepository') private readonly fraudAlertModel: FraudAlertRepository,
    @Inject('AdPlacementRepository') private readonly adPlacementModel: AdPlacementRepository,
    @Inject('CorporateAccountRepository') private readonly corporateModel: CorporateAccountRepository,

    @Inject('AppointmentRepository') private readonly appointmentModel: AppointmentRepository,
    @Inject('PrescriptionRepository') private readonly prescriptionModel: PrescriptionRepository,
    @Inject('LabResultRepository') private readonly labResultModel: LabResultRepository,
    @Inject('VitalReadingRepository') private readonly vitalModel: VitalReadingRepository,
    @Inject('OrderRepository') private readonly orderModel: OrderRepository,
    @Inject('ProviderProfileRepository') private readonly providerProfileModel: ProviderProfileRepository,
    @Inject('UserRepository') private readonly userModel: UserRepository,

    private readonly notificationsService: NotificationsService,
    private readonly jwtService: JwtService,
  ) {}

  // ==========================================
  // MODULE 1: EVENT BUS, OPERATIONS & CORE
  // ==========================================

  async logActivity(eventType: string, userId?: string, providerId?: string, metadata: Record<string, any> = {}) {
    return this.activityModel.create({
      eventType,
      userId,
      providerId,
      metadata,
      timestamp: new Date(),
    });
  }

  @OnEvent('appointment.created')
  async onAppointmentCreated(payload: any) {
    this.logger.log(`Event Listener: appointment.created triggered`);
    await this.logActivity('appointment.created', payload.patient_id, payload.doctor_id, payload);
    await this.notificationsService.create({
      user_id: payload.patient_id,
      title_key: 'notification.appointment.created.title',
      body_key: 'notification.appointment.created.body',
      type: NotificationType.INFO,
      priority: NotificationPriority.NORMAL,
    });
  }

  @OnEvent('order.cancelled')
  async onOrderCancelled(payload: any) {
    this.logger.log(`Event Listener: order.cancelled triggered`);
    await this.logActivity('order.cancelled', payload.patient_id, payload.provider_id, payload);
    await this.notificationsService.create({
      user_id: payload.patient_id,
      title_key: 'notification.order.cancelled.title',
      body_key: 'notification.order.cancelled.body',
      type: NotificationType.ALERT,
      priority: NotificationPriority.HIGH,
    });
  }

  @OnEvent('prescription.issued')
  async onPrescriptionIssued(payload: any) {
    this.logger.log(`Event Listener: prescription.issued triggered`);
    await this.logActivity('prescription.issued', payload.patient_id, payload.doctor_id, payload);
    await this.notificationsService.create({
      user_id: payload.patient_id,
      title_key: 'notification.prescription.issued.title',
      body_key: 'notification.prescription.issued.body',
      type: NotificationType.INFO,
      priority: NotificationPriority.NORMAL,
    });
  }

  // Wallet
  async getWalletBalance(ownerId: string, ownerType: 'patient' | 'provider'): Promise<number> {
    const wallet = await this.walletModel.findOne({ ownerId, ownerType });
    return wallet ? wallet.balance : 0;
  }

  async processWalletTransaction(opts: {
    ownerId: string;
    ownerType: 'patient' | 'provider';
    amount: number;
    type: 'credit' | 'debit';
    referenceType: 'booking' | 'refund' | 'referral';
    referenceId: string;
    description: string;
  }) {
    let wallet = await this.walletModel.findOne({ ownerId: opts.ownerId, ownerType: opts.ownerType });
    if (!wallet) {
      wallet = await this.walletModel.create({
        ownerId: opts.ownerId,
        ownerType: opts.ownerType,
        balance: 0,
      });
    }

    if (opts.type === 'debit' && wallet.balance < opts.amount) {
      throw new BadRequestException('Insufficient wallet balance');
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

  // Referral
  async generateReferralCode(ownerId: string): Promise<string> {
    const existing = await this.referralCodeModel.findOne({ ownerId });
    if (existing) return existing.code;

    const code = `NABD-${ownerId.substring(0, 5).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    await this.referralCodeModel.create({ ownerId, code, useCount: 0 });
    return code;
  }

  async claimReferral(refereeId: string, code: string) {
    const referralCode = await this.referralCodeModel.findOne({ code });
    if (!referralCode) throw new NotFoundException('Referral code not found');
    if (referralCode.ownerId === refereeId) throw new BadRequestException('Cannot use your own referral code');

    const alreadyRewarded = await this.referralRewardModel.findOne({ refereeId });
    if (alreadyRewarded) throw new BadRequestException('Referral reward already claimed');

    // Create reward record
    const reward = await this.referralRewardModel.create({
      referrerId: referralCode.ownerId,
      refereeId,
      rewardType: 'wallet',
      amount: 50, // 50 SAR bonus
      status: 'completed',
    });

    referralCode.useCount += 1;
    await referralCode.save();

    // Credit referrer wallet
    await this.processWalletTransaction({
      ownerId: referralCode.ownerId,
      ownerType: 'patient',
      amount: 50,
      type: 'credit',
      referenceType: 'referral',
      referenceId: reward.id,
      description: `Referral bonus for recruiting user ${refereeId}`,
    });

    // Credit referee wallet
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

  // Feature Flags
  async getFlags() {
    return this.featureFlagModel.find();
  }

  async updateFlag(flagName: string, isEnabled: boolean, updatedBy?: string) {
    let flag = await this.featureFlagModel.findOne({ flagName });
    if (!flag) {
      flag = new this.featureFlagModel({ flagName });
    }
    flag.isEnabled = isEnabled;
    flag.updatedBy = updatedBy;
    return flag.save();
  }

  // ==========================================
  // MODULE 2: MEDICAL, PATHWAYS & DIAGNOSTICS
  // ==========================================

  async getTimeline(patientId: string) {
    // Queries all clinical data for the patient and returns sorted
    const appointments = await this.appointmentModel.find({ patient_id: patientId }).lean() as any[];
    const prescriptions = await this.prescriptionModel.find({ patient_id: patientId }).lean() as any[];
    const labResults = await this.labResultModel.find({ patient_id: patientId }).lean() as any[];
    const vitals = await this.vitalModel.find({ patient_id: patientId }).lean() as any[];

    const feed = [
      ...appointments.map((a) => ({ id: a.id, date: a.createdAt || new Date(), kind: 'appointment', details: a })),
      ...prescriptions.map((p) => ({ id: p.id, date: p.createdAt || new Date(), kind: 'prescription', details: p })),
      ...labResults.map((l) => ({ id: l.id, date: l.createdAt || new Date(), kind: 'lab_result', details: l })),
      ...vitals.map((v) => ({ id: v.id, date: v.measured_at || v.createdAt || new Date(), kind: 'vital', details: v })),
    ];

    return feed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getHealthPassport(patientId: string) {
    const user = await this.userModel.findOne({ id: patientId });
    if (!user) throw new NotFoundException('Patient not found');

    const medicalProfile = await this.userModel.db.model('MedicalProfile').findOne({ patient_id: patientId }).lean() as any;

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

    // Sign passport secure token
    const token = await this.jwtService.signAsync(passportData);

    return {
      passport: passportData,
      verificationToken: token,
      qrContent: `nabd://passport/verify?token=${token}`,
    };
  }

  // Care Program
  async enrollProgram(patientId: string, programType: 'diabetes' | 'hypertension' | 'pregnancy') {
    const existing = await this.treatmentProgramModel.findOne({ patientId, programType });
    if (existing) return existing;

    const nextSchedule = new Date();
    nextSchedule.setDate(nextSchedule.getDate() + 7); // Schedule next milestone step in 7 days

    return this.treatmentProgramModel.create({
      patientId,
      programType,
      status: 'active',
      completedSteps: [],
      nextSchedule,
    });
  }

  async getActivePrograms(patientId: string) {
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
    // If no enrollment, return the master programs with 0 completed sessions.
    // If enrolled, merge with their progress.

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

  async completeProgramSession(patientId: string, programType: string, sessionId: string) {
    let program = await this.treatmentProgramModel.findOne({ patientId, programType });
    if (!program) {
      program = await this.enrollProgram(patientId, programType as any);
    }
    if (!program.completedSteps.includes(sessionId)) {
      program.completedSteps.push(sessionId);
      await program.save();
    }
    return this.getActivePrograms(patientId);
  }

  // ==========================================
  // MODULE 3: PROVIDER PERFORMANCE & SLAs
  // ==========================================

  // Smart Matching
  async matchPharmacy(lat: number, lng: number, requiredMedName: string) {
    // GeoJSON near aggregation or Haversine fallback to find closest pharmacy with inventory
    const pharmacies = await this.providerProfileModel.find({ type: 'pharmacy', status: 'verified' }).lean();
    const matches = [];

    for (const p of pharmacies) {
      // Check inventory if item name is provided
      let hasInventory = true;
      if (requiredMedName) {
        const item = await this.userModel.db.model('InventoryItem').findOne({
          providerId: p.id,
          drugName: { $regex: new RegExp(requiredMedName, 'i') },
          quantity: { $gt: 0 },
        });
        if (!item) hasInventory = false;
      }

      if (hasInventory) {
        // Calculate distance in km
        const dist = p.location ? this.haversine(lat, lng, p.location.lat, p.location.lng) / 1000 : 9999;
        matches.push({
          provider: p,
          distanceKm: dist,
        });
      }
    }

    return matches.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  async matchNurse(lat: number, lng: number) {
    const nurses = await this.providerProfileModel.find({ type: 'nurse', status: 'verified' }).lean();
    const matches = [];

    for (const n of nurses) {
      // Check real-time check-in availability (mocked field or check shift)
      const dist = n.location ? this.haversine(lat, lng, n.location.lat, n.location.lng) / 1000 : 9999;
      matches.push({
        provider: n,
        distanceKm: dist,
      });
    }

    return matches.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  // SLA Cron running every 1 minute
  @Cron('*/1 * * * *')
  async runSlaAudit() {
    this.logger.log('Running SLA Audit Cron job...');
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 3); // 3 minutes SLA limit

    // Find pending orders assigned over SLA limit
    const orders = await this.orderModel.find({
      state: 'CREATED',
      createdAt: { $lt: fiveMinutesAgo },
    });

    for (const o of orders as any[]) {
      this.logger.warn(`SLA Breach: Order ${o.id} exceeded response threshold`);
      
      // Log breach
      await this.slaLogModel.create({
        providerId: o.pharmacy_id || 'unknown_provider',
        orderId: o.id,
        durationSeconds: 180,
        slaLimit: 180,
        isBreached: true,
      });

      // Route to next pharmacy / provider
      o.state = 'REJECTED';
      await o.save();

      // Emit event for routing retrigger
      // (Normally triggers workflow engine re-assignment)
    }
  }

  // Provider Ranking
  async rankProviders(lat: number, lng: number, type: string) {
    const list = await this.providerProfileModel.find({ type, status: 'verified' }).lean();
    const ranked = [];

    for (const p of list) {
      const distance = p.location ? this.haversine(lat, lng, p.location.lat, p.location.lng) / 1000 : 10;
      
      const rating = Number((p as any).rating ?? 0);
      const slaRate = Number((p as any).sla_rate ?? 0);
      const cancellationRate = Number((p as any).cancellation_rate ?? 0);
      const isSponsored = (p as any).is_sponsored || false;

      // Score = (Rating * 40) + (SlaRate * 30) - (DistanceInKm * 10) + (IsSponsored ? 100 : 0) - (CancellationRate * 20)
      const score = (rating * 40) + (slaRate * 100 * 30 / 100) - (distance * 10) + (isSponsored ? 100 : 0) - (cancellationRate * 100 * 20 / 100);

      ranked.push({
        provider: p,
        distanceKm: distance,
        score,
      });
    }

    return ranked.sort((a, b) => b.score - a.score);
  }

  // AI Fraud Detection
  async detectFraud() {
    this.logger.warn('Fraud detection rules are not configured; no fabricated fraud alerts will be created.');
    return [];
  }

  // ==========================================
  // MODULE 4: WORKFLOWS
  // ==========================================

  async verifyNurseAttendance(nurseId: string, visitId: string, lat: number, lng: number): Promise<{ success: boolean; distanceM: number }> {
    // Find home-care booking to verify location
    const booking = await this.userModel.db.model('HomeCareBooking').findOne({ id: visitId }).lean() as any;
    if (!booking) throw new NotFoundException('Home care visit booking not found');

    const patientLoc = booking.location || booking.address;
    if (!patientLoc || !Number.isFinite(patientLoc.lat) || !Number.isFinite(patientLoc.lng)) {
      throw new BadRequestException('A verified visit location is required before nurse attendance can be checked');
    }
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

  async getNursingChecklist(visitId: string) {
    const booking = await this.userModel.db.model('HomeCareBooking').findOne({ id: visitId }).lean() as any;
    if (!booking) throw new NotFoundException('Visit not found');
    return {
      visitId,
      checklist: booking.checklist || []
    };
  }

  // Expiry notifications cron checking inventory for items expiring in less than 90 days
  @Cron('0 0 * * *') // Daily at midnight
  async checkInventoryExpiry() {
    this.logger.log('Checking inventory expiry schedules...');
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const expiringItems = await this.userModel.db.model('InventoryItem').find({
      expiryDate: { $lt: ninetyDaysFromNow },
    });

    for (const item of expiringItems) {
      await this.notificationsService.create({
        user_id: item.providerId,
        title_key: 'notification.inventory.expiry.title',
        body_key: 'notification.inventory.expiry.body',
        params: { drugName: item.drugName, expiryDate: item.expiryDate.toDateString() },
        type: NotificationType.ALERT,
        priority: NotificationPriority.NORMAL,
      });
    }
  }

  async getExpiringInventory() {
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const expiringItems = await this.userModel.db.model('InventoryItem').find({
      expiryDate: { $lt: ninetyDaysFromNow },
    }).lean();

    return {
      expiringSoon: expiringItems
    };
  }

  // Laboratory checks and alerts
  async verifyLabResultRanges(sampleId: string, actualValue: number) {
    const sample = await this.userModel.db.model('LabSample').findOne({ sampleId });
    if (!sample) throw new NotFoundException('Lab sample not found');

    sample.actualValue = actualValue;
    sample.status = 'completed';
    await sample.save();

    let isCritical = false;
    if (actualValue < sample.criticalMin || actualValue > sample.criticalMax) {
      isCritical = true;
      // High-priority alert dispatching
      await this.notificationsService.create({
        user_id: sample.patientId,
        title_key: 'notification.labs.critical.title',
        body_key: 'notification.labs.critical.body',
        params: { testName: sample.testName, actualValue },
        type: NotificationType.ALERT,
        priority: NotificationPriority.HIGH,
      });
    }

    return { sample, isCritical };
  }

  // ==========================================
  // MODULE 5: ANALYTICS, ADS & CORPORATES
  // ==========================================

  // Heatmap Aggregation demand density grouped by coordinates and categories
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

  // Corporate accounts coverage limit checking
  async verifyCorporateCredit(companyName: string, employeeId: string, requestedAmount: number): Promise<{ approved: boolean; limitRemaining: number }> {
    const corp = await this.corporateModel.findOne({ companyName });
    if (!corp) throw new NotFoundException('Corporate account not found');

    if (corp.usedCredit + requestedAmount > corp.individualCreditLimit) {
      return { approved: false, limitRemaining: corp.individualCreditLimit - corp.usedCredit };
    }

    corp.usedCredit += requestedAmount;
    await corp.save();

    return { approved: true, limitRemaining: corp.individualCreditLimit - corp.usedCredit };
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // meters
  }
}
