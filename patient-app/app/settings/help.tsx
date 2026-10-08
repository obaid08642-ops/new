import React from 'react';

import { HelpView } from '../../src/components/account/HelpView';

/** Help: FAQ and support (?tab=help), feedback (?tab=feedback); absorbs /settings/feedback and /settings/support-chat. */
export default function Screen() {
  return <HelpView />;
}
