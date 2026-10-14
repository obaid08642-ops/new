import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { randomUUID } from 'crypto';
import { AiService } from '../ai/ai.service';

type DietPlanAi = { generateDietPlan(body: unknown): Promise<unknown> };

export interface NutritionPlan {
  id: string;
  source: 'ai';
  created_at: Date;
  days: unknown;
  notice: string;
  book_nutritionist: { specialty: 'nutrition' };
}

/** Shown with every plan: general guidance from the AI, not a medical prescription. */
export const NUTRITION_PLAN_NOTICE = 'general_guidance_not_a_medical_prescription_consult_a_nutritionist';

/**
 * AI nutrition plan (owner decision 2026-10-05): made through the admin-controlled AI gateway from the patient's own
 * nutrition profile, saved in `nutrition_plans`, with a way to book a nutrition doctor. A plan is never invented: without
 * a profile (height and weight) the AI is not called, and an AI failure saves nothing.
 */
@Injectable()
export class NutritionPlanService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly ai: AiService,
  ) {}

  private get plans() { return this.connection.collection('nutrition_plans'); }

  private static view(doc: any): NutritionPlan {
    return {
      id: String(doc.id),
      source: 'ai',
      created_at: doc.created_at,
      days: doc.plan,
      notice: NUTRITION_PLAN_NOTICE,
      book_nutritionist: { specialty: 'nutrition' },
    };
  }

  async latest(patientId: string): Promise<NutritionPlan | null> {
    const doc = await this.plans.find({ patient_id: { $eq: String(patientId) } }).sort({ created_at: -1, _id: -1 }).limit(1).next();
    return doc ? NutritionPlanService.view(doc) : null;
  }

  async generate(patientId: string): Promise<NutritionPlan> {
    const profile: any = await this.connection.collection('nutrition_profiles').findOne({ patient_id: { $eq: String(patientId) } });
    const height = Number(profile?.height_cm);
    const weight = Number(profile?.weight_kg);
    if (!profile || !(height > 0) || !(weight > 0)) throw new BadRequestException('nutrition_profile_required');
    const input = {
      goal: profile.goal ?? null,
      height_cm: height,
      weight_kg: weight,
      target_weight_kg: profile.target_weight_kg ?? null,
      activity_level: profile.activity_level ?? null,
      dietary_restrictions: Array.isArray(profile.dietary_restrictions) ? profile.dietary_restrictions : [],
      allergies: Array.isArray(profile.allergies) ? profile.allergies : [],
    };
    const answer: any = await (this.ai as unknown as DietPlanAi).generateDietPlan(input);
    const days = Array.isArray(answer?.plan) ? answer.plan : null;
    if (!days || days.length === 0) throw new BadRequestException('nutrition_plan_unavailable');
    const doc = { id: randomUUID(), patient_id: String(patientId), source: 'ai' as const, created_at: new Date(), plan: days };
    await this.plans.insertOne(doc);
    return NutritionPlanService.view(doc);
  }
}
