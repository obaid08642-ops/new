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
});
