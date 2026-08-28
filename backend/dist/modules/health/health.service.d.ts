import { EventEmitter2 } from '@nestjs/event-emitter';
import { Connection } from 'mongoose';
import { VitalReadingRepository } from "./repositories/vitalreading.repository";
import { MedicationReminderRepository } from "./repositories/medicationreminder.repository";
import { SleepReadingRepository } from "./repositories/sleepreading.repository";
import { OrdersService } from '../orders/orders.service';
export declare class HealthService {
    private readonly vitals;
    private readonly reminders;
    private readonly sleepModel;
    private readonly orders;
    private readonly conn;
    private readonly events?;
    constructor(vitals: VitalReadingRepository, reminders: MedicationReminderRepository, sleepModel: SleepReadingRepository, orders: OrdersService, conn: Connection, events?: EventEmitter2);
    private normalizeVitalType;
    private normalizeVitalInput;
    addVital(user: any, data: any): Promise<any>;
    defaultUnit(t: string): string;
    listVitals(user: any, type?: string, limit?: number): Promise<any>;
    listVitalsLog(user: any, limit?: number): Promise<{
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
    vitalsChart(user: any, type: string): Promise<Record<string, number[]>>;
    vitalsRecent(user: any, type: string, limit?: number): Promise<any>;
    latestVitals(user: any): Promise<any>;
    vitalsSummary(user: any): Promise<{
        key: string;
        icon: string;
        label: string;
        value: string;
        unit: any;
        measured_at: any;
        color: string;
    }[]>;
    healthScore(user: any): Promise<{
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
    deleteVital(user: any, id: string): Promise<{
        ok: boolean;
    }>;
    updateVital(user: any, id: string, data: any): Promise<any>;
    private validateReminderTimezone;
    private normalizeReminderTimes;
    private localDayKey;
    private normalizeReminderInput;
    createReminder(user: any, data: any): Promise<any>;
    fromOrder(user: any, orderItems: any[], orderId: string): Promise<any[]>;
    listReminders(user: any, active?: boolean): Promise<any>;
    logReminder(user: any, id: string, status: 'taken' | 'skipped' | 'missed', time_key: string, occurred_at?: string): Promise<any>;
    toggleReminder(user: any, id: string, active: boolean): Promise<any>;
    updateReminder(user: any, id: string, patch: any): Promise<any>;
    deleteReminder(user: any, id: string): Promise<{
        ok: boolean;
    }>;
    prepareRefill(user: any, id: string): Promise<{
        reminder: any;
        items: {
            medicine_id: any;
            name_ar: any;
            name_en: any;
            qty: number;
        }[];
    }>;
    refillNow(_user: any, _id: string): Promise<never>;
    snoozeRefill(user: any, id: string, days?: number): Promise<any>;
    cancelChronic(user: any, id: string): Promise<any>;
    listRemindersEnriched(user: any, active?: boolean): Promise<any[]>;
    addSleep(user: any, data: any): Promise<any>;
    listSleep(user: any, limit?: number): Promise<any>;
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
    addEmergencyContact(user: any, data: any): Promise<any>;
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
