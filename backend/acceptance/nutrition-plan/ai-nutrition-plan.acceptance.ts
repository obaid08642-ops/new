// ACCEPTANCE — AI nutrition plan (owner decision 2026-10-05). Written by the reviewer before
// the fix; the implementing agent makes it pass and may not edit it.
//
// Owner: "the nutrition plan is made by the AI agent (meals, how to organise the day), through
// the admin-controlled AI gateway; plus a button to follow up with a nutritionist, which opens
// the consultations page filtered to nutrition doctors. No direct chat with a nutritionist."
//
// Required (backend):
// - src/modules/nutrition/nutrition-plan.service.ts exports NutritionPlanService,
//   constructor(connection: mongoose.Connection, ai: { generateDietPlan(body): Promise<unknown> })
//   (in Nest: @InjectConnection() and the existing AiService), with:
//     latest(patientId)   -> the patient's newest saved plan, or null
//     generate(patientId) -> builds the AI input from the patient's own nutrition profile
//                            (NutritionProfile model: goal, height_cm, weight_kg, target_weight_kg,
//                            activity_level, dietary_restrictions, allergies), calls
//                            ai.generateDietPlan once, saves and returns the plan.
// - Saved in `nutrition_plans`: { id, patient_id, source: 'ai', created_at, plan }.
// - Returned plan: { id, source: 'ai', created_at, days: <AI plan array>, notice,
//   book_nutritionist: { specialty: 'nutrition' } }. `notice` says it is general guidance, not
//   a medical prescription. `nutrition` is the specialty code in the catalog.
// - No profile, or no height/weight: 400 `nutrition_profile_required`; the AI is not called.
// - An AI failure propagates (502/503) and nothing is saved. A plan is never invented.
// - Routes on NutritionController: GET /nutrition/plan (204 when there is none) and
//   POST /nutrition/plan/generate guarded by NoGuestsGuard and AiUserQuotaGuard (paid AI call).
// Clients (same PR): web /[locale]/nutrition/plan and the app's plan screen show the plan, a
// "generate my plan" button, and a "follow up with a nutritionist" button linking to
// /consultations/doctors?specialty=nutrition (web) and the consultations screen with the same
// filter (app).
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { NutritionProfileSchema } from '../../src/schemas/nutrition.schema';
import { NutritionController } from '../../src/modules/nutrition/nutrition.controller';
import { NoGuestsGuard } from '../../src/common/auth.guard';
import { AiUserQuotaGuard } from '../../src/modules/ai/ai-user-quota.guard';

jest.setTimeout(60_000);

type Plan = { id: string; source: string; created_at: unknown; days: unknown; notice: string; book_nutritionist: { specialty: string } };
type Svc = { latest(id: string): Promise<Plan | null>; generate(id: string): Promise<Plan> };
// eslint-disable-next-line @typescript-eslint/no-var-requires
const load = (): new (c: Connection, ai: { generateDietPlan(b: unknown): Promise<unknown> }) => Svc => require('../../src/modules/nutrition/nutrition-plan.service').NutritionPlanService;

describe('AI nutrition plan: generated from the patient profile, saved, with a nutritionist link', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let profiles: Model<Record<string, unknown>>;
  const aiPlan = { plan: [{ day: 1, meals: ['فطور: شوفان', 'غداء: سلطة دجاج'] }, { day: 2, meals: ['فطور: بيض'] }] };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'nutrition_plan' }).asPromise();
    profiles = conn.model('NutritionProfile', NutritionProfileSchema) as unknown as Model<Record<string, unknown>>;
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });
  beforeEach(async () => {
    await profiles.deleteMany({});
    await conn.collection('nutrition_plans').deleteMany({});
    await profiles.create({
      patient_id: 'pat-1', goal: 'weight_loss', height_cm: 165, weight_kg: 80, target_weight_kg: 68,
      activity_level: 'light', dietary_restrictions: ['vegetarian'], allergies: ['peanuts'],
    });
  });

  it('generate: one AI call built from the profile (allergies and restrictions included); saved and returned', async () => {
    const ai = { generateDietPlan: jest.fn(async () => aiPlan) };
    const svc = new (load())(conn, ai);
    const plan = await svc.generate('pat-1');
    expect(ai.generateDietPlan).toHaveBeenCalledTimes(1);
    const input = JSON.stringify((ai.generateDietPlan.mock.calls as unknown[][])[0][0]);
    expect(input).toContain('peanuts');
    expect(input).toContain('vegetarian');
    expect(input).toContain('80');
    expect(input).toContain('165');
    expect(plan).toEqual(expect.objectContaining({ source: 'ai', days: aiPlan.plan, book_nutritionist: { specialty: 'nutrition' } }));
    expect(typeof plan.notice).toBe('string');
    expect(plan.notice.length).toBeGreaterThan(10);
    const saved = await conn.collection('nutrition_plans').find({ patient_id: 'pat-1' }).toArray();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toEqual(expect.objectContaining({ id: plan.id, source: 'ai' }));
  });

  it('latest: null before any plan, then the newest plan of that patient only', async () => {
    const ai = { generateDietPlan: jest.fn(async () => aiPlan) };
    const svc = new (load())(conn, ai);
    await expect(svc.latest('pat-1')).resolves.toBeNull();
    await svc.generate('pat-1');
    ai.generateDietPlan.mockResolvedValueOnce({ plan: [{ day: 1, meals: ['newer'] }] });
    const second = await svc.generate('pat-1');
    const latest = await svc.latest('pat-1');
    expect(latest?.id).toBe(second.id);
    expect(latest?.days).toEqual([{ day: 1, meals: ['newer'] }]);
    await expect(svc.latest('someone-else')).resolves.toBeNull();
  });

  it('no profile, or no height/weight: 400 nutrition_profile_required and the AI is not called', async () => {
    const ai = { generateDietPlan: jest.fn(async () => aiPlan) };
    const svc = new (load())(conn, ai);
    await expect(svc.generate('no-profile')).rejects.toThrow(BadRequestException);
    await expect(svc.generate('no-profile')).rejects.toThrow('nutrition_profile_required');
    await profiles.create({ patient_id: 'pat-2', goal: 'maintain' });
    await expect(svc.generate('pat-2')).rejects.toThrow('nutrition_profile_required');
    expect(ai.generateDietPlan).not.toHaveBeenCalled();
  });

  it('an AI failure propagates and nothing is saved (no invented plan)', async () => {
    const ai = { generateDietPlan: jest.fn(async () => { throw new BadGatewayException('ai_upstream_error'); }) };
    const svc = new (load())(conn, ai);
    await expect(svc.generate('pat-1')).rejects.toBeInstanceOf(BadGatewayException);
    expect(await conn.collection('nutrition_plans').countDocuments({})).toBe(0);
  });

  it('routes: GET /nutrition/plan and POST /nutrition/plan/generate (members only, AI quota)', () => {
    const proto = NutritionController.prototype as unknown as Record<string, unknown>;
    const routes = Object.getOwnPropertyNames(proto).filter((k) => typeof proto[k] === 'function' && k !== 'constructor').map((k) => ({
      path: Reflect.getMetadata(PATH_METADATA, proto[k] as object),
      method: Reflect.getMetadata(METHOD_METADATA, proto[k] as object),
      guards: (Reflect.getMetadata(GUARDS_METADATA, proto[k] as object) || []) as unknown[],
    }));
    expect(routes).toContainEqual(expect.objectContaining({ path: 'plan', method: RequestMethod.GET }));
    const gen = routes.find((r) => r.path === 'plan/generate' && r.method === RequestMethod.POST);
    expect(gen).toBeDefined();
    expect(gen!.guards).toEqual(expect.arrayContaining([NoGuestsGuard, AiUserQuotaGuard]));
  });
});
