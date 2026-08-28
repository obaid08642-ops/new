import { BreathingSession, CrisisContact, MeditationSession, MoodEntry } from '../../schemas/mental-health.schema';
import { MoodEntryRepository } from './repositories/moodentry.repository';
import { MeditationSessionRepository } from './repositories/meditationsession.repository';
import { BreathingSessionRepository } from './repositories/breathingsession.repository';
import { CrisisContactRepository } from './repositories/crisiscontact.repository';
export declare class MentalHealthService {
    private readonly moodModel;
    private readonly meditationModel;
    private readonly breathingModel;
    private readonly crisisModel;
    constructor(moodModel: MoodEntryRepository, meditationModel: MeditationSessionRepository, breathingModel: BreathingSessionRepository, crisisModel: CrisisContactRepository);
    private requirePatientId;
    private parseEventDate;
    private optionalScale;
    private normaliseMoodInput;
    logMood(userId: string, data: Partial<MoodEntry>): Promise<any>;
    getMoodHistory(userId: string, days?: number): Promise<any>;
    getMoodStats(userId: string): Promise<{
        total_entries: number;
        avg_mood: number;
        avg_energy: number;
        avg_stress: number;
        avg_sleep: number;
    }>;
    logMeditation(userId: string, data: Partial<MeditationSession>): Promise<any>;
    getMeditationHistory(userId: string): Promise<any>;
    getMeditationStats(userId: string): Promise<{
        total_sessions: number;
        completed_sessions: number;
        total_minutes: any;
    }>;
    logBreathing(userId: string, data: Partial<BreathingSession>): Promise<any>;
    getBreathingHistory(userId: string): Promise<any>;
    getCrisisContacts(userId: string): Promise<{
        user_contacts: any;
    }>;
    addCrisisContact(userId: string, data: Partial<CrisisContact>): Promise<any>;
    deleteCrisisContact(userId: string, contactId: string): Promise<{
        deleted: boolean;
    }>;
    getDashboard(userId: string): Promise<{
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
