import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { MaternityProfile, MaternityProfileDocument } from '../../schemas/maternity.schema';
import { MaternityProfileRepository } from "./repositories/maternityprofile.repository";

@Injectable()
export class MaternityService {
  constructor(
    @Inject('MaternityProfileRepository') private readonly model: MaternityProfileRepository,
  ) {}

  /** Returns an estimated week from a user-entered date; it is never a clinical assessment. */
  private calculateCurrentWeek(dueDate?: Date): number | null {
    if (!dueDate || Number.isNaN(dueDate.getTime())) return null;
    const lmp = new Date(dueDate.getTime() - 280 * 24 * 60 * 60 * 1000);
    const days = Math.floor((Date.now() - lmp.getTime()) / (24 * 60 * 60 * 1000));
    if (days < 0 || days > 294) return null;
    return Math.max(1, Math.min(42, Math.ceil(days / 7)));
  }

  private parseDate(value: unknown, field: string): Date {
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) throw new BadRequestException(`invalid ${field}`);
    return date;
  }

  private integerInRange(value: unknown, field: string, min: number, max: number): number {
    const number = Number(value);
    if (!Number.isInteger(number) || number < min || number > max) throw new BadRequestException(`${field} must be an integer between ${min} and ${max}`);
    return number;
  }

  private requireProfile(profile: any): any {
    if (!profile) throw new NotFoundException('Maternity profile not found');
    return profile;
  }

  getContent() {
    // Clinical educational content is delivered only when curated and localised by a reviewed content workflow.
    return { pregnant_links: [], planning_links: [], weekly_tips: [], planning_tips: [] };
  }

  async getProfile(userId: string): Promise<any> {
    const profile = await this.model.findOne({ patient_id: userId });
    if (!profile) return { patient_id: userId, profile_ready: false, tracking_mode: null };
    const week = profile.is_pregnant ? this.calculateCurrentWeek(profile.due_date) : null;
    if (week !== null && profile.current_week !== week) {
      profile.current_week = week;
      await profile.save();
    }
    const source = profile.toObject();
    return { ...source, current_week: week, profile_ready: Boolean(source.is_pregnant ? source.due_date : source.last_period_date && source.cycle_length), tracking_mode: source.is_pregnant ? 'pregnancy' : 'cycle', estimate_notice: 'Dates and fertile-window information are estimates based on your entries, not medical diagnosis or contraception.' };
  }

  async updateProfile(userId: string, updateData: any): Promise<any> {
    let profile = await this.model.findOne({ patient_id: userId });
    if (typeof updateData?.is_pregnant !== 'boolean') throw new BadRequestException('is_pregnant is required');
    const fields: any = { is_pregnant: updateData.is_pregnant };

    if (updateData.is_pregnant) {
      let dueDate: Date | undefined;
      if (updateData.due_date) dueDate = this.parseDate(updateData.due_date, 'due_date');
      else if (updateData.lmp_date) {
        const lmp = this.parseDate(updateData.lmp_date, 'lmp_date');
        dueDate = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
        fields.last_period_date = lmp;
      } else if (profile?.due_date) dueDate = profile.due_date;
      else throw new BadRequestException('due_date or lmp_date is required for pregnancy tracking');
      const week = this.calculateCurrentWeek(dueDate);
      if (week === null) throw new BadRequestException('pregnancy date is outside the supported estimate range');
      fields.due_date = dueDate;
      fields.current_week = week;
    } else {
      const lastPeriod = updateData.last_period_date ? this.parseDate(updateData.last_period_date, 'last_period_date') : profile?.last_period_date;
      const cycleLength = updateData.cycle_length !== undefined ? this.integerInRange(updateData.cycle_length, 'cycle_length', 15, 90) : profile?.cycle_length;
      if (!lastPeriod || !cycleLength) throw new BadRequestException('last_period_date and cycle_length are required for cycle tracking');
      fields.last_period_date = lastPeriod;
      fields.cycle_length = cycleLength;
      fields.current_week = undefined;
      fields.due_date = undefined;
      if (updateData.prev_period_date) fields.prev_period_date = this.parseDate(updateData.prev_period_date, 'prev_period_date');
      if (updateData.is_regular !== undefined) {
        if (typeof updateData.is_regular !== 'boolean') throw new BadRequestException('is_regular must be boolean');
        fields.is_regular = updateData.is_regular;
      }
    }

    if (profile) { Object.assign(profile, fields); await profile.save(); } else { profile = await this.model.create({ patient_id: userId, checkups: [], ...fields }); }
    return this.getProfile(userId);
  }

  async logKick(userId: string, count: number, durationSeconds: number): Promise<MaternityProfile> {
    const profile = this.requireProfile(await this.model.findOne({ patient_id: userId }));
    if (!profile.is_pregnant) throw new BadRequestException('kick logging requires pregnancy tracking');
    profile.kicks_log.push({
      id: undefined as any,
      count: this.integerInRange(count, 'count', 1, 200),
      duration_seconds: this.integerInRange(durationSeconds, 'duration_seconds', 1, 86400),
      date: new Date(),
    });
    await profile.save();
    return profile.toObject();
  }

  async logContraction(userId: string, intervalSeconds: number, durationSeconds: number): Promise<MaternityProfile> {
    const profile = this.requireProfile(await this.model.findOne({ patient_id: userId }));
    if (!profile.is_pregnant) throw new BadRequestException('contraction logging requires pregnancy tracking');
    profile.contractions_log.push({
      id: undefined as any,
      interval_seconds: this.integerInRange(intervalSeconds, 'interval_seconds', 1, 86400),
      duration_seconds: this.integerInRange(durationSeconds, 'duration_seconds', 1, 7200),
      date: new Date(),
    });
    await profile.save();
    return profile.toObject();
  }

  async toggleCheckup(userId: string, checkupWeek: string): Promise<MaternityProfile> {
    const profile = this.requireProfile(await this.model.findOne({ patient_id: userId }));

    const checkup = profile.checkups.find(c => c.week === checkupWeek);
    if (!checkup) throw new NotFoundException(`Checkup for week ${checkupWeek} not found`);

    checkup.done = !checkup.done;
    await profile.save();
    return profile.toObject();
  }

  async logInfantGrowth(userId: string, data: { month: number, weight_kg?: number, height_cm?: number, head_circ_cm?: number }): Promise<MaternityProfile> {
    const profile = this.requireProfile(await this.model.findOne({ patient_id: userId }));
    data.month = this.integerInRange(data.month, 'month', 0, 240);
    if (data.weight_kg !== undefined && (!Number.isFinite(data.weight_kg) || data.weight_kg <= 0 || data.weight_kg > 100)) throw new BadRequestException('invalid infant weight');
    if (data.height_cm !== undefined && (!Number.isFinite(data.height_cm) || data.height_cm <= 0 || data.height_cm > 250)) throw new BadRequestException('invalid infant height');
    if (data.head_circ_cm !== undefined && (!Number.isFinite(data.head_circ_cm) || data.head_circ_cm <= 0 || data.head_circ_cm > 100)) throw new BadRequestException('invalid infant head circumference');

    const existingIndex = profile.infant_growth.findIndex(g => g.month === data.month);
    if (existingIndex >= 0) {
      if (data.weight_kg) profile.infant_growth[existingIndex].weight_kg = data.weight_kg;
      if (data.height_cm) profile.infant_growth[existingIndex].height_cm = data.height_cm;
      if (data.head_circ_cm) profile.infant_growth[existingIndex].head_circ_cm = data.head_circ_cm;
    } else {
      profile.infant_growth.push({
        id: undefined as any,
        month: data.month,
        weight_kg: data.weight_kg,
        height_cm: data.height_cm,
        head_circ_cm: data.head_circ_cm,
        date: new Date(),
      } as any);
    }

    await profile.save();
    return profile.toObject();
  }
}
