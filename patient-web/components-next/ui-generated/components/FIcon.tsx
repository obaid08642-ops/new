"use client";

// GENERATED FILE — DO NOT EDIT.
//
// Mirrored from packages/ui/components/FIcon.tsx by tools/design/sync-ui-components.mjs.
//
// patient-web cannot import from packages/: Turbopack refuses to resolve outside
// the app root, and the type checker does not, so the failure only appears at
// `next build`. This file is a copy, not a port — the renderer a screen uses and
// the renderer the conformance gallery exercises are the same code, so the
// artwork cannot drift between them. Run the script after changing the package;
// `--check` in CI fails if this drifts.
//
// tests/module-boundary.test.ts enforces the boundary this mirror exists to work
// around.
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
 * The colours are CSS custom properties, so the theme switch needs no prop.
 * Decorative (aria-hidden) unless `label` is given, then it is role="img".
 */
export function FIcon({ icon, tone, size = 52, chip = 'soft', label, testID }: FIconProps) {
  const v = (part: string) => `var(--nabd-color-service-${tone}-${part})`;
  const glyph = chip === 'none' ? size : Math.round(size * 0.52);
  const fill = chip === 'solid' ? 'var(--nabd-color-icon-onSolid)' : v('fg');
  const background =
    chip === 'soft' ? v('bg') : chip === 'solid' ? `linear-gradient(160deg, ${v('solid-from')} 0%, ${v('solid-to')} 100%)` : 'transparent';

  return (
    <span
      data-testid={testID}
      data-icon={icon}
      data-tone={tone}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="nabd-ficon"
      style={{
        display: 'inline-grid',
        placeItems: 'center',
        flexShrink: 0,
        inlineSize: size,
        blockSize: size,
        borderRadius: Math.round(size * 0.32),
        background,
        boxShadow: chip === 'solid' ? 'var(--nabd-shadow-tile)' : undefined,
      }}
    >
      <svg width={glyph} height={glyph} viewBox={FILL_ICON_VIEWBOX} aria-hidden="true" focusable="false">
        <path d={FILL_ICON_PATHS[icon]} fill={fill} />
      </svg>
    </span>
  );
}
FIcon.displayName = 'FIcon';
