import React from 'react';

import { LinkNotFound } from '../src/components/LinkCatcher';

/** Global not-found route: a deep link to a deleted or unknown page lands here, never on a white screen. */
export default function NotFoundScreen() {
  return <LinkNotFound />;
}
