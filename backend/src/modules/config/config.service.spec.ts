process.env.CONFIG_CACHE_MS = "0"; // the specs change the rows between calls
import { CHI_INQUIRY_URL, chiInquiryUrl, ConfigService } from './config.service';
import { ClamavService } from '../storage/clamav.service';

describe('CHI inquiry link in /config', () => {
  it('defaults to the official beneficiary inquiry page on chi.gov.sa', () => {
    expect(CHI_INQUIRY_URL).toBe('https://www.chi.gov.sa/ServicesDirectory/Pages/CheckInsurance.aspx');
    expect(chiInquiryUrl({})).toBe(CHI_INQUIRY_URL);
  });

  it('takes an https chi.gov.sa address from the environment', () => {
    expect(chiInquiryUrl({ CHI_INQUIRY_URL: 'https://www.chi.gov.sa/new/page.aspx' })).toBe('https://www.chi.gov.sa/new/page.aspx');
  });

  it.each(['http://www.chi.gov.sa/x', 'https://evil.example/chi.gov.sa', 'https://chi.gov.sa.evil.example/x', 'javascript:alert(1)', 'not a url', ''])(
    'refuses %p and keeps the default',
    (value) => {
      expect(chiInquiryUrl({ CHI_INQUIRY_URL: value })).toBe(CHI_INQUIRY_URL);
    },
  );

  it('is served by getClientConfig', async () => {
    const conn = { collection: () => ({ find: () => ({ project: () => ({ toArray: async () => [] }) }), findOne: async () => null }) };
    const cfg = await new ConfigService(conn as never, new ClamavService()).getClientConfig();
    expect(cfg.links).toEqual({ chi_inquiry: CHI_INQUIRY_URL });
  });

  it('carries uploads_enabled from the scanner signal, and the admin flag row can still override it', async () => {
    const rows: any[] = [];
    const conn = { collection: () => ({ find: () => ({ project: () => ({ toArray: async () => rows }) }), findOne: async () => null }) };
    const clamav = { uploadsAvailable: jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true), uploadsPendingScan: jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true) };
    const svc = new ConfigService(conn as never, clamav as never);
    expect((await svc.getClientConfig()).features.uploads_enabled).toBe(false);
    const open = (await svc.getClientConfig()).features;
    expect(open.uploads_enabled).toBe(true);
    expect(open.uploads_pending_scan).toBe(true); // accepted, but the file waits for its scan before anyone can open it
  });

  it('carries site_notice_enabled: ON by default, switched off by the admin flag row', async () => {
    const rows: any[] = [];
    const conn = { collection: () => ({ find: () => ({ project: () => ({ toArray: async () => rows }) }), findOne: async () => null }) };
    const clamav = { uploadsAvailable: jest.fn().mockResolvedValue(true), uploadsPendingScan: jest.fn().mockResolvedValue(false) };
    const svc = new ConfigService(conn as never, clamav as never);
    expect((await svc.getClientConfig()).features.site_notice_enabled).toBe(true);
    rows.push({ key: 'site_notice_enabled', enabled: false, rollout_percentage: 100 });
    expect((await svc.getClientConfig()).features.site_notice_enabled).toBe(false);
  });
});

describe('/config under a slow or failing database', () => {
  const clamav = { uploadsAvailable: async () => true, uploadsPendingScan: async () => false };

  it('concurrent requests share one read of the flag rows', async () => {
    const toArray = jest.fn(async () => { await new Promise((r) => setTimeout(r, 20)); return [{ key: 'x', enabled: true }]; });
    const conn = { collection: () => ({ find: () => ({ project: () => ({ toArray }) }), findOne: async () => null }) };
    const svc = new ConfigService(conn as never, clamav as never);
    const all = await Promise.all([svc.getClientConfig(), svc.getClientConfig(), svc.getClientConfig()]);
    expect(toArray).toHaveBeenCalledTimes(1);
    expect(all.every((c) => c.features.x === true)).toBe(true);
  });

  it('when the database fails after a good read, the last good flags are still served', async () => {
    let down = false;
    const toArray = jest.fn(async () => { if (down) throw new Error('db down'); return [{ key: 'x', enabled: true }]; });
    const conn = { collection: () => ({ find: () => ({ project: () => ({ toArray }) }), findOne: async () => null }) };
    const svc = new ConfigService(conn as never, clamav as never);
    expect((await svc.getClientConfig()).features.x).toBe(true);
    down = true;
    expect((await svc.getClientConfig()).features.x).toBe(true);
  });
});
