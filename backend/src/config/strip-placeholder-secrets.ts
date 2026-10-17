// Side-effect import: runs before any module reads process.env (see main.ts import order).
import { stripPlaceholderSecrets } from './env.validation';
import { logEvent } from '../common/structured-logger';

const stripped = stripPlaceholderSecrets();
if (stripped.length) logEvent('warn', 'env_placeholders_treated_as_unset', { names: stripped }, 'config');
