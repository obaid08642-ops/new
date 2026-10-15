import { BadRequestException, Injectable, Inject } from '@nestjs/common';
import {
  MoodEntry,
  MoodValue,
  MOOD_SCORE_MAP,
} from '../../schemas/mental-health.schema';
import { MoodEntryRepository } from './repositories/moodentry.repository';
import { MeditationSessionRepository } from './repositories/meditationsession.repository';
import { BreathingSessionRepository } from './repositories/breathingsession.repository';

const MAX_HISTORY_DAYS = 365;
const MAX_MOOD_TAGS = 8;
const MAX_MOOD_TAG_LENGTH = 32;
const MAX_NOTE_LENGTH = 500;

@Injectable()
export class MentalHealthService {
  constructor(
    @Inject('MoodEntryRepository') private readonly moodModel: MoodEntryRepository,
    @Inject('MeditationSessionRepository') private readonly meditationModel: MeditationSessionRepository,
    @Inject('BreathingSessionRepository') private readonly breathingModel: BreathingSessionRepository,
  ) {}

  private requirePatientId(userId: string): void {
    if (typeof userId !== 'string' || !userId.trim() || userId === 'guest') {
      throw new BadRequestException('هوية المريض مطلوبة / Patient identity is required');
    }
  }

  private parseEventDate(value: unknown, field: string): Date {
    const parsed = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() > Date.now() + 5 * 60 * 1000) {
      throw new BadRequestException(`${field} غير صالح / ${field} is invalid`);
    }
    return parsed;
  }

  private optionalScale(value: unknown, field: string): number | undefined {
    if (value === undefined || value === null) return undefined;
    const numberValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(numberValue) || numberValue < 1 || numberValue > 5) {
      throw new BadRequestException(`${field} يجب أن يكون عدداً صحيحاً من 1 إلى 5 / ${field} must be an integer from 1 to 5`);
    }
    return numberValue;
  }

  private normaliseMoodInput(data: Partial<MoodEntry>) {
    if (!data || !Object.values(MoodValue).includes(data.mood as MoodValue)) {
      throw new BadRequestException('قيمة المزاج مطلوبة وغير صالحة / A valid mood value is required');
    }

    const payload: Record<string, unknown> = {
      mood: data.mood,
      logged_at: data.logged_at === undefined ? new Date() : this.parseEventDate(data.logged_at, 'logged_at'),
    };
    const energyLevel = this.optionalScale(data.energy_level, 'energy_level');
    const stressLevel = this.optionalScale(data.stress_level, 'stress_level');
    if (energyLevel !== undefined) payload.energy_level = energyLevel;
    if (stressLevel !== undefined) payload.stress_level = stressLevel;

    if (data.sleep_hours !== undefined && data.sleep_hours !== null) {
      const sleepHours = typeof data.sleep_hours === 'number' ? data.sleep_hours : Number(data.sleep_hours);
      if (!Number.isFinite(sleepHours) || sleepHours < 0 || sleepHours > 24) {
        throw new BadRequestException('sleep_hours يجب أن يكون بين 0 و24 / sleep_hours must be between 0 and 24');
      }
      payload.sleep_hours = sleepHours;
    }

    if (data.notes !== undefined && data.notes !== null) {
      if (typeof data.notes !== 'string' || data.notes.trim().length > MAX_NOTE_LENGTH) {
        throw new BadRequestException(`notes يجب ألا يتجاوز ${MAX_NOTE_LENGTH} حرفاً / notes must not exceed ${MAX_NOTE_LENGTH} characters`);
      }
      const notes = data.notes.trim();
      if (notes) payload.notes = notes;
    }

    if (data.tags !== undefined && data.tags !== null) {
      if (!Array.isArray(data.tags) || data.tags.length > MAX_MOOD_TAGS) {
        throw new BadRequestException(`tags يجب أن تكون قائمة من ${MAX_MOOD_TAGS} عناصر كحد أقصى / tags must contain no more than ${MAX_MOOD_TAGS} items`);
      }
      const tags = data.tags.map((tag) => {
        if (typeof tag !== 'string' || !tag.trim() || tag.trim().length > MAX_MOOD_TAG_LENGTH) {
          throw new BadRequestException(`كل وسم يجب ألا يتجاوز ${MAX_MOOD_TAG_LENGTH} حرفاً / each tag must not exceed ${MAX_MOOD_TAG_LENGTH} characters`);
        }
        return tag.trim();
      });
      if (new Set(tags).size !== tags.length) {
        throw new BadRequestException('لا يمكن تكرار الوسوم / Tags must be unique');
      }
      if (tags.length) payload.tags = tags;
    }

    return payload;
  }

  /* ───── Mood: self-reported wellbeing only; no diagnostic interpretation ───── */

  async logMood(userId: string, data: Partial<MoodEntry>) {
    this.requirePatientId(userId);
    const entry = await this.moodModel.create({
      patient_id: userId,
      ...this.normaliseMoodInput(data),
    } as Partial<MoodEntry>);
    return entry.toObject();
  }

  async getMoodHistory(userId: string, days = 30) {
    this.requirePatientId(userId);
    if (!Number.isInteger(days) || days < 1 || days > MAX_HISTORY_DAYS) {
      throw new BadRequestException(`days يجب أن يكون عدداً صحيحاً من 1 إلى ${MAX_HISTORY_DAYS} / days must be an integer from 1 to ${MAX_HISTORY_DAYS}`);
    }
    const since = new Date();
    since.setDate(since.getDate() - days);
    return this.moodModel.find({ patient_id: userId, logged_at: { $gte: since } }).sort({ logged_at: -1 }).lean();
  }

  async getMoodStats(userId: string) {
    this.requirePatientId(userId);
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const entries: any[] = await this.moodModel.find({ patient_id: userId, logged_at: { $gte: since } }).lean();
    const average = (values: number[]): number | null => {
      if (!values.length) return null;
      return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
    };

    return {
      total_entries: entries.length,
      avg_mood: average(entries.map((entry) => MOOD_SCORE_MAP[entry.mood as MoodValue]).filter(Number.isFinite)),
      avg_energy: average(entries.map((entry) => entry.energy_level).filter(Number.isFinite)),
      avg_stress: average(entries.map((entry) => entry.stress_level).filter(Number.isFinite)),
      avg_sleep: average(entries.map((entry) => entry.sleep_hours).filter(Number.isFinite)),
    };
  }

  // Owner decision B18 (2026-10-14): no breathing or meditation sessions without clinical content; their routes are
  // gone. Past session records stay in their collections (meditationModel, breathingModel); nothing reads them.

  async getDashboard(userId: string) {
    this.requirePatientId(userId);
    const [mood, recentMoods] = await Promise.all([
      this.getMoodStats(userId),
      this.moodModel.find({ patient_id: userId }).sort({ logged_at: -1 }).limit(7).lean(),
    ]);
    return { mood, recent_moods: recentMoods };
  }
}
