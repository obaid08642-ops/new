import { UnauthorizedException } from '@nestjs/common';
import { FamilyController } from '../modules/family/family.controller';
import { MaternityController } from '../modules/maternity/maternity.controller';
import { NutritionController } from '../modules/nutrition/nutrition.controller';

describe('patient-owned controller contracts', () => {
  const patientRequest = { user: { id: 'patient-verified-1' } };
  const missingUserRequest = { user: undefined };

  it('rejects maternity access without a verified patient and never substitutes guest', () => {
    const service = { getProfile: jest.fn() };
    const controller = new MaternityController(service as any);

    expect(() => controller.getProfile(missingUserRequest)).toThrow(UnauthorizedException);
    controller.getProfile(patientRequest);
    expect(service.getProfile).toHaveBeenCalledWith('patient-verified-1');
  });

  it('rejects nutrition records without a verified patient and preserves the authenticated owner', () => {
    const service = { getDailySummary: jest.fn(), logWater: jest.fn() };
    const controller = new NutritionController(service as any);

    expect(() => controller.getDailySummary(missingUserRequest, undefined)).toThrow(UnauthorizedException);
    controller.logWater(patientRequest, { amount_ml: 250 });
    expect(service.logWater).toHaveBeenCalledWith('patient-verified-1', 250);
  });

  it('rejects family data access without a verified member and preserves the caller identity', () => {
    const service = { getMyGroup: jest.fn(), setMemberPermissions: jest.fn() };
    const controller = new FamilyController(service as any);

    expect(() => controller.myGroup(missingUserRequest)).toThrow(UnauthorizedException);
    controller.setPermissions(patientRequest, 'family-member-2', { permissions: ['records'] });
    expect(service.setMemberPermissions).toHaveBeenCalledWith('patient-verified-1', 'family-member-2', ['records']);
  });
});
