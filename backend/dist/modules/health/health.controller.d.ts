import { HealthService } from './health.service';
export declare class HealthModuleController {
    private readonly svc;
    constructor(svc: HealthService);
    list(user: any, t?: string, l?: string): Promise<any>;
    vitalsLog(user: any, limit?: string): Promise<{
        items: {
            context?: any;
            id: any;
            type: any;
            value: any;
            unit: any;
            measured_at: any;
            source: string;
        }[];
    }>;
    vitalsChart(user: any, vital: string): Promise<Record<string, number[]>>;
    vitalsRecent(user: any, vital: string, limit?: string): Promise<any>;
    latest(user: any): Promise<any>;
    summary(user: any): Promise<{
        key: string;
        icon: string;
        label: string;
        value: string;
        unit: any;
        measured_at: any;
        color: string;
    }[]>;
    score(user: any): Promise<{
        score: any;
        status: string;
        components: any[];
        recommendations: string[];
        message: string;
    } | {
        score: number;
        status: string;
        components: any[];
        recommendations: string[];
        message?: undefined;
    }>;
    add(user: any, body: any): Promise<{
        id: any;
    }>;
    edit(user: any, id: string, body: any): Promise<any>;
    del(user: any, id: string): Promise<{
        ok: boolean;
    }>;
    linkWearable(): void;
    unlinkWearable(): void;
    rl(user: any, a?: string): Promise<any>;
    rc(user: any, body: any): Promise<any>;
    rlg(user: any, id: string, body: any): Promise<any>;
    refill(user: any, id: string): Promise<never>;
    refillSnooze(user: any, id: string, body: any): Promise<any>;
    refillCancel(user: any, id: string): Promise<any>;
    rt(user: any, id: string, body: any): Promise<any>;
    rd(user: any, id: string): Promise<{
        ok: boolean;
    }>;
    medicationRefill(user: any, id: string): Promise<never>;
    listSleep(user: any, l?: string): Promise<any>;
    addSleep(user: any, body: any): Promise<any>;
    listReports(user: any): Promise<{
        id: any;
        date: string;
        title: any;
        doctor: any;
        facility: any;
        type: any;
        critical: boolean;
        has_attachments: boolean;
    }[]>;
    listMedicationReminders(user: any): Promise<{
        id: any;
        name: any;
        dose: any;
        time: any;
        times: any;
        time_zone: any;
        frequency: any;
        chronic: boolean;
        instructions: any;
        today_doses: any;
        status: string;
        taken: any;
    }[]>;
    listPrescriptions(user: any): Promise<{
        id: any;
        date: string;
        doctorName: any;
        status: any;
        medications: any;
        items: any;
        isPurchased: boolean;
        isOcr: boolean;
        diagnosis: any;
    }[]>;
    listEmergencyContacts(user: any): Promise<{
        id: any;
        name: any;
        relation: any;
        phone: any;
        isPrimary: boolean;
    }[]>;
    addEmergencyContact(user: any, body: any): Promise<any>;
    removeEmergencyContact(user: any, id: string): Promise<{
        ok: boolean;
    }>;
    listChronicDiseases(user: any): Promise<{
        id: string;
        name: string;
        controlled: any;
        source: string;
    }[]>;
    listChronicMeds(user: any): Promise<{
        id: any;
        name: any;
        dose: any;
        frequency: any;
        times: any;
        time_zone: any;
        pills_remaining: any;
        refill_date: any;
        days_until_refill: any;
        needs_refill_soon: any;
        active: boolean;
    }[]>;
    listTrends(user: any): Promise<any[]>;
}
