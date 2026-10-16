import { NotFoundException } from '@nestjs/common';
import { ProviderBadgeController } from './provider-badge.controller';

// P13-R17: provider "Verified on Nabd+" website badge — copy-paste snippet
// showing the verified mark that links to the provider's canonical page
// (plain dofollow link, no hidden links). Verified DONE on main; this spec
// pins the contract (no production change in this PR).
describe('P13-R17 provider verified badge', () => {
  function controllerWith(profile: any) {
    const conn: any = {
      collection: jest.fn(() => ({
        findOne: jest.fn(async () => profile),
      })),
    };
    return new ProviderBadgeController(conn);
  }

  it('an active provider gets a dofollow snippet to its canonical page', async () => {
    const ctl = controllerWith({
      id: 'doc-1', slug: 'dr-ok', status: 'active',
      display_name_ar: 'د. أحمد', display_name_en: 'Dr. Ahmed',
    });
    const out: any = await ctl.badge('doc-1');
    expect(out.canonical_url).toBe('https://www.nabd.plus/ar/doctor/dr-ok');
    expect(out.embed_html).toContain('rel="dofollow"');
    expect(out.embed_html).toContain('https://www.nabd.plus/ar/doctor/dr-ok');
    expect(out.embed_html).not.toContain('display:none');
    expect(out.embed_html).not.toContain('hidden');
  });

  it('a suspended provider gets no badge (404)', async () => {
    const ctl = controllerWith({ id: 'doc-2', slug: 'dr-x', status: 'suspended' });
    await expect(ctl.badge('doc-2')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('an unknown provider gets no badge (404)', async () => {
    const ctl = controllerWith(null);
    await expect(ctl.badge('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
