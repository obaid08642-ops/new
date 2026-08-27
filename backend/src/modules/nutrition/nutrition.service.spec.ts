import { BadRequestException } from '@nestjs/common';
import { NutritionService } from './nutrition.service';

describe('NutritionService patient-owned truthful nutrition contract', () => {
  const makeService = (overrides: Record<string, any> = {}) => {
    const profileModel = { findOne: jest.fn(), create: jest.fn(), ...overrides.profileModel };
    const mealModel = { create: jest.fn(async (payload) => ({ ...payload, toObject: () => payload })), find: jest.fn(), ...overrides.mealModel };
    const waterModel = { create: jest.fn(async (payload) => ({ ...payload, toObject: () => payload })), find: jest.fn(), ...overrides.waterModel };
    const exerciseModel = { create: jest.fn(), find: jest.fn(), ...overrides.exerciseModel };
    return { service: new NutritionService(profileModel as any, mealModel as any, waterModel as any, exerciseModel as any), profileModel, mealModel, waterModel };
  };

  it('does not create a profile or invent calorie and water targets when setup has not been completed', async () => {
    const { service, profileModel } = makeService({ profileModel: { findOne: jest.fn(async () => null) } });
    await expect(service.getProfile('patient-1')).resolves.toEqual({ patient_id: 'patient-1', profile_ready: false });
    expect(profileModel.create).not.toHaveBeenCalled();
  });

  it('accepts explicit patient goals and derives BMI only from supplied measurements', async () => {
    const { service, profileModel } = makeService({
      profileModel: { findOne: jest.fn(async () => null), create: jest.fn(async (payload) => ({ ...payload, toObject: () => payload })) },
    });
    const result = await service.updateProfile('patient-1', {
      goal: 'healthy_lifestyle', height_cm: 170, weight_kg: 68, daily_calorie_target: 2100, daily_water_target_ml: 2300,
    });
    expect(result).toEqual(expect.objectContaining({ patient_id: 'patient-1', bmi: 23.5, profile_ready: true }));
    await expect(service.updateProfile('patient-1', { daily_calorie_target: 200 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('stores a manual meal only with a real name, calories, patient ownership, and valid event time', async () => {
    const { service, mealModel } = makeService();
    await service.logMeal('patient-1', { name: 'شوربة خضار', calories: 190, protein_g: 7, meal_type: 'lunch' });
    expect(mealModel.create).toHaveBeenCalledWith(expect.objectContaining({ patient_id: 'patient-1', name: 'شوربة خضار', calories: 190, meal_type: 'lunch' }));
    await expect(service.logMeal('patient-1', { name: '', calories: 190 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.logMeal('patient-1', { name: 'وجبة', calories: -1 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts water in a realistic range and rejects a zero-value log', async () => {
    const { service, waterModel } = makeService();
    await service.logWater('patient-1', 250);
    expect(waterModel.create).toHaveBeenCalledWith(expect.objectContaining({ patient_id: 'patient-1', amount_ml: 250 }));
    await expect(service.logWater('patient-1', 0)).rejects.toBeInstanceOf(BadRequestException);
  });
});
