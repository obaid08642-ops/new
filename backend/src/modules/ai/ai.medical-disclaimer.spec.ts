// a95be9a / 7B-B4: every AI health result (triage, skin self-check, nutrition)
// carries the medical disclaimer in Arabic and English, so each client renders
// it from the payload.
import { AiService } from './ai.service';
import { MEDICAL_DISCLAIMER } from './ai-content-review.service';

const ARABIC = /[؀-ۿ]/;

function makeService(aiText = '{"calories": 500, "protein": 20, "carbs": 60, "fat": 15}') {
  const sink = { insertOne: jest.fn(async () => ({ acknowledged: true })) };
  const conn = { collection: jest.fn(() => sink) };
  const gateway = { generate: jest.fn(async () => ({ text: aiText })) };
  return new AiService(conn as never, gateway as never);
}

describe('medical disclaimer on AI health results (a95be9a)', () => {
  it('is bilingual: Arabic first, English second, both non-empty', () => {
    expect(ARABIC.test(MEDICAL_DISCLAIMER.ar)).toBe(true);
    expect(MEDICAL_DISCLAIMER.ar).toContain('ليست استشارة طبية');
    expect(MEDICAL_DISCLAIMER.en).toContain('NOT medical advice');
  });

  it('is returned by triage', async () => {
    const result = await makeService().triage({ symptoms: 'صداع', red_flags: ['none'] }, 'patient-1');
    expect(result.disclaimer).toEqual(MEDICAL_DISCLAIMER);
  });

  it('is returned by the skin self-check', async () => {
    const result = await makeService().skinAnalysis({ acknowledge_limitations: true, areas: ['face'], observations: ['none'] }, 'patient-1');
    expect(result.disclaimer).toEqual(MEDICAL_DISCLAIMER);
  });

  it('is returned by nutrition meal analysis and diet plans, next to the model output', async () => {
    const meal = await makeService().analyzeMeal('أرز ودجاج');
    expect(meal).toEqual(expect.objectContaining({ calories: 500, disclaimer: MEDICAL_DISCLAIMER }));
    const plan = await makeService('{"plan": [{"day": 1, "meals": ["فطور"]}]}').generateDietPlan({ goal: 'weight' });
    expect(plan).toEqual(expect.objectContaining({ plan: [{ day: 1, meals: ['فطور'] }], disclaimer: MEDICAL_DISCLAIMER }));
  });

  it('cannot be overridden by model output', async () => {
    const meal = await makeService('{"calories": 1, "disclaimer": "trust me"}').analyzeMeal('x');
    expect(meal.disclaimer).toEqual(MEDICAL_DISCLAIMER);
  });
});
