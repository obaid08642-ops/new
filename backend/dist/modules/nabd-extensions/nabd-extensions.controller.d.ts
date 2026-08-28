import { NabdExtensionsService } from './nabd-extensions.service';
export declare class NabdExtensionsController {
    private readonly svc;
    constructor(svc: NabdExtensionsService);
    markNotificationRead(id: string, user: any): Promise<import("../../schemas/universal-activity.schema").UniversalActivityDocument>;
    getWalletBalance(user: any): Promise<{
        balance: number;
    }>;
    creditWallet(user: any, body: any): Promise<import("../../schemas/wallet.schema").WalletTransactionDocument>;
    debitWallet(user: any, body: any): Promise<import("../../schemas/wallet.schema").WalletTransactionDocument>;
    getReferralCode(user: any): Promise<{
        code: string;
    }>;
    claimReferral(user: any, body: {
        code: string;
    }): Promise<{
        success: boolean;
        rewardAmount: number;
    }>;
    getFlags(): Promise<any>;
    updateFlag(admin: any, body: {
        flagName: string;
        isEnabled: boolean;
    }): Promise<any>;
    getTimeline(user: any): Promise<{
        id: any;
        date: any;
        kind: string;
        details: any;
    }[]>;
    getPassport(user: any): Promise<{
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
    enrollProgram(user: any, body: {
        programType: 'diabetes' | 'hypertension' | 'pregnancy';
    }): Promise<any>;
    getActivePrograms(user: any): Promise<{
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
    completeSession(user: any, body: {
        programType: string;
        sessionId: string;
    }): Promise<{
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
    matchPharmacy(body: {
        lat: number;
        lng: number;
        requiredMedName?: string;
    }): Promise<any[]>;
    matchNurse(body: {
        lat: number;
        lng: number;
    }): Promise<any[]>;
    getProviderRankings(lat: string, lng: string, type: string): Promise<any[]>;
    getFraudAlerts(): Promise<any[]>;
    verifyNurseAttendance(nurse: any, body: {
        visitId: string;
        lat: number;
        lng: number;
    }): Promise<{
        success: boolean;
        distanceM: number;
    }>;
    getNursingChecklist(visitId: string): Promise<{
        visitId: string;
        checklist: any;
    }>;
    respondToBroadcast(provider: any, body: any): Promise<{
        success: boolean;
        message: string;
    }>;
    getExpiringInventory(provider: any): Promise<{
        expiringSoon: any;
    }>;
    verifyBarcode(staff: any, body: {
        sampleId: string;
        barcodeId: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    verifyLabResults(body: {
        sampleId: string;
        actualValue: number;
    }): Promise<{
        sample: any;
        isCritical: boolean;
    }>;
    getHeatmaps(): Promise<any>;
    placeAdBid(provider: any, body: any): Promise<{
        success: boolean;
        message: string;
    }>;
    enrollCorporate(user: any, body: {
        companyName: string;
        employeeId: string;
        requestedAmount: number;
    }): Promise<{
        approved: boolean;
        limitRemaining: number;
    }>;
}
