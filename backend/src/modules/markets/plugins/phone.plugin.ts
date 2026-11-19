import { PhoneConfig } from '../market-config.types';
import { normalizeDigits } from './digits';

/** Per-market phone rules (blueprint section 4): one canonical E.164 form for every way a person types a number. */
export interface PhonePlugin {
  /** `05…`, `+9665…`, `009665…`, `9665…`, `5…` (and Arabic digits) -> `+9665…`. Anything not recognised is returned trimmed and unchanged. */
  canonicalise(raw: string): string;
}

/** Built from the market's `phone` config only; no market-specific code. For SA it reproduces the old `AuthService.normalizePhone` exactly. */
export function buildPhonePlugin(cfg: PhoneConfig): PhonePlugin {
  const dial = cfg.default_dial;
  const dialDigits = dial.slice(1);
  const n = cfg.national_length;
  const trunkForm = cfg.trunk_prefix ? new RegExp(`^${cfg.trunk_prefix}\\d{${n}}$`) : null;
  const dialForm = new RegExp(`^${dialDigits}\\d{${n}}$`);
  const national = new RegExp(cfg.national_number_pattern);
  return {
    canonicalise(raw: string): string {
      const digits = normalizeDigits(raw).replace(/[\s\-().]/g, '');
      if (/^\+\d{7,15}$/.test(digits)) return digits;
      const bare = digits.replace(/^\+/, '');
      if (/^00\d{7,14}$/.test(bare)) return `+${bare.slice(2)}`;
      if (trunkForm?.test(bare)) return `${dial}${bare.slice(cfg.trunk_prefix.length)}`;
      if (dialForm.test(bare)) return `+${bare}`;
      if (national.test(bare)) return `${dial}${bare}`;
      return raw.trim();
    },
  };
}
