import React from 'react';

import { RedirectKeepQuery } from '../../src/components/RedirectKeepQuery';

/** Merged into the catalogue (second pass, section 3): the filters are a sheet on /(tabs)/pharmacy and live in the URL as filter_*. Deep links keep their query. */
export default function PharmacyFiltersRedirect() {
  return <RedirectKeepQuery to="/(tabs)/pharmacy" />;
}
