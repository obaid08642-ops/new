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
