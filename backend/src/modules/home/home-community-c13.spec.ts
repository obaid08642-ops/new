import { HomeService } from './home.service';

// OC-C C-13 (738/739/743): community leftovers are gone from search and notifications.
function serviceFor() {
  const service: any = Object.create(HomeService.prototype);
  const collections: string[] = [];
  service.promoModel = {
    find: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }),
    db: {
      collection: jest.fn((name: string) => {
        collections.push(name);
        return { find: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }) }), findOne: jest.fn().mockResolvedValue(null) };
      }),
    },
  };
  service.request = { user: { id: 'pat-1' } };
  return { service: service as HomeService, collections };
}

describe('OC C-13 community leftovers', () => {
  it('globalSearch never touches community_posts and returns no Community rows', async () => {
    const { service, collections } = serviceFor();
    const rows: any[] = await service.globalSearch('نوم');
    expect(collections).not.toContain('community_posts');
    expect(rows.some((r: any) => r?.typeEn === 'Community')).toBe(false);
  });

  it('no community reply notification listener remains', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NotificationsService } = require('../notifications/notifications.service');
    expect(typeof (NotificationsService.prototype as any).onCommunityComment).toBe('undefined');
  });
});
