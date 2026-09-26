// Side-effect import: runs before any module reads process.env (see main.ts import order).
import { stripPlaceholderSecrets } from './env.validation';

const stripped = stripPlaceholderSecrets();
if (stripped.length) console.warn(`[env] placeholder values treated as unset: ${stripped.join(', ')}`);
