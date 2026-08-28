import { MentalHealthService } from './mental-health.service';
export declare class MentalHealthController {
    private readonly mentalHealthService;
    constructor(mentalHealthService: MentalHealthService);
    private patientId;
    logMood(req: any, body: any): Promise<any>;
    getMoodHistory(req: any, days?: string): Promise<any>;
    getMoodStats(req: any): Promise<{
        total_entries: number;
        avg_mood: number;
        avg_energy: number;
        avg_stress: number;
        avg_sleep: number;
    }>;
    logMeditation(req: any, body: any): Promise<any>;
    getMeditationHistory(req: any): Promise<any>;
    getMeditationStats(req: any): Promise<{
        total_sessions: number;
        completed_sessions: number;
        total_minutes: any;
    }>;
    logBreathing(req: any, body: any): Promise<any>;
    getBreathingHistory(req: any): Promise<any>;
    getCrisisContacts(req: any): Promise<{
        user_contacts: any;
    }>;
    addCrisisContact(req: any, body: any): Promise<any>;
    deleteCrisisContact(req: any, id: string): Promise<{
        deleted: boolean;
    }>;
    getDashboard(req: any): Promise<{
        mood: {
            total_entries: number;
            avg_mood: number;
            avg_energy: number;
            avg_stress: number;
            avg_sleep: number;
        };
        meditation: {
            total_sessions: number;
            completed_sessions: number;
            total_minutes: any;
        };
        recent_moods: any;
    }>;
}
