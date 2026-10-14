import * as React from 'react';
import { ILLUSTRATED, ICON_TINT, type Prim } from '../icons/illustrated';
import { ILLUSTRATED_ICONS, type IllustratedIcon } from '../icons/illustrated-names';
import {
  GRID as ILLUSTRATION_GRID,
  ILLUSTRATIONS,
  ILLUSTRATION_META,
  ILLUSTRATION_NAMES,
  type IllustrationName,
} from '../icons/illustrations';
import { SIZES, registerIllustratedRenderer, type IconProps, type IconSize } from './Icon';

/**
 * The ILLUSTRATED half of the icon system (issue #286): the flat brand artwork of the nine illustrated icons
 * and the SCENE set of `<Illustration>`. It is its own module on purpose. The artwork is about 4 KB gz of
 * geometry that no page of patient-web draws, so `<Icon>` loads it on demand (`React.lazy`) instead of
 * shipping it inside every bundle that uses a line icon. Importing this file (or the package barrel) also
 * registers the renderer, so server-side and test renders that import it stay synchronous.
 */

/* ------------------------------------------------- illustrated (one geometry) */

function paintFor(prim: Prim, key: 'fill' | 'stroke'): string | undefined {
  const value = (prim as Record<string, unknown>)[key];
  if (value === undefined || value === 'none') return undefined;
  return `var(--nabd-color-iconArt-${value}, ${FALLBACK_ART[String(value)]})`;
}

const FALLBACK_ART: Record<string, string> = {
  ink: '#0B1B2B',
  paper: '#FFFFFF',
  coral: '#FF6B73',
  amber: '#FFD166',
  blue: '#6E8BFF',
  blueSoft: '#9DB0FF',
  mint: '#3FBF9A',
  mintSoft: '#6FE0B8',
  violet: '#C3A8FF',
  lavender: '#D2B8FF',
  pink: '#F4B8E4',
  lime: '#8EDC5E',
  skin: '#FFB38A',
};

function PrimNode({ prim }: { prim: Prim }) {
  if (prim.el === 'g') {
    const [angle, cx, cy] = prim.rotate ?? [0, 0, 0];
    return (
      <g transform={`rotate(${angle} ${cx} ${cy})`}>
        {prim.children.map((child, i) => (
          <PrimNode key={i} prim={child} />
        ))}
      </g>
    );
  }
  if (prim.el === 'path') {
    return (
      <path
        d={prim.d}
        fill={paintFor(prim, 'fill') ?? 'none'}
        stroke={paintFor(prim, 'stroke')}
        strokeWidth={prim.strokeWidth}
        opacity={prim.opacity}
      />
    );
  }
  if (prim.el === 'circle') {
    return (
      <circle
        cx={prim.cx}
        cy={prim.cy}
        r={prim.r}
        fill={paintFor(prim, 'fill')}
        stroke={paintFor(prim, 'stroke')}
        strokeWidth={prim.strokeWidth}
        opacity={prim.opacity}
      />
    );
  }
  return (
    <rect
      x={prim.x}
      y={prim.y}
      width={prim.w}
      height={prim.h}
      rx={prim.rx}
      fill={paintFor(prim, 'fill')}
      stroke={paintFor(prim, 'stroke')}
      strokeWidth={prim.strokeWidth}
      opacity={prim.opacity}
    />
  );
}

/* -------------------------------------------------------------------- icon */

export function IllustratedIconView({
  name,
  size,
  title,
  className,
  style,
}: Pick<IconProps, 'name' | 'size' | 'title' | 'className' | 'style'> & { name: IllustratedIcon }) {
  const px = typeof size === 'number' ? size : (SIZES[size ?? 'lg'] ?? SIZES.lg);
  const prims = ILLUSTRATED[name];
  if (!prims) throw new Error(`Unknown illustrated icon: ${name}`);

  return (
    <svg
      className={['nabd-icon', 'nabd-icon--illustrated', className].filter(Boolean).join(' ')}
      width={px}
      height={px}
      viewBox="0 0 48 48"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      data-icon={name}
      data-tint={ICON_TINT[name]}
      style={style}
    >
      {title ? <title>{title}</title> : null}
      {prims.map((prim, i) => (
        <PrimNode key={i} prim={prim} />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------- illustrations */

/**
 * `<Illustration>` — the SCENE set for 12.A6: onboarding, empty states, errors
 * and success. Kept out of `<Icon>` on purpose, because a scene is not an icon:
 * it is a picture with a job (say what is happening) that is always paired with a
 * headline and a body from i18n, and those strings carry the meaning for a screen
 * reader. So the picture itself is `aria-hidden` unless it stands alone and is
 * given a `title` — the same contract as the illustrated icons.
 *
 * The scenes are on a 64 grid, the icons on 48, so `size` here is the size of the
 * whole picture and the art scales inside it.
 */
export interface IllustrationProps {
  name: IllustrationName;
  /** The rendered box. The 128px tile is the canvas default for empty states. */
  size?: IconSize | number;
  /** Accessible name, when the scene stands alone. */
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Illustration({ name, size = 'xl', title, className, style }: IllustrationProps) {
  const px = typeof size === 'number' ? size : (SIZES[size] ?? SIZES.xl);
  const prims = ILLUSTRATIONS[name];
  if (!prims) {
    throw new Error(
      `Unknown illustration: ${name}. Use one of ${ILLUSTRATION_NAMES.join(', ')}.`,
    );
  }
  const meta = ILLUSTRATION_META[name];

  return (
    <svg
      className={['nabd-illustration', `nabd-illustration--${meta.kind}`, className]
        .filter(Boolean)
        .join(' ')}
      width={px}
      height={px}
      viewBox={`0 0 ${ILLUSTRATION_GRID} ${ILLUSTRATION_GRID}`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      data-illustration={name}
      data-kind={meta.kind}
      data-tone={meta.tone}
      style={style}
    >
      {title ? <title>{title}</title> : null}
      {prims.map((prim, i) => (
        <PrimNode key={i} prim={prim} />
      ))}
    </svg>
  );
}

registerIllustratedRenderer(IllustratedIconView);

export { ILLUSTRATED_ICONS, ICON_TINT, ILLUSTRATIONS, ILLUSTRATION_META, ILLUSTRATION_NAMES };
export type { IllustratedIcon, IllustrationName };
