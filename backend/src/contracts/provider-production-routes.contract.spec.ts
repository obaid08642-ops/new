import 'reflect-metadata';
import { PATH_METADATA } from '@nestjs/common/constants';
import { ProviderProductionController } from '../modules/provider-production/provider-production.module';
import { FacilityShiftsController } from '../modules/facility-ops/facility-ops.module';

function routePath(target: object, name: string): string {
  return Reflect.getMetadata(PATH_METADATA, (target as any).prototype[name]);
}

describe('provider production route contract', () => {
  it('exposes every governed provider surface at its canonical path', () => {
    const routes: Record<string, string> = {
      orderInsurance: 'orders/:id/insurance-decision',
      labCoverage: 'labs/bookings/:id/coverage-decision',
      radCoverage: 'radiology/bookings/:id/coverage-decision',
      nursingCoverage: 'home-care/bookings/:id/coverage-decision',
      listCrmPatients: 'provider/crm',
      getCrm: 'provider/crm/:patientId',
      postCrm: 'provider/crm/:patientId',
      putCrm: 'provider/crm/:patientId',
      myReferrals: 'provider/referrals/mine',
      createReferral: 'provider/referrals',
      referralNetwork: 'provider/referral-network',
      listPromotions: 'provider/promotions',
      createPromotion: 'provider/promotions',
      listTechs: 'hospital/staff-roster/technicians',
      createTech: 'hospital/staff-roster/technicians',
      updateTech: 'hospital/staff-roster/technicians/:id',
      deleteTech: 'hospital/staff-roster/technicians/:id',
      claimResubmit: 'claims/:id/resubmit',
      claimApprove: 'claims/:id/approve',
      claimReject: 'claims/:id/reject',
      inboundReports: 'provider/reports/inbound',
      getAvailability: 'provider/profile/availability',
      patchAvailability: 'provider/profile/availability',
    };
    for (const [handler, path] of Object.entries(routes)) {
      expect(routePath(ProviderProductionController, handler)).toBe(path);
    }
  });

  it('keeps shift update and deletion behind the facility shift route', () => {
    expect(Reflect.getMetadata(PATH_METADATA, FacilityShiftsController)).toBe('facility/shifts');
    expect(routePath(FacilityShiftsController, 'updateShift')).toBe(':id');
    expect(routePath(FacilityShiftsController, 'deleteShift')).toBe(':id');
  });
});
