import { classifyOrphans, folderOf, keyVariants, reportLines } from './cloudinary-orphans-core';

const NOW = Date.UTC(2026, 10, 12, 12, 0, 0);
const old = '2026-11-01T00:00:00Z';
const fresh = '2026-11-12T11:30:00Z';
const MB = 1048576;

describe('Cloudinary orphans (dry-run counts)', () => {
  const assets = [
    { public_id: 'nabd/doctors/original/u1', bytes: 2 * MB, created_at: old },
    { public_id: 'nabd/doctors/large/u1', bytes: 1 * MB, created_at: old },
    { public_id: 'nabd/provider_account/u2/aaaa', bytes: 3 * MB, created_at: old },      // no live row: orphan
    { public_id: 'nabd/provider_account/u3/bbbb', bytes: 1 * MB, created_at: fresh },    // no row yet, but young
    { public_id: 'nabd/doctors/original/u9', bytes: 5 * MB, created_at: old },           // row deleted: orphan
  ];
  const refs = ['nabd/doctors/original/u1.webp', 'nabd/doctors/large/u1'];

  it('counts referenced and orphan assets and bytes; the extension of a stored key does not matter', () => {
    const r = classifyOrphans(assets, refs, NOW, 24 * 3_600_000);
    expect(r).toMatchObject({ assets: 5, referenced: 2, referencedBytes: 3 * MB, orphans: 3, orphanBytes: 9 * MB });
  });

  it('an orphan younger than the minimum age is counted but never deletable', () => {
    const r = classifyOrphans(assets, refs, NOW, 24 * 3_600_000);
    expect(r.tooYoung).toBe(1);
    expect(r.deletable.sort()).toEqual(['nabd/doctors/original/u9', 'nabd/provider_account/u2/aaaa']);
  });

  it('nothing referenced is ever deletable, even when old', () => {
    const r = classifyOrphans(assets, refs, NOW, 0);
    expect(r.deletable).not.toContain('nabd/doctors/original/u1');
    expect(r.deletable).not.toContain('nabd/doctors/large/u1');
  });

  it('the report names folders, never an asset or account id', () => {
    const text = reportLines(classifyOrphans(assets, refs, NOW, 24 * 3_600_000)).join('\n');
    expect(text).toContain('3 orphans (9.0 MB)');
    expect(text).toContain('folder nabd/provider_account: 2 orphans, 4.0 MB');
    expect(text).toContain('folder nabd/doctors/original: 1 orphans, 5.0 MB');
    expect(text).not.toMatch(/u1|u2|u3|u9|aaaa|bbbb/);
  });

  it('helpers', () => {
    expect(folderOf('nabd/doctors/original/u1')).toBe('nabd/doctors/original');
    expect(folderOf('nabd/provider_account/owner-id/uuid-1')).toBe('nabd/provider_account');
    expect(folderOf('single')).toBe('(root)');
    expect(keyVariants('a/b.webp')).toEqual(['a/b.webp', 'a/b']);
    expect(keyVariants('a/b')).toEqual(['a/b']);
  });
});
