// @ts-nocheck
import {
  Injectable,
  NotFoundException,
  BadRequestException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import {
  MoodEntry,
  MoodEntryDocument,
  MeditationSession,
  MeditationSessionDocument,
  BreathingSession,
  BreathingSessionDocument,
  SelfAssessment,
  SelfAssessmentDocument,
  CrisisContact,
  CrisisContactDocument,
  MOOD_SCORE_MAP,
  Severity,
  AssessmentType,
} from '../../schemas/mental-health.schema';
import { MoodEntryRepository } from "./repositories/moodentry.repository";
import { MeditationSessionRepository } from "./repositories/meditationsession.repository";
import { BreathingSessionRepository } from "./repositories/breathingsession.repository";
import { SelfAssessmentRepository } from "./repositories/selfassessment.repository";
import { CrisisContactRepository } from "./repositories/crisiscontact.repository";

@Injectable()
export class MentalHealthService {
  constructor(
    
    @Inject('MoodEntryRepository') private readonly moodModel: MoodEntryRepository,
    
    @Inject('MeditationSessionRepository') private readonly meditationModel: MeditationSessionRepository,
    
    @Inject('BreathingSessionRepository') private readonly breathingModel: BreathingSessionRepository,
    
    @Inject('SelfAssessmentRepository') private readonly assessmentModel: SelfAssessmentRepository,
    
    @Inject('CrisisContactRepository') private readonly crisisModel: CrisisContactRepository,
  ) {}

  /* ═══════════════════════════════════════
     MOOD
     ═══════════════════════════════════════ */

  async logMood(userId: string, data: Partial<MoodEntry>) {
    try {
      const entry = await this.moodModel.create({
        patient_id: userId,
        mood: data.mood,
        energy_level: data.energy_level,
        stress_level: data.stress_level,
        sleep_hours: data.sleep_hours,
        notes: data.notes ?? '',
        tags: data.tags ?? [],
        logged_at: data.logged_at ?? new Date(),
      });
      return entry.toObject();
    } catch (err) {
      throw new BadRequestException(
        'تعذّر حفظ الحالة المزاجية / Could not save mood entry',
      );
    }
  }

  async getMoodHistory(userId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.moodModel
      .find({ patient_id: userId, logged_at: { $gte: since } })
      .sort({ logged_at: -1 })
      .lean();
  }

  async getMoodStats(userId: string) {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const entries = await this.moodModel
      .find({ patient_id: userId, logged_at: { $gte: since } })
      .lean();

    if (!entries.length) {
      return {
        total_entries: 0,
        avg_mood: 0,
        avg_energy: 0,
        avg_stress: 0,
        avg_sleep: 0,
        message_ar: 'لا توجد بيانات خلال آخر 30 يوماً',
        message_en: 'No data in the last 30 days',
      };
    }

    const sum = entries.reduce(
      (acc, e) => {
        acc.mood += MOOD_SCORE_MAP[e.mood] ?? 3;
        acc.energy += e.energy_level;
        acc.stress += e.stress_level;
        acc.sleep += e.sleep_hours;
        return acc;
      },
      { mood: 0, energy: 0, stress: 0, sleep: 0 },
    );

    const n = entries.length;
    return {
      total_entries: n,
      avg_mood: +(sum.mood / n).toFixed(2),
      avg_energy: +(sum.energy / n).toFixed(2),
      avg_stress: +(sum.stress / n).toFixed(2),
      avg_sleep: +(sum.sleep / n).toFixed(2),
    };
  }

  /* ═══════════════════════════════════════
     MEDITATION
     ═══════════════════════════════════════ */

  async logMeditation(userId: string, data: Partial<MeditationSession>) {
    try {
      const session = await this.meditationModel.create({
        patient_id: userId,
        type: data.type,
        duration_minutes: data.duration_minutes,
        completed: data.completed ?? false,
        logged_at: data.logged_at ?? new Date(),
      });
      return session.toObject();
    } catch (err) {
      throw new BadRequestException(
        'تعذّر حفظ جلسة التأمل / Could not save meditation session',
      );
    }
  }

  async getMeditationHistory(userId: string) {
    return this.meditationModel
      .find({ patient_id: userId })
      .sort({ logged_at: -1 })
      .limit(30)
      .lean();
  }

  async getMeditationStats(userId: string) {
    const sessions = await this.meditationModel
      .find({ patient_id: userId })
      .sort({ logged_at: -1 })
      .lean();

    const completed = sessions.filter((s) => s.completed);
    const totalMinutes = completed.reduce(
      (sum, s) => sum + (s.duration_minutes ?? 0),
      0,
    );

    // Calculate streak (consecutive days)
    let streak = 0;
    if (completed.length) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const uniqueDays = new Set(
        completed.map((s) => {
          const d = new Date(s.logged_at);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        }),
      );

      const sortedDays = Array.from(uniqueDays).sort((a, b) => b - a);
      const oneDayMs = 24 * 60 * 60 * 1000;

      // Allow streak to start from today or yesterday
      const latestDay = sortedDays[0];
      if (today.getTime() - latestDay <= oneDayMs) {
        streak = 1;
        for (let i = 1; i < sortedDays.length; i++) {
          if (sortedDays[i - 1] - sortedDays[i] === oneDayMs) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    return {
      total_sessions: sessions.length,
      completed_sessions: completed.length,
      total_minutes: totalMinutes,
      current_streak_days: streak,
    };
  }

  /* ═══════════════════════════════════════
     BREATHING
     ═══════════════════════════════════════ */

  async logBreathing(userId: string, data: Partial<BreathingSession>) {
    try {
      const session = await this.breathingModel.create({
        patient_id: userId,
        technique: data.technique,
        rounds: data.rounds,
        duration_seconds: data.duration_seconds,
        logged_at: data.logged_at ?? new Date(),
      });
      return session.toObject();
    } catch (err) {
      throw new BadRequestException(
        'تعذّر حفظ جلسة التنفس / Could not save breathing session',
      );
    }
  }

  async getBreathingHistory(userId: string) {
    return this.breathingModel
      .find({ patient_id: userId })
      .sort({ logged_at: -1 })
      .limit(30)
      .lean();
  }

  /* ═══════════════════════════════════════
     SELF-ASSESSMENT
     ═══════════════════════════════════════ */

  private interpretSeverity(
    type: AssessmentType,
    score: number,
  ): { severity: Severity; message_ar: string; message_en: string } {
    // PHQ-9 scoring
    if (type === AssessmentType.PHQ9) {
      if (score <= 4)
        return {
          severity: Severity.MINIMAL,
          message_ar: 'الحد الأدنى من أعراض الاكتئاب',
          message_en: 'Minimal depression symptoms',
        };
      if (score <= 9)
        return {
          severity: Severity.MILD,
          message_ar: 'أعراض اكتئاب خفيفة',
          message_en: 'Mild depression symptoms',
        };
      if (score <= 14)
        return {
          severity: Severity.MODERATE,
          message_ar: 'أعراض اكتئاب متوسطة',
          message_en: 'Moderate depression symptoms',
        };
      if (score <= 19)
        return {
          severity: Severity.MODERATELY_SEVERE,
          message_ar: 'أعراض اكتئاب متوسطة إلى شديدة',
          message_en: 'Moderately severe depression',
        };
      return {
        severity: Severity.SEVERE,
        message_ar: 'أعراض اكتئاب شديدة',
        message_en: 'Severe depression symptoms',
      };
    }

    // GAD-7 scoring
    if (type === AssessmentType.GAD7) {
      if (score <= 4)
        return {
          severity: Severity.MINIMAL,
          message_ar: 'الحد الأدنى من أعراض القلق',
          message_en: 'Minimal anxiety symptoms',
        };
      if (score <= 9)
        return {
          severity: Severity.MILD,
          message_ar: 'أعراض قلق خفيفة',
          message_en: 'Mild anxiety symptoms',
        };
      if (score <= 14)
        return {
          severity: Severity.MODERATE,
          message_ar: 'أعراض قلق متوسطة',
          message_en: 'Moderate anxiety symptoms',
        };
      return {
        severity: Severity.SEVERE,
        message_ar: 'أعراض قلق شديدة',
        message_en: 'Severe anxiety symptoms',
      };
    }

    // PSS / General — generic thresholds
    if (score <= 13)
      return {
        severity: Severity.MINIMAL,
        message_ar: 'ضغط نفسي منخفض',
        message_en: 'Low perceived stress',
      };
    if (score <= 26)
      return {
        severity: Severity.MODERATE,
        message_ar: 'ضغط نفسي متوسط',
        message_en: 'Moderate perceived stress',
      };
    return {
      severity: Severity.SEVERE,
      message_ar: 'ضغط نفسي مرتفع',
      message_en: 'High perceived stress',
    };
  }

  async submitAssessment(userId: string, data: Partial<SelfAssessment>) {
    const type = data.assessment_type ?? AssessmentType.GENERAL;
    const score = data.score ?? 0;
    const maxScore = data.max_score ?? 27;

    const interpretation = this.interpretSeverity(type, score);

    try {
      const entry = await this.assessmentModel.create({
        patient_id: userId,
        assessment_type: type,
        score,
        max_score: maxScore,
        severity: interpretation.severity,
        answers: data.answers ?? [],
        completed_at: data.completed_at ?? new Date(),
      });

      return {
        ...entry.toObject(),
        interpretation,
      };
    } catch (err) {
      throw new BadRequestException(
        'تعذّر حفظ التقييم الذاتي / Could not save self-assessment',
      );
    }
  }

  async getAssessmentHistory(userId: string, type?: string) {
    const filter: any = { patient_id: userId };
    if (type) filter.assessment_type = type;

    return this.assessmentModel.find(filter).sort({ completed_at: -1 }).lean();
  }

  /* ═══════════════════════════════════════
     CRISIS CONTACTS
     ═══════════════════════════════════════ */

  private getDefaultSaudiEmergencyContacts() {
    return [
      {
        id: 'default-emergency-911',
        contact_name: 'الطوارئ / Emergency',
        phone: '911',
        relationship: 'emergency_service',
        is_professional: true,
        is_default: true,
      },
      {
        id: 'default-mental-health-920033360',
        contact_name: 'خط مساندة للصحة النفسية / Mental Health Helpline',
        phone: '920033360',
        relationship: 'mental_health_helpline',
        is_professional: true,
        is_default: true,
      },
      {
        id: 'default-social-protection-1919',
        contact_name: 'خط الحماية الاجتماعية / Social Protection',
        phone: '1919',
        relationship: 'social_protection',
        is_professional: true,
        is_default: true,
      },
    ];
  }

  async getCrisisContacts(userId: string) {
    const userContacts = await this.crisisModel
      .find({ patient_id: userId })
      .lean();

    return {
      user_contacts: userContacts,
      default_contacts: this.getDefaultSaudiEmergencyContacts(),
    };
  }

  async addCrisisContact(userId: string, data: Partial<CrisisContact>) {
    try {
      const contact = await this.crisisModel.create({
        patient_id: userId,
        contact_name: data.contact_name,
        phone: data.phone,
        relationship: data.relationship ?? '',
        is_professional: data.is_professional ?? false,
      });
      return contact.toObject();
    } catch (err) {
      throw new BadRequestException(
        'تعذّر إضافة جهة الاتصال / Could not add crisis contact',
      );
    }
  }

  async deleteCrisisContact(userId: string, contactId: string) {
    const result = await this.crisisModel.findOneAndDelete({
      patient_id: userId,
      id: contactId,
    });
    if (!result) {
      throw new NotFoundException(
        'جهة الاتصال غير موجودة / Crisis contact not found',
      );
    }
    return { deleted: true };
  }

  /* ═══════════════════════════════════════
     DASHBOARD
     ═══════════════════════════════════════ */

  async getDashboard(userId: string) {
    const [moodStats, meditationStats, recentMoods, recentAssessments] =
      await Promise.all([
        this.getMoodStats(userId),
        this.getMeditationStats(userId),
        this.moodModel
          .find({ patient_id: userId })
          .sort({ logged_at: -1 })
          .limit(7)
          .lean(),
        this.assessmentModel
          .find({ patient_id: userId })
          .sort({ completed_at: -1 })
          .limit(3)
          .lean(),
      ]);

    return {
      mood: moodStats,
      meditation: meditationStats,
      recent_moods: recentMoods,
      recent_assessments: recentAssessments,
    };
  }
}
