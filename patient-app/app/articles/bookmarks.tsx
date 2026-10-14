import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Saved articles are the Saved tab of the articles list (merge map, Batch 10). */
export default function ArticleBookmarksRedirect() {
  return <RedirectKeepingParams to="/articles" params={{ tab: 'saved' }} />;
}
