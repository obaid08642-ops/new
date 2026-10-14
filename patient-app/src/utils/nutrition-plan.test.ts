import { parseNutritionPlan } from './nutrition-plan';

describe('parseNutritionPlan (AI nutrition plan, owner decision 2026-10-05)', () => {
  it('reads the days and their meals as text', () => {
    expect(parseNutritionPlan({ id: 'p1', days: [{ day: 1, meals: ['Oats', { name: 'Lunch', description: 'Salad' }, ''] }, { meals: [] }] }))
      .toEqual({ id: 'p1', days: [{ day: 1, meals: ['Oats', 'Lunch: Salad'] }] });
  });
  it('is no plan when there is nothing to show', () => {
    expect(parseNutritionPlan(null)).toBeNull();
    expect(parseNutritionPlan({ id: 'p1', days: [] })).toBeNull();
    expect(parseNutritionPlan({ days: [{ day: 1, meals: ['x'] }] })).toBeNull();
  });
});
