import { nearestSize, optimizedImageUri } from './optimizedImage';

const origin = 'https://nabd.plus';

describe('optimizedImageUri', () => {
  it('asks the optimizer for the nearest allowed size at the device ratio', () => {
    const out = optimizedImageUri('https://cdn.nabd.plus/doctors/a.jpg', 56, { origin, ratio: 3 });
    expect(out).toBe(`${origin}/_next/image?url=${encodeURIComponent('https://cdn.nabd.plus/doctors/a.jpg')}&w=256&q=75`);
    expect(optimizedImageUri('https://cdn.nabd.plus/a.jpg', 96, { origin, ratio: 2 })).toContain('&w=256&');
    expect(optimizedImageUri('https://cdn.nabd.plus/a.jpg', 390, { origin, ratio: 2 })).toContain('&w=828&');
  });
  it('leaves the address alone when unset, on another host, over http, with credentials or not a url', () => {
    expect(optimizedImageUri('https://cdn.nabd.plus/a.jpg', 56, { origin: '', ratio: 2 })).toBe('https://cdn.nabd.plus/a.jpg');
    expect(optimizedImageUri('https://evil.example/a.jpg', 56, { origin, ratio: 2 })).toBe('https://evil.example/a.jpg');
    expect(optimizedImageUri('http://cdn.nabd.plus/a.jpg', 56, { origin, ratio: 2 })).toBe('http://cdn.nabd.plus/a.jpg');
    expect(optimizedImageUri('https://u:p@cdn.nabd.plus/a.jpg', 56, { origin, ratio: 2 })).toBe('https://u:p@cdn.nabd.plus/a.jpg');
    expect(optimizedImageUri('not a url', 56, { origin, ratio: 2 })).toBe('not a url');
    expect(optimizedImageUri('https://cdn.nabd.plus/a.jpg', 56, { origin: 'http://nabd.plus', ratio: 2 })).toBe('https://cdn.nabd.plus/a.jpg');
  });
  it('none stays none; sizes cap at the largest', () => {
    expect(optimizedImageUri(null, 56, { origin })).toBeUndefined();
    expect(optimizedImageUri('', 56, { origin })).toBeUndefined();
    expect(nearestSize(99999)).toBe(3840);
  });
});
