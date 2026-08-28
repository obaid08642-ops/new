import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from '../notifications/notifications.service';
import { UniversalActivityDocument } from '../../schemas/universal-activity.schema';
import { WalletTransactionDocument } from '../../schemas/wallet.schema';
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
export declare class NabdExtensionsService {
    private readonly activityModel;
    private readonly walletModel;
    private readonly walletTxModel;
    private readonly referralCodeModel;
    private readonly referralRewardModel;
    private readonly featureFlagModel;
    private readonly treatmentProgramModel;
    private readonly slaLogModel;
    private readonly fraudAlertModel;
    private readonly adPlacementModel;
    private readonly corporateModel;
    private readonly appointmentModel;
    private readonly prescriptionModel;
    private readonly labResultModel;
    private readonly vitalModel;
    private readonly orderModel;
    private readonly providerProfileModel;
    private readonly userModel;
    private readonly notificationsService;
    private readonly jwtService;
    private readonly logger;
    constructor(activityModel: UniversalActivityRepository, walletModel: WalletRepository, walletTxModel: WalletTransactionRepository, referralCodeModel: ReferralCodeRepository, referralRewardModel: ReferralRewardRepository, featureFlagModel: FeatureFlagRepository, treatmentProgramModel: TreatmentProgramRepository, slaLogModel: SlaLogRepository, fraudAlertModel: FraudAlertRepository, adPlacementModel: AdPlacementRepository, corporateModel: CorporateAccountRepository, appointmentModel: AppointmentRepository, prescriptionModel: PrescriptionRepository, labResultModel: LabResultRepository, vitalModel: VitalReadingRepository, orderModel: OrderRepository, providerProfileModel: ProviderProfileRepository, userModel: UserRepository, notificationsService: NotificationsService, jwtService: JwtService);
    logActivity(eventType: string, userId?: string, providerId?: string, metadata?: Record<string, any>): Promise<UniversalActivityDocument>;
    onAppointmentCreated(payload: any): Promise<void>;
    onOrderCancelled(payload: any): Promise<void>;
    onPrescriptionIssued(payload: any): Promise<void>;
    getWalletBalance(ownerId: string, ownerType: 'patient' | 'provider'): Promise<number>;
    processWalletTransaction(opts: {
        ownerId: string;
        ownerType: 'patient' | 'provider';
        amount: number;
        type: 'credit' | 'debit';
        referenceType: 'booking' | 'refund' | 'referral';
        referenceId: string;
        description: string;
    }): Promise<WalletTransactionDocument>;
    generateReferralCode(ownerId: string): Promise<string>;
    claimReferral(refereeId: string, code: string): Promise<{
        success: boolean;
        rewardAmount: number;
    }>;
    getFlags(): Promise<any>;
    updateFlag(flagName: string, isEnabled: boolean, updatedBy?: string): Promise<any>;
    getTimeline(patientId: string): Promise<{
        id: any;
        date: any;
        kind: string;
        details: any;
    }[]>;
    getHealthPassport(patientId: string): Promise<{
        passport: {
            patientId: string;
            name: any;
            bloodType: any;
            chronicDiseases: any;
            allergies: any;
            timestamp: Date;
        };
        verificationToken: string;
        qrContent: string;
    }>;
    enrollProgram(patientId: string, programType: 'diabetes' | 'hypertension' | 'pregnancy'): Promise<any>;
    getActivePrograms(patientId: string): Promise<{
        completedSessions: any;
        nextSessionDate: any;
        nextSessionTime: string;
        nextSessionTitle: string;
        sessionsList: {
            status: string;
            id: number;
            title: string;
        }[];
        id: string;
        title: string;
        duration: string;
        totalSessions: number;
        milestoneReward: string;
        rewardDesc: string;
    }[]>;
    completeProgramSession(patientId: string, programType: string, sessionId: string): Promise<{
        completedSessions: any;
        nextSessionDate: any;
        nextSessionTime: string;
        nextSessionTitle: string;
        sessionsList: {
            status: string;
            id: number;
            title: string;
        }[];
        id: string;
        title: string;
        duration: string;
        totalSessions: number;
        milestoneReward: string;
        rewardDesc: string;
    }[]>;
    matchPharmacy(lat: number, lng: number, requiredMedName: string): Promise<any[]>;
    matchNurse(lat: number, lng: number): Promise<any[]>;
    runSlaAudit(): Promise<void>;
    rankProviders(lat: number, lng: number, type: string): Promise<any[]>;
    detectFraud(): Promise<any[]>;
    verifyNurseAttendance(nurseId: string, visitId: string, lat: number, lng: number): Promise<{
        success: boolean;
        distanceM: number;
    }>;
    getNursingChecklist(visitId: string): Promise<{
        visitId: string;
        checklist: any;
    }>;
    checkInventoryExpiry(): Promise<void>;
    getExpiringInventory(providerAccountId: string): Promise<{
        expiringSoon: any;
    }>;
    verifyLabResultRanges(sampleId: string, actualValue: number): Promise<{
        sample: any;
        isCritical: boolean;
    }>;
    getHeatmaps(): Promise<any>;
    verifyCorporateCredit(companyName: string, employeeId: string, requestedAmount: number): Promise<{
        approved: boolean;
        limitRemaining: number;
    }>;
    private haversine;
}
