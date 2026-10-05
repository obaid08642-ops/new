import * as React from 'react';

import type { FIconProps } from './contract';
import { FILL_ICON_PATHS, FILL_ICON_VIEWBOX } from '../icons/fill';

/**
 * <FIcon> — web. Handoff §1 "Icons" and canvas/FIcon.dc.html: a filled Phosphor
 * glyph (geometry ported from the board into icons/fill.ts) in a soft-tinted
 * rounded square, radius 32% of the edge, glyph 52% of the edge.
 *
 *   soft   color.service.<tone>.bg behind color.service.<tone>.fg
 *   solid  160deg gradient color.service.<tone>.solid.{from,to}, white glyph
 *          (color.icon.onSolid), raised with a soft shadow
 *   none   the bare glyph at the full edge, in the tone's fg
 *
 * The colours are CSS custom properties, so the theme switch needs no prop. The
 * tile is drawn as one SVG so its size can vary without a `style` attribute
 * (components.css explains why there is none).
 * Decorative (aria-hidden) unless `label` is given, then it is role="img".
 */
export function FIcon({ icon, tone, size = 52, chip = 'soft', label, testID }: FIconProps) {
  // Tone and size in the id as well as useId: two separately rendered roots (the
  // gallery renders each cell on its own) can mint the same useId, and then the
  // first gradient with that id would paint the other's tile.
  const gradientId = `nabd-ficon-${tone}-${size}-${React.useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const glyph = chip === 'none' ? size : Math.round(size * 0.52);
  const radius = Math.round(size * 0.32);
  const offset = Math.round((size - glyph) / 2);
  // CSS `linear-gradient(160deg, …)` on a size×size box: the gradient line runs
  // through the centre at 160deg and is |w·sin a| + |h·cos a| long.
  const a = (160 * Math.PI) / 180;
  const half = (size * (Math.abs(Math.sin(a)) + Math.abs(Math.cos(a)))) / 2;
  const dx = Math.sin(a) * half;
  const dy = -Math.cos(a) * half;

  // The tile is drawn in SVG: its geometry is presentation attributes, which the
  // CSP allows, and its colours are classes (css/FIcon.css) reading the tone. The
  // span around it is the layout box the component always had (an inline grid).
  return (
    <span
      data-testid={testID}
      data-icon={icon}
      data-tone={tone}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`nabd-ficon nabd-ficon--${chip} nabd-tone--${tone}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false">
        {chip === 'solid' ? (
          <defs>
            <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={size / 2 - dx} y1={size / 2 - dy} x2={size / 2 + dx} y2={size / 2 + dy}>
              <stop offset="0" className="nabd-ficon__from" />
              <stop offset="1" className="nabd-ficon__to" />
            </linearGradient>
          </defs>
        ) : null}
        {chip === 'none' ? null : (
          <rect className="nabd-ficon__chip" width={size} height={size} rx={radius} fill={chip === 'solid' ? `url(#${gradientId})` : undefined} />
        )}
        <svg x={offset} y={offset} width={glyph} height={glyph} viewBox={FILL_ICON_VIEWBOX}>
          <path className="nabd-ficon__glyph" d={FILL_ICON_PATHS[icon]} />
        </svg>
      </svg>
    </span>
  );
}
FIcon.displayName = 'FIcon';
