import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

/**
 * 12.A1 — the app must ship the owner-approved brand, not a copy of it.
 *
 * The icons, the favicon and the splash are GENERATED from
 * packages/brand/src/*.svg. They are committed, so nothing stops someone
 * editing assets/icon.png by hand and shipping a logo the owner never
 * approved. These checks compare the shipped bytes against the generated ones,
 * so a hand-edited asset fails instead of quietly reaching the store.
 *
 * The two platform rules are checked too:
 *   - the iOS icon carries no alpha channel (the App Store rejects it);
 *   - the notification icon is a white silhouette (Android masks it, so colour
 *     is discarded and a coloured icon turns into a solid blob).
 */
const ROOT = join(__dirname, '..');
const BRAND = join(ROOT, 'packages', 'brand');
const ASSETS = join(__dirname, 'assets');

const sha256 = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
const read = (file: string): Buffer => readFileSync(file);
const readText = (file: string): string => readFileSync(file, 'utf8');

/** Copies that must be byte-identical to the generated asset. */
const SHIPPED: ReadonlyArray<readonly [string, string]> = [
  ['assets/icon.png', 'icon-1024.png'],
  ['assets/adaptive-icon.png', 'icon-android-foreground-1024.png'],
  ['assets/notification-icon.png', 'notification-icon-1024.png'],
  ['assets/splash.png', 'splash-light-1242x2688.png'],
  ['assets/favicon.png', 'icon-192.png'],
];

describe('Nabd+ brand assets shipped by the app', () => {
  it.each(SHIPPED)('%s is exactly the generated %s', (shipped, generated) => {
    expect(sha256(join(__dirname, shipped))).toBe(sha256(join(BRAND, 'dist', generated)));
  });

  it('the iOS icon is opaque, because the App Store rejects an alpha channel', () => {
    // PNG IHDR: 8-byte signature, then the first chunk is IHDR, whose payload
    // starts at byte 16. Colour type 2 = truecolour RGB, 6 = RGBA.
    const icon = read(join(ASSETS, 'icon.png'));
    expect([...icon.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(icon.readUInt8(25)).toBe(2);
  });

  it('the notification icon is a white silhouette, because Android masks it', () => {
    // The shipped PNG is byte-identical to the generated one (above), so it is
    // enough to prove the source it was generated from is white-only. That is
    // the fact a reviewer can actually check by eye, and it costs nothing.
    const source = readText(join(BRAND, 'src', 'notification-icon.svg'));
    // Comments are prose, not markup: strip them so this checks the drawing.
    const markup = source.replace(/<!--[\s\S]*?-->/g, '');
    const colours = [...markup.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{3,8})"/g)].map((m) =>
      m[1].toUpperCase(),
    );
    expect(colours.length).toBeGreaterThan(0);
    expect(new Set(colours)).toEqual(new Set(['var(--nabd-bg.surface-light)']));
    // No opacity, gradient or fill-rule trickery that would tint the mask.
    expect(markup).not.toMatch(/opacity|Gradient/i);
    // The one transparent value allowed is the "no fill" of the bowl path.
    expect(markup.match(/fill="none"/g) ?? []).toHaveLength(1);

    // The raster keeps its alpha, which is what lets the launcher mask it.
    const icon = read(join(ASSETS, 'notification-icon.png'));
    expect(icon.readUInt8(25)).toBe(6);
  });

  it('every brand source still uses the owner-approved mark geometry', () => {
    // build.mjs enforces this too; asserting it here means a change to the
    // mark geometry cannot reach a reviewer unnoticed.
    const BOWL = 'M40 104 C40 196 200 196 200 104';
    const DOT = 'cx="120" cy="58" r="24"';
    for (const file of [
      'logo-mark.svg',
      'logo-mark-ink.svg',
      'logo-mark-onbrand.svg',
      'favicon.svg',
      'icon-ios.svg',
      'icon-maskable.svg',
      'icon-square.svg',
      'icon-android-foreground.svg',
      'notification-icon.svg',
      'splash-light.svg',
      'splash-dark.svg',
    ]) {
      const svg = readText(join(BRAND, 'src', file));
      expect(svg).toContain(BOWL);
      expect(svg).toContain(DOT);
      expect(svg).toContain('stroke-width="36"');
    }
  });

  it('app.json paints the splash and the adaptive icon in brand colours', () => {
    const expo = JSON.parse(readText(join(__dirname, 'app.json'))).expo;
    // var(--nabd-bg.canvas-light) = brand.canvas, var(--nabd-brand.coral-light) = brand.coral, var(--nabd-action.primary.bg-light) = action.primary.
    expect(expo.splash.backgroundColor).toBe('var(--nabd-bg.canvas-light)');
    expect(expo.android.adaptiveIcon.backgroundColor).toBe('var(--nabd-brand.coral-light)');
    // The retired pre-2026-09-29 brand blue must not survive anywhere.
    expect(JSON.stringify(expo)).not.toContain('#0066CC');
  });
});
