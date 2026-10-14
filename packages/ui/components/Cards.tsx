import * as React from 'react';
import clsx from 'clsx';

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
 *
 * Every box is a class in css/Cards.css (components.css explains why there is no
 * `style` prop); a tone is `nabd-tone--<tone>`, a state a modifier class, and the
 * ProgressRing's free size stays in SVG attributes.
 */

function Glyph({ name, size, color }: { name: FillIconName; size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox={FILL_ICON_VIEWBOX} aria-hidden="true" className="nabd-cards-glyph">
      <path d={FILL_ICON_PATHS[name]} fill={color} />
    </svg>
  );
}

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
  // Without a price the book action takes the free space before it.
  const book = clsx('nabd-doctor-card__book', { 'nabd-doctor-card__book--push': !price });

  return (
    <Root href={href} data-testid={testID} className="nabd-doctor-card">
      <div className="nabd-doctor-card__body">
        <div className={`nabd-doctor-card__photo nabd-tone--${tone}`}>
          {photoSrc ? (
            <img src={photoSrc} alt="" aria-hidden className="nabd-doctor-card__img" />
          ) : (
            <Glyph name="user" size={44} color={`var(--nabd-color-service-${tone}-fg)`} />
          )}
          {availableLabel ? <span role="img" aria-label={availableLabel} className="nabd-doctor-card__available" /> : null}
        </div>
        <div className="nabd-doctor-card__info">
          <div className="nabd-doctor-card__title">
            <span className="nabd-doctor-card__name">{name}</span>
            {verifiedLabel ? (
              <svg width={17} height={17} viewBox={MARK_VIEWBOX_24} role="img" aria-label={verifiedLabel} className="nabd-cards-glyph">
                <path d={SEAL_PATH} fill="var(--nabd-color-service-blue-fg)" />
                <path d={SEAL_CHECK_PATH} fill="none" stroke="var(--nabd-color-icon-onSolid)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
          </div>
          {grade ? <span className="nabd-doctor-card__grade">{grade}</span> : null}
          {specialty ? <span className="nabd-doctor-card__specialty">{specialty}</span> : null}
          {place ? (
            <span className="nabd-doctor-card__place">
              <Glyph name="map-pin" size={14} color="var(--nabd-color-action-primary-bg)" />
              {place}
            </span>
          ) : null}
          {modes.length ? (
            <div className="nabd-doctor-card__modes">
              {modes.map(({ mode, label }) => (
                <span key={mode} className={`nabd-doctor-card__mode nabd-tone--${MODE[mode].tone}`}>
                  <Glyph name={MODE[mode].icon} size={13} color="currentColor" />
                  {label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="nabd-doctor-card__footer">
        {rating ? <Rating value={rating.value} count={rating.count} surface="onBrand" /> : null}
        {nextSlot ? (
          <span className="nabd-doctor-card__slot">
            <svg width={15} height={15} viewBox={MARK_VIEWBOX_24} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d={CLOCK_PATH} />
            </svg>
            {nextSlot}
          </span>
        ) : null}
        {price ? (
          <span className="nabd-doctor-card__price">
            {price}
            {currency ? <span className="nabd-doctor-card__currency"> {currency}</span> : null}
          </span>
        ) : null}
        {href || !onBook ? (
          <span className={book}>{bookLabel}</span>
        ) : (
          <button type="button" onClick={onBook} className={clsx(book, 'nabd-doctor-card__book--button')}>
            {bookLabel}
            {/* 40 to look at, 44 to hit */}
            <span aria-hidden className="nabd-doctor-card__hit" />
          </button>
        )}
      </div>
    </Root>
  );
}

/* ----------------------------------------------------------- ProductCard */

export interface WebProductCardProps extends ProductCardProps {
  href?: string;
  /**
   * The link element when `href` is set: a screen passes its router's <Link> so the card navigates
   * client-side and is prefetched; the default is a plain <a>.
   */
  linkAs?: React.ElementType;
  /** The first cards of a list are the page's largest paint: load their image early. Others are lazy. */
  imagePriority?: boolean;
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
  linkAs,
  imagePriority = false,
  onAdd,
  loading = false,
  disabled = false,
  testID,
}: WebProductCardProps) {
  const LinkEl: React.ElementType = linkAs ?? 'a';
  const inert = disabled || loading;
  const body = (
    <>
      <div className="nabd-product-card__media">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            aria-hidden
            className="nabd-product-card__img"
            loading={imagePriority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={imagePriority ? 'high' : 'auto'}
          />
        ) : (
          <Glyph name="pill" size={40} color="var(--nabd-color-icon-secondary)" />
        )}
        {discountLabel ? <span className="nabd-product-card__discount">{discountLabel}</span> : null}
      </div>
      <span className="nabd-product-card__name">{name}</span>
      {meta ? <span className="nabd-product-card__meta">{meta}</span> : null}
    </>
  );

  return (
    <div data-testid={testID} className="nabd-product-card">
      {href ? (
        <LinkEl href={href} className="nabd-product-card__link">
          {body}
        </LinkEl>
      ) : (
        body
      )}
      <div className="nabd-product-card__bar">
        <div className="nabd-product-card__prices">
          <span className="nabd-product-card__price">
            {price}
            {currency ? <span className="nabd-product-card__currency"> {currency}</span> : null}
          </span>
          {rxLabel ? <span className="nabd-product-card__rx">{rxLabel}</span> : null}
        </div>
        <button
          type="button"
          aria-label={addLabel}
          aria-busy={loading || undefined}
          disabled={inert}
          onClick={inert ? undefined : onAdd}
          data-testid={testID ? `${testID}-add` : undefined}
          className={clsx('nabd-product-card__add', {
            'nabd-product-card__add--inert': inert,
            'nabd-product-card__add--disabled': disabled,
          })}
        >
          <svg width={18} height={18} viewBox={FILL_ICON_VIEWBOX} aria-hidden="true">
            <path d={PLUS_SQUARE_PATH} fill="var(--nabd-color-action-selected-fg)" />
          </svg>
          {/* 40 to look at, 44 to hit */}
          <span aria-hidden className="nabd-product-card__hit" />
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
    <Root href={href} data-testid={testID} className="nabd-offer-card">
      <div className={`nabd-offer-card__head nabd-tone--${tone}`}>
        <FIcon icon={icon} tone={tone} chip="none" size={56} />
        {tag ? <span className="nabd-offer-card__tag">{tag}</span> : null}
      </div>
      <div className="nabd-offer-card__body">
        <span className="nabd-offer-card__title">{title}</span>
        {provider ? <span className="nabd-offer-card__provider">{provider}</span> : null}
        <div className="nabd-offer-card__prices">
          <span className="nabd-offer-card__price">{price}</span>
          {currency ? <span className="nabd-offer-card__currency">{currency}</span> : null}
          {was ? <span className="nabd-offer-card__was">{was}</span> : null}
        </div>
      </div>
    </Root>
  );
}

/* -------------------------------------------------------------- Timeline */

export function Timeline({ steps, label, testID }: TimelineProps) {
  return (
    // canvas/OrderTracking: 14 between the steps (the card's gap), each step at least 56 tall (css/Cards.css)
    <ol aria-label={label} data-testid={testID} className="nabd-timeline">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        const done = step.state === 'done';
        const current = step.state === 'current';
        // the line below a step is coral once the next step has been reached
        const lineReached = !last && steps[i + 1].state !== 'upcoming';
        return (
          <li key={step.id} aria-current={current ? 'step' : undefined} className={clsx('nabd-timeline__step', { 'nabd-timeline__step--last': last })}>
            <div className="nabd-timeline__rail">
              <span
                aria-hidden
                className={clsx('nabd-timeline__dot', {
                  'nabd-timeline__dot--reached': done || current,
                  'nabd-timeline__dot--current': current,
                })}
              >
                {done ? <Glyph name="check-circle" size={12} color="var(--nabd-color-action-primary-fg)" /> : null}
              </span>
              {last ? null : <span aria-hidden className={clsx('nabd-timeline__line', { 'nabd-timeline__line--reached': lineReached })} />}
            </div>
            <div className="nabd-timeline__text">
              <span
                className={clsx('nabd-timeline__label', {
                  'nabd-timeline__label--current': current,
                  'nabd-timeline__label--upcoming': step.state === 'upcoming',
                })}
              >
                {step.label}
              </span>
              {step.time ? <span className="nabd-timeline__time">{step.time}</span> : null}
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
  // The box is the SVG's size (its width/height attributes); the centre value is
  // 24 in 104, scaled with the box in css/Cards.css.
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      data-testid={testID}
      className="nabd-progress-ring"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="nabd-progress-ring__svg">
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
      <div className="nabd-progress-ring__centre">
        {valueText ? <span className="nabd-progress-ring__value">{valueText}</span> : null}
        {caption ? <span className="nabd-progress-ring__caption">{caption}</span> : null}
      </div>
    </div>
  );
}
