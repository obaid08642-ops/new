import * as React from 'react';

import type { ConsultMode, DoctorCardProps, OfferCardProps, ProductCardProps, ProgressRingProps, TimelineProps } from './contract';
import { FIcon } from './FIcon';
import { Rating } from './Surfaces';
import { FILL_ICON_PATHS, FILL_ICON_VIEWBOX, type FillIconName } from '../icons/fill';
import { CLOCK_PATH, MARK_VIEWBOX_24, PLUS_SQUARE_PATH, SEAL_CHECK_PATH, SEAL_PATH } from '../icons/marks';

/**
 * The content cards of handoff §3 — DoctorCard, ProductCard, OfferCard — and the
 * Timeline and ProgressRing, web. Geometry is the boards' (named on each); every
 * colour and shadow is a token. Optional data is hidden when absent: a card never
 * shows a default or sample value.
 */

function Glyph({ name, size, color }: { name: FillIconName; size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox={FILL_ICON_VIEWBOX} aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d={FILL_ICON_PATHS[name]} fill={color} />
    </svg>
  );
}

const CARD_TEXT: React.CSSProperties = { textDecoration: 'none', color: 'var(--nabd-color-text-primary)' };

/* ------------------------------------------------------------ DoctorCard */

const MODE: Record<ConsultMode, { icon: FillIconName; tone: 'blue' | 'mint' | 'violet' }> = {
  clinic: { icon: 'hospital', tone: 'blue' },
  home: { icon: 'house', tone: 'mint' },
  online: { icon: 'video-camera', tone: 'violet' },
};

export interface WebDoctorCardProps extends DoctorCardProps {
  /** The doctor's page; the whole card is the link (canvas/Consult). */
  href?: string;
  /** Without `href`, the book button is a real button calling this. */
  onBook?: () => void;
}

export function DoctorCard({
  name,
  photoSrc,
  tone = 'blue',
  verifiedLabel,
  availableLabel,
  grade,
  specialty,
  place,
  modes = [],
  rating,
  nextSlot,
  price,
  currency,
  bookLabel,
  href,
  onBook,
  testID,
}: WebDoctorCardProps) {
  const Root = href ? 'a' : 'article';
  const book = {
    height: 40,
    paddingInline: 18,
    borderRadius: 14,
    background: 'var(--nabd-color-bg-surface)',
    color: 'var(--nabd-color-action-primary-bg)',
    fontSize: '15px',
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    border: 0,
    fontFamily: 'inherit',
  } as const;

  return (
    <Root
      href={href}
      data-testid={testID}
      style={{
        ...CARD_TEXT,
        borderRadius: 28,
        background: 'var(--nabd-color-bg-surface)',
        border: '1px solid var(--nabd-color-border-hairline)',
        boxShadow: 'var(--nabd-shadow-feature)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: 16, display: 'flex', gap: 14 }}>
        <div
          style={{
            width: 104,
            height: 118,
            flexShrink: 0,
            // the organic photo shape of the board
            borderRadius: '52% 48% 46% 54% / 44% 46% 54% 56%',
            background: `var(--nabd-color-service-${tone}-bg)`,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {photoSrc ? (
            <img src={photoSrc} alt="" aria-hidden style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Glyph name="user" size={44} color={`var(--nabd-color-service-${tone}-fg)`} />
          )}
          {availableLabel ? (
            <span
              role="img"
              aria-label={availableLabel}
              style={{
                position: 'absolute',
                bottom: 8,
                insetInlineEnd: 8,
                // 14 plus a 3px ring each side, as the board's content-box dot
                width: 14,
                height: 14,
                boxSizing: 'content-box',
                borderRadius: 10,
                background: 'var(--nabd-color-presence-online)',
                border: '3px solid var(--nabd-color-bg-surface)',
              }}
            />
          ) : null}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '17px', fontWeight: 700 }}>{name}</span>
            {verifiedLabel ? (
              <svg width={17} height={17} viewBox={MARK_VIEWBOX_24} role="img" aria-label={verifiedLabel} style={{ flexShrink: 0 }}>
                <path d={SEAL_PATH} fill="var(--nabd-color-service-blue-fg)" />
                <path d={SEAL_CHECK_PATH} fill="none" stroke="var(--nabd-color-icon-onSolid)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
          </div>
          {grade ? (
            <span
              style={{
                alignSelf: 'flex-start',
                height: 24,
                paddingInline: 10,
                borderRadius: 12,
                background: 'var(--nabd-color-service-blue-bg)',
                color: 'var(--nabd-color-service-blue-fg)',
                fontSize: '12px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {grade}
            </span>
          ) : null}
          {specialty ? <span style={{ fontSize: 'var(--nabd-font-size-caption)', color: 'var(--nabd-color-text-tertiary)' }}>{specialty}</span> : null}
          {place ? (
            <span style={{ fontSize: 'var(--nabd-font-size-label)', color: 'var(--nabd-color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Glyph name="map-pin" size={14} color="var(--nabd-color-action-primary-bg)" />
              {place}
            </span>
          ) : null}
          {modes.length ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {modes.map(({ mode, label }) => (
                <span
                  key={mode}
                  style={{
                    height: 26,
                    paddingInline: 9,
                    borderRadius: 13,
                    background: `var(--nabd-color-service-${MODE[mode].tone}-bg)`,
                    color: `var(--nabd-color-service-${MODE[mode].tone}-fg)`,
                    fontSize: 'var(--nabd-font-size-micro)',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Glyph name={MODE[mode].icon} size={13} color="currentColor" />
                  {label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div
        style={{
          paddingBlock: 12,
          paddingInlineStart: 12,
          paddingInlineEnd: 14,
          background: 'linear-gradient(180deg, var(--nabd-color-action-primary-gradient-from) 0%, var(--nabd-color-action-primary-gradient-to) 100%)',
          color: 'var(--nabd-color-action-primary-fg)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {rating ? <Rating value={rating.value} count={rating.count} surface="onBrand" /> : null}
        {nextSlot ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--nabd-font-size-caption)' }}>
            <svg width={15} height={15} viewBox={MARK_VIEWBOX_24} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d={CLOCK_PATH} />
            </svg>
            {nextSlot}
          </span>
        ) : null}
        {price ? (
          <span style={{ marginInlineStart: 'auto', fontSize: '16px', fontWeight: 700 }}>
            {price}
            {currency ? <span style={{ fontSize: '11px', fontWeight: 400 }}> {currency}</span> : null}
          </span>
        ) : null}
        {href || !onBook ? (
          <span style={{ ...book, marginInlineStart: price ? undefined : 'auto' }}>{bookLabel}</span>
        ) : (
          <button type="button" onClick={onBook} style={{ ...book, position: 'relative', cursor: 'pointer', marginInlineStart: price ? undefined : 'auto' }}>
            {bookLabel}
            {/* 40 to look at, 44 to hit */}
            <span aria-hidden style={{ position: 'absolute', insetInline: 0, insetBlock: 'calc((40px - var(--nabd-a11y-minTouchTarget)) / 2)' }} />
          </button>
        )}
      </div>
    </Root>
  );
}

/* ----------------------------------------------------------- ProductCard */

export interface WebProductCardProps extends ProductCardProps {
  href?: string;
  onAdd?: () => void;
}

export function ProductCard({
  name,
  meta,
  price,
  currency,
  imageSrc,
  discountLabel,
  rxLabel,
  addLabel,
  href,
  onAdd,
  loading = false,
  disabled = false,
  testID,
}: WebProductCardProps) {
  const inert = disabled || loading;
  const body = (
    <>
      <div
        style={{
          height: 132,
          borderRadius: 18,
          background: 'var(--nabd-color-bg-media)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {imageSrc ? (
          <img src={imageSrc} alt="" aria-hidden style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        ) : (
          <Glyph name="pill" size={40} color="var(--nabd-color-icon-secondary)" />
        )}
        {discountLabel ? (
          <span
            style={{
              position: 'absolute',
              top: 8,
              insetInlineStart: 8,
              height: 22,
              paddingInline: 8,
              borderRadius: 11,
              background: 'var(--nabd-color-action-primary-bg)',
              color: 'var(--nabd-color-action-primary-fg)',
              fontSize: '11px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {discountLabel}
          </span>
        ) : null}
      </div>
      <span style={{ fontSize: '14px', fontWeight: 600, lineHeight: 1.4 }}>{name}</span>
      {meta ? <span style={{ fontSize: '12px', color: 'var(--nabd-color-text-secondary)' }}>{meta}</span> : null}
    </>
  );

  return (
    <div
      data-testid={testID}
      style={{
        borderRadius: 24,
        background: 'var(--nabd-color-bg-surface)',
        border: '1px solid var(--nabd-color-border-hairline)',
        boxShadow: 'var(--nabd-shadow-card)',
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        color: 'var(--nabd-color-text-primary)',
      }}
    >
      {href ? (
        <a href={href} style={{ ...CARD_TEXT, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {body}
        </a>
      ) : (
        body
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '16px', fontWeight: 700 }}>
            {price}
            {currency ? <span style={{ fontSize: '11px', fontWeight: 400 }}> {currency}</span> : null}
          </span>
          {rxLabel ? <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--nabd-color-status-warning-fg)' }}>{rxLabel}</span> : null}
        </div>
        <button
          type="button"
          aria-label={addLabel}
          aria-busy={loading || undefined}
          disabled={inert}
          onClick={inert ? undefined : onAdd}
          data-testid={testID ? `${testID}-add` : undefined}
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            border: 0,
            padding: 0,
            position: 'relative',
            background: 'var(--nabd-color-action-selected-bg)',
            display: 'grid',
            placeItems: 'center',
            cursor: inert ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <svg width={18} height={18} viewBox={FILL_ICON_VIEWBOX} aria-hidden="true">
            <path d={PLUS_SQUARE_PATH} fill="var(--nabd-color-action-selected-fg)" />
          </svg>
          {/* 40 to look at, 44 to hit */}
          <span aria-hidden style={{ position: 'absolute', inset: 'calc((40px - var(--nabd-a11y-minTouchTarget)) / 2)' }} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- OfferCard */

export interface WebOfferCardProps extends OfferCardProps {
  href?: string;
}

export function OfferCard({ title, provider, price, currency, was, tag, icon, tone, href, testID }: WebOfferCardProps) {
  const Root = href ? 'a' : 'article';
  return (
    <Root
      href={href}
      data-testid={testID}
      style={{
        ...CARD_TEXT,
        width: 236,
        flexShrink: 0,
        borderRadius: 24,
        background: 'var(--nabd-color-bg-surface)',
        border: '1px solid var(--nabd-color-border-hairline)',
        boxShadow: 'var(--nabd-shadow-card)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ height: 112, background: `var(--nabd-color-service-${tone}-bg)`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FIcon icon={icon} tone={tone} chip="none" size={56} />
        {tag ? (
          <span
            style={{
              position: 'absolute',
              top: 10,
              insetInlineStart: 10,
              height: 24,
              paddingInline: 9,
              borderRadius: 12,
              background: 'var(--nabd-color-bg-surface)',
              fontSize: '11px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {tag}
          </span>
        ) : null}
      </div>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: '14.5px', fontWeight: 700 }}>{title}</span>
        {provider ? <span style={{ fontSize: '12px', color: 'var(--nabd-color-text-secondary)' }}>{provider}</span> : null}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
          <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--nabd-color-text-price)' }}>{price}</span>
          {currency ? <span style={{ fontSize: '11px', color: 'var(--nabd-color-text-secondary)' }}>{currency}</span> : null}
          {was ? <span style={{ fontSize: '12px', color: 'var(--nabd-color-text-secondary)', textDecoration: 'line-through' }}>{was}</span> : null}
        </div>
      </div>
    </Root>
  );
}

/* -------------------------------------------------------------- Timeline */

export function Timeline({ steps, label, testID }: TimelineProps) {
  return (
    // canvas/OrderTracking: 14 between the steps (the card's gap), each step at least 56 tall
    <ol aria-label={label} data-testid={testID} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        const done = step.state === 'done';
        const current = step.state === 'current';
        // the line below a step is coral once the next step has been reached
        const lineReached = !last && steps[i + 1].state !== 'upcoming';
        return (
          <li key={step.id} aria-current={current ? 'step' : undefined} style={{ display: 'flex', gap: 12, minHeight: last ? 30 : 56 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24 }}>
              <span
                aria-hidden
                style={{
                  width: current ? 22 : 16,
                  height: current ? 22 : 16,
                  borderRadius: 12,
                  boxSizing: 'border-box',
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  background: done || current ? 'var(--nabd-color-action-primary-bg)' : 'var(--nabd-color-bg-surface)',
                  border: done || current ? 0 : '2px solid var(--nabd-color-border-strong)',
                  boxShadow: current ? '0 0 0 6px color-mix(in srgb, var(--nabd-color-action-primary-bg) 15%, transparent)' : 'none',
                }}
              >
                {done ? <Glyph name="check-circle" size={12} color="var(--nabd-color-action-primary-fg)" /> : null}
              </span>
              {last ? null : (
                <span
                  aria-hidden
                  style={{
                    flexGrow: 1,
                    width: 2,
                    marginBlock: 4,
                    background: lineReached ? 'var(--nabd-color-action-primary-bg)' : 'var(--nabd-color-border-subtle)',
                  }}
                />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span
                style={{
                  fontSize: 'var(--nabd-font-size-body)',
                  fontWeight: current ? 700 : 500,
                  color: step.state === 'upcoming' ? 'var(--nabd-color-text-secondary)' : 'var(--nabd-color-text-primary)',
                }}
              >
                {step.label}
              </span>
              {step.time ? <span style={{ fontSize: '12px', color: 'var(--nabd-color-text-secondary)' }}>{step.time}</span> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------------------------------------------------- ProgressRing */

export function ProgressRing({ value, tone, label, size = 104, valueText, caption, testID }: ProgressRingProps) {
  const v = Math.min(1, Math.max(0, value));
  const c = size / 2;
  // canvas/CareHub: r 44 and stroke 10 in a 104 box, scaled with the size
  const stroke = (10 / 104) * size;
  const r = (44 / 104) * size;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      data-testid={testID}
      style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={c} cy={c} r={r} fill="none" stroke={`var(--nabd-color-service-${tone}-bg)`} strokeWidth={stroke} />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={`var(--nabd-color-service-${tone}-solid-to)`}
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={100}
          strokeDashoffset={100 - v * 100}
          transform={`rotate(-90 ${c} ${c})`}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.2 }}>
        {valueText ? <span style={{ fontSize: `${(24 / 104) * size}px`, fontWeight: 700, color: 'var(--nabd-color-text-primary)' }}>{valueText}</span> : null}
        {caption ? <span style={{ fontSize: '11px', color: 'var(--nabd-color-text-secondary)' }}>{caption}</span> : null}
      </div>
    </div>
  );
}

