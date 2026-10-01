#!/usr/bin/env node
/**
 * 12.A11 / 12.C2 — migrate screens from `lucide-react` to the curated icon set.
 *
 * 160 patient-web screens import `lucide-react` directly, which C2 forbids in a
 * screen. 68 of them are fully migratable with the curated set as it now stands —
 * a constraint that was 10 screens wide until the set was widened in 1f81827.
 *
 * The migration is mechanical, which is exactly why it is a script and not 68
 * edits: 68 hand edits is 68 chances to silently drop an attribute, and a dropped
 * `size` or a dropped `className` is invisible in review and visible only to a
 * user.
 *
 * So the attribute set is a WHITELIST. A tag carrying anything this script does
 * not understand is skipped and reported, never guessed at. A migration tool that
 * rewrites what it has not read is the same class of bug as a gate that reports
 * success while measuring less.
 *
 *   node tools/design/migrate-icons.mjs           # migrate
 *   node tools/design/migrate-icons.mjs --dry     # list what it would do
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DRY = process.argv.includes('--dry');

/** lucide component name -> curated name. Keys are the 68 fully-migratable screens. */
const EQ = {
  Search: 'search', Calendar: 'calendar', CalendarDays: 'calendar-days', User: 'user',
  Users: 'users', Home: 'home', Heart: 'heart', Clock: 'clock', Clock3: 'clock',
  MapPin: 'pin', Phone: 'phone', CreditCard: 'card', Star: 'star', Check: 'check',
  X: 'close', Plus: 'plus', Minus: 'minus', Filter: 'filter', Settings: 'settings',
  List: 'list', Download: 'download', Trash2: 'trash', AlertTriangle: 'warning',
  LogOut: 'signout', ChevronDown: 'caret-down', ChevronUp: 'caret-up',
  ChevronLeft: 'caret-left', ChevronRight: 'caret-right', Bell: 'bell',
  ShoppingCart: 'cart', ShieldCheck: 'shield-check', Pill: 'pill', Activity: 'pulse',
  FileText: 'file-text', Sparkles: 'sparkle', MessageCircle: 'message-circle',
  ArrowRight: 'arrow-right', ArrowLeft: 'arrow-left',
  Stethoscope: 'stethoscope',
  Building2: 'building2',
  HeartPulse: 'heart-pulse',
  FlaskConical: 'flask-conical',
  UsersRound: 'users-round',
  LockKeyhole: 'lock-keyhole',
  CheckCircle2: 'check-circle2',
  Gift: 'gift',
  Truck: 'truck',
  Siren: 'siren',
  RefreshCw: 'refresh-cw',
  Moon: 'moon',
  BookOpen: 'book-open',
  ClipboardList: 'clipboard-list',
  ScanLine: 'scan-line',
  AlertCircle: 'alert-circle',
  CircleAlert: 'circle-alert',
  ShoppingBag: 'shopping-bag',
  Brain: 'brain',
  Flame: 'flame',
  Target: 'target',
  Utensils: 'utensils',
  Baby: 'baby',
  Tag: 'tag',
  Lock: 'lock',
  Fingerprint: 'fingerprint',
  HardDrive: 'hard-drive',
  Camera: 'camera',
  Bookmark: 'bookmark',
  QrCode: 'qr-code',
  Coins: 'coins',
  History: 'history',
  Send: 'send',
  Headphones: 'headphones',
  Mic: 'mic',
  Share2: 'share2',
  Factory: 'factory',
  Package: 'package',
  Info: 'info',
  ArrowUpRight: 'arrow-up-right',
  ArrowUpLeft: 'arrow-up-left',
  MapPinned: 'map-pinned',
  RotateCcw: 'rotate-ccw',
  Volume2: 'volume2',
  Vibrate: 'vibrate',
  BellRing: 'bell-ring',
  TestTube2: 'test-tube2',
  Database: 'database',
  HousePlus: 'house-plus',
  LoaderCircle: 'loader-circle',
  Loader2: 'loader2',
  UserRound: 'user-round',
  UserRoundPlus: 'user-round-plus',
  GitCompareArrows: 'git-compare-arrows',
  SlidersHorizontal: 'sliders-horizontal',
  XCircle: 'x-circle',
  TrendingUp: 'trending-up',
  TrendingDown: 'trending-down',
  PackageSearch: 'package-search',
  PackageCheck: 'package-check',
  Hash: 'hash',
  Bot: 'bot',
  MessageSquareQuote: 'message-square-quote',
};

/**
 * A literal colour becomes a token NAME, never a value. `Icon` takes `tone`; a
 * hex there would put a raw colour back into a screen, which is the A11 defect
 * this migration exists to reduce. Anything not in this table is a skip, because
 * guessing a token name is how a wrong colour ships.
 */
const TONE = {
  '#1E332E': 'primary', '#0B1B2B': 'primary', '#FF4B55': 'onBrand',
  '#B8E030': 'onBrand', '#FFFFFF': 'onBrand', '#fff': 'onBrand',
};

/** Attributes this script understands. Anything else on the tag: skip the file. */
const ALLOWED = new Set(['size', 'className', 'aria-hidden', 'color', 'style']);

const files = execSync(
  "grep -rl 'lucide-react' patient-web/app --include='*.tsx' || true",
)
  .toString()
  .trim()
  .split('\n')
  .filter(Boolean);

const migrated = [];
const skipped = [];

for (const rel of files) {
  const file = resolve(REPO, rel);
  let src = readFileSync(file, 'utf8');

  const importMatch = src.match(/import\s*\{([^}]+)\}\s*from\s*["']lucide-react["'];?/);
  if (!importMatch) continue;

  const names = importMatch[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Every imported icon must be in the curated set, or the screen stays put.
  const unmapped = names.filter((n) => !EQ[n]);
  if (unmapped.length) {
    skipped.push({ rel, why: `not in the curated set: ${unmapped.join(', ')}` });
    continue;
  }

  let changed = 0;
  let unsafe = null;

  for (const n of names) {
    // Both shapes. `<Name />` and `<Name></Name>` are both legal JSX, and the
    // first version matched only the first, so 20 screens were blocked by a regex
    // rather than by anything about them.
    const tag = new RegExp(`<${n}\\b([^>]*?)(?:\\/>|>([\\s\\S]*?)<\\/${n}>)`, 'g');
    src = src.replace(tag, (whole, attrs, children) => {
      const pairs = [...attrs.matchAll(/([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|\{([^}]*)\})/g)];
      for (const [, key] of pairs) {
        if (!ALLOWED.has(key)) {
          unsafe = `${n}: attribute ${key}`;
          return whole;
        }
      }
      const out = [`name="${EQ[n]}"`];
      for (const [, key, str, expr] of pairs) {
        if (key === 'aria-hidden') continue; // Icon is decorative by default.
        if (key === 'color') {
          const tone = TONE[str];
          if (!tone) {
            unsafe = `${n}: unmapped colour ${str}`;
            return whole;
          }
          out.push(`tone="${tone}"`);
          continue;
        }
        out.push(`${key}=${str !== undefined ? `"${str}"` : `{${expr}}`}`);
      }
      changed++;
      // The paired form is an accessible icon: `<Name title=" prescriptions" />`.
      // The name moves onto the glyph and the children are preserved, so the
      // accessible name survives the migration instead of being dropped.
      const body = children === undefined ? '' : children.trim();
      if (body) out.push(`title={${body}}`);
      return `<Icon ${out.join(' ')} />`;
    });
  }

  if (unsafe) {
    skipped.push({ rel, why: unsafe });
    continue;
  }
  if (changed === 0) {
    skipped.push({ rel, why: 'the import exists but no self-closing tag matched' });
    continue;
  }

  src = src.replace(importMatch[0], 'import { Icon } from "@/components-next/ui-generated/src/Icon";');
  // Both directions have to be checked, and the first version checked only one.
  // It verified that `Icon` was now used, then replaced the import regardless —
  // so `<ArrowRight></ArrowRight>` and `<ArrowRight size={20}>x</ArrowRight>`, which
  // the self-closing pattern does not match, were left behind as references to a
  // binding that no longer existed. Eight tests failed with `ArrowRight is not
  // defined` on a migration the script had reported as done.
  //
  // Valid output is not consumed input. The screen is only migrated if nothing
  // refers to the lucide names any more.
  // The reason has to name the real cause, because this list is the worklist.
  // The first version said "non-self-closing usages left" for 20 screens, and the
  // actual cause on the first of them was `const Arrow = rtl ? ArrowLeft :
  // ArrowRight` — an aliased reference in a plain expression, aliased before it
  // is ever used as `<Arrow />`. No regex over JSX will find it, and no JSX regex
  // should: the correct migration is to alias the *token* name, and that is a
  // per-screen judgement, not a rewrite.
  const body = src.replace(importMatch[0], '');
  const remaining = names.filter((n) => new RegExp(`\\b${n}\\b`).test(body));
  if (remaining.length) {
    const aliased = remaining.filter((n) => new RegExp(`=\\s*[^;\\n]*\\b${n}\\b|\\?\\s*${n}\\s*:`).test(body));
    const inJsx = remaining.filter((n) => !aliased.includes(n));
    const why = aliased.length
      ? `aliased in an expression (needs a per-screen decision): ${aliased.join(', ')}`
      : `non-self-closing usages left: ${inJsx.join(', ')}`;
    skipped.push({ rel, why });
    continue;
  }
  if (!/\bIcon\b/.test(src.replace(importMatch[0], ''))) {
    skipped.push({ rel, why: 'migrated but Icon would be unused' });
    continue;
  }

  migrated.push({ rel, icons: names.length, tags: changed });
  if (!DRY) writeFileSync(file, src, 'utf8');
}

console.log(
  `${DRY ? '[dry] would migrate' : 'migrated'}: ${migrated.length} screen(s), ` +
    `${migrated.reduce((a, b) => a + b.tags, 0)} tag(s).`,
);
if (skipped.length) {
  console.log(`skipped ${skipped.length}, each for a stated reason:`);
  for (const s of skipped) console.log(`  ${s.rel} — ${s.why}`);
}
