/**
 * Draws one hologram pin on a canvas (browser only). Every colour is read from the page's token variables at draw time
 * (`--nabd-color-service-<tone>-*`, `--nabd-color-action-primary-fg`), so light and dark follow the tokens; none is written here.
 * Look (from the first app map): a flat translucent base platform in the kind's shape, a light beam rising from it, and a
 * glowing icon bubble floating above; the selected pin is bigger and lifted higher.
 */
import { FILL_ICON_PATHS } from "@/components-next/ui-generated/icons/fill";
import { HOLO_STYLE, type HoloKind } from "@/lib/map/hologram";

export const HOLO_W = 64;
export const HOLO_H = 84;

type Palette = { fg: string; from: string; to: string; glyph: string };

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function holoPalette(kind: HoloKind): Palette {
  const tone = HOLO_STYLE[kind].tone;
  return {
    fg: cssVar(`--nabd-color-service-${tone}-fg`),
    from: cssVar(`--nabd-color-service-${tone}-solid-from`),
    to: cssVar(`--nabd-color-service-${tone}-solid-to`),
    glyph: cssVar("--nabd-color-action-primary-fg"),
  };
}

function platformPath(ctx: CanvasRenderingContext2D, shape: (typeof HOLO_STYLE)[HoloKind]["shape"], s: number) {
  const h = s / 2;
  ctx.beginPath();
  switch (shape) {
    case "circle": ctx.arc(0, 0, h, 0, Math.PI * 2); break;
    case "diamond": ctx.rotate(Math.PI / 4); ctx.rect(-h * 0.75, -h * 0.75, s * 0.75, s * 0.75); break;
    case "rect": ctx.rect(-h * 1.1, -h * 0.78, s * 1.1, s * 0.78); break;
    case "rounded": ctx.roundRect(-h, -h, s, s, s * 0.32); break;
    default: ctx.roundRect(-h, -h, s, s, s * 0.16);
  }
}

/** Draws into a canvas that is HOLO_W x HOLO_H logical pixels, `ratio` device pixels per logical pixel. */
export function drawHologram(canvas: HTMLCanvasElement, kind: HoloKind, opts: { selected?: boolean; lifted?: boolean; ratio?: number } = {}): void {
  const ratio = opts.ratio ?? 2;
  const selected = Boolean(opts.selected);
  canvas.width = HOLO_W * ratio;
  canvas.height = HOLO_H * ratio;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const pal = holoPalette(kind);
  const { shape, icon } = HOLO_STYLE[kind];
  ctx.scale(ratio, ratio);
  const cx = HOLO_W / 2;
  const baseY = HOLO_H - 12;
  const lift = selected && opts.lifted !== false ? 30 : selected ? 22 : 16;
  const bubbleY = baseY - lift - 12;

  // base platform: flattened, translucent, border stronger when selected
  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(1, 0.4);
  platformPath(ctx, shape, selected ? 38 : 32);
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = pal.from;
  ctx.fill();
  ctx.globalAlpha = selected ? 1 : 0.5;
  ctx.lineWidth = 2;
  ctx.strokeStyle = pal.fg;
  ctx.stroke();
  ctx.restore();

  // light beam from the platform up to the bubble
  const beam = ctx.createLinearGradient(0, baseY, 0, bubbleY);
  beam.addColorStop(0, pal.fg);
  beam.addColorStop(1, pal.from);
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = beam;
  const bw = selected ? 11 : 7;
  ctx.beginPath();
  ctx.moveTo(cx - bw, baseY);
  ctx.lineTo(cx - 2, bubbleY);
  ctx.lineTo(cx + 2, bubbleY);
  ctx.lineTo(cx + bw, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // glowing icon bubble
  const r = selected ? 17 : 13;
  ctx.save();
  ctx.shadowColor = pal.fg;
  ctx.shadowBlur = selected ? 14 : 9;
  const fill = ctx.createLinearGradient(cx, bubbleY - r, cx, bubbleY + r);
  fill.addColorStop(0, pal.from);
  fill.addColorStop(1, pal.to);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(cx, bubbleY, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = pal.glyph;
  ctx.globalAlpha = 0.55;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // glyph (the 256-unit icon path, scaled into the bubble)
  const g = (r * 1.15) / 256;
  ctx.save();
  ctx.translate(cx - 128 * g, bubbleY - 128 * g);
  ctx.scale(g, g);
  ctx.fillStyle = pal.glyph;
  ctx.fill(new Path2D(FILL_ICON_PATHS[icon]));
  ctx.restore();
}
