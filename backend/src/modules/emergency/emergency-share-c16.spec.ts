import { EmergencyService } from './emergency.service';

// OC-C C-16 (665/decision 14): share-location notifies emergency contacts/family.
function serviceFor() {
  const service: any = Object.create(EmergencyService.prototype);
  const created: any[] = [];
  service.conn = {
    collection: jest.fn((name: string) => {
      if (name === 'patient_profiles') {
        return { findOne: jest.fn().mockResolvedValue({ emergency_contacts: [{ name: 'الأب', phone: '0512345678' }, { name: 'غريب', phone: '0599999999' }] }) };
      }
      if (name === 'users') {
        return {
          findOne: jest.fn().mockResolvedValue({ id: 'pat-1', full_name: 'المريض' }),
          find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([{ id: 'user-dad', phone: '+966512345678' }]) }),
        };
      }
      return { findOne: jest.fn().mockResolvedValue(null) };
    }),
  };
  service.notifications = { create: jest.fn().mockImplementation(async (d: any) => { created.push(d); return {}; }) };
  service.redis = { checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }) };
  return { service: service as EmergencyService, created };
}

describe('OC C-16 emergency share notifies family', () => {
  it('sends an in-app notification to contacts on the app and sms links for the rest', async () => {
    const { service, created } = serviceFor();
    const out: any = await service.shareLocation({ id: 'pat-1' }, { lat: 21.5, lng: 39.1 });
    expect(created.some((n: any) => n.user_id === 'user-dad')).toBe(true);
    expect(JSON.stringify(out)).toContain('sms:');
  });
});
