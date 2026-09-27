import fs from 'node:fs';
import path from 'node:path';

// F46 replaced the 503 stubs with live admin nursing ops. The guard that justified the stubs
// (never hand a booking to an arbitrary provider) must stay: assign/reassign check eligibility.
describe('admin nursing ops source contract', () => {
  const source = fs.readFileSync(path.resolve(__dirname, 'admin-spa.module.ts'), 'utf8');
  const portal = source.slice(source.indexOf('class AdminNursingPortalController'), source.indexOf('/* ── module registration'));

  it('assign and reassign only accept an eligible home-care provider for the booked service', () => {
    expect(portal).toContain("throw new BadRequestException('provider_cannot_perform_service')");
    expect(portal).toContain("'nursing_services.key': { $eq: b.service_id }");
    expect(portal).toContain("medical_review_status: 'approved'");
    expect((portal.match(/'PROVIDER_ASSIGNED', uid\(user\), \{[^}]*\}, String\(providerId\)\)/g) || []).length).toBe(2);
  });
});
