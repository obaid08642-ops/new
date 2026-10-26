"use client";

// GENERATED FILE — DO NOT EDIT.
//
// Mirrored from packages/ui/components/OfferCard.tsx by tools/design/sync-ui-components.mjs.
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

import type { OfferCardProps } from './contract';
import { FIcon } from './FIcon';

/** OfferCard: apart from Cards.tsx because FIcon takes the icon by name and so carries the whole icon record. */

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
