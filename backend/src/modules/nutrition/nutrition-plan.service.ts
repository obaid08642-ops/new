import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { NutritionProfileSchema } from '../../schemas/nutrition.schema';
import { AiService } from '../ai/ai.service';

/**
 * R12.nutrition-plan: an AI-generated 7-day nutrition plan, built only from the
 * patient's own nutrition profile and saved so it can be shown again later.
 *
 * The plan is general guidance, never a medical prescription, and the patient is
 * always offered a way to follow up with a real nutritionist.
 */

export interface NutritionPlan {
  id: string;
  source: 'ai';
  created_at: Date;
  days: unknown;
  notice: string;
  book_nutritionist: { specialty: 'nutrition' };
}

const NOTICE =
  'هذه الخطة غذائية عامة لمساعدتك على تنظيم يومك، وليست وصفة طبية ولا بديلاً عن استشارة أخصائي تغذية أو طبيبك. استشر مختصاً قبل اتباعها، خاصة إذا كنت تعاني من حالة صحية أو تتناول أدوية.';

@Injectable()
export class NutritionPlanService {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly ai: AiService,
  ) {}

  private profiles() {
    return this.conn.model('NutritionProfile', NutritionProfileSchema);
  }

  private plans() {
    return this.conn.collection('nutrition_plans');
  }

  private toPlan(doc: Record<string, unknown>): NutritionPlan {
    const raw = (doc.plan ?? {}) as { plan?: unknown };
    return {
      id: String(doc.id),
      source: 'ai',
      created_at: doc.created_at as Date,
      days: raw.plan,
      notice: NOTICE,
      book_nutritionist: { specialty: 'nutrition' },
    };
  }

  /** The patient's newest saved plan, or null when there is none. */
  async latest(patientId: string): Promise<NutritionPlan | null> {
    const doc = await this.plans()
      .findOne({ patient_id: patientId }, { sort: { created_at: -1 } })
      .catch(() => null);
    if (!doc) return null;
    return this.toPlan(doc as Record<string, unknown>);
  }

  /**
   * Build the AI input from the patient's own profile, call the AI once, and save
   * the result. A missing profile or missing height/weight is a 400 and the AI is
   * never called; an AI failure propagates and nothing is saved.
   */
  async generate(patientId: string): Promise<NutritionPlan> {
    const profile = await this.profiles().findOne({ patient_id: patientId }).catch(() => null);
    if (!profile || !profile.height_cm || !profile.weight_kg) {
      throw new BadRequestException('nutrition_profile_required');
    }

    const body = {
      goal: profile.goal,
      height_cm: profile.height_cm,
      weight_kg: profile.weight_kg,
      target_weight_kg: profile.target_weight_kg,
      activity_level: profile.activity_level,
      dietary_restrictions: profile.dietary_restrictions,
      allergies: profile.allergies,
    };

    const aiResult = (await this.ai.generateDietPlan(body)) as { plan?: unknown };

    const doc = {
      id: new Types.ObjectId().toString(),
      patient_id: patientId,
      source: 'ai',
      created_at: new Date(),
      plan: aiResult,
    };
    await this.plans().insertOne(doc);

    return {
      id: doc.id,
      source: 'ai',
      created_at: doc.created_at,
      days: aiResult?.plan,
      notice: NOTICE,
      book_nutritionist: { specialty: 'nutrition' },
    };
  }
}
