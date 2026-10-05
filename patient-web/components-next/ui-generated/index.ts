/**
 * @nabd/ui — the web entry point (12.A7).
 *
 * A screen imports everything from here. The barrel is the API; the individual
 * files are implementation, and a screen that reaches past the barrel is a
 * screen that will break when a component's internals change.
 *
 * The one thing deliberately NOT exported is `primSvg` / the raw geometry. A
 * screen that draws its own SVG is a screen that has opted out of the palette
 * and out of both themes, and the palette guard cannot see it any more.
 */
// GENERATED FILE — DO NOT EDIT.
//
// Mirrored from packages/ui/src/index.ts by tools/design/sync-ui-components.mjs.
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

export { Icon, LINE_ICON_NAMES } from './src/Icon';
// The illustrated artwork is its own module (loaded on demand by <Icon>); importing it here registers it, so the
// barrel keeps illustrated icons synchronous for the gallery and the tests.
export { IllustratedIconView, Illustration, ILLUSTRATED_ICONS, ILLUSTRATION_NAMES, ILLUSTRATION_META, ILLUSTRATIONS, ICON_TINT } from './src/Illustrated';
export { Button, IconButton } from './components/Button';
export { Spinner } from './components/Spinner';
export { Segmented, Toggle, Radio, StatusChip } from './components/Controls';
export { DoctorCard, ProductCard, OfferCard, Timeline, ProgressRing } from './components/Cards';
export { Input, Select, Otp, Search, Stepper, SlotPicker } from './components/Inputs';
export {
  Avatar, Badge, BottomTabBar, Card, Chip, ListItem, MapPinCard, NavBar, PriceTag,
  Rating, SectionHeader, ServiceTile, Sidebar, Tabs,
} from './components/Surfaces';
export { FIcon } from './components/FIcon';
export { FILL_ICON_NAMES, FILL_ICON_PATHS, SERVICE_ICONS, SERVICE_TONES } from './icons/fill';
export type { FillIconName, ServiceName, ServiceTone } from './icons/fill';
export { ChartCard, DataTable, EmptyState, ErrorState, OfflineState, Modal, Skeleton, Toast } from './components/Feedback';

export type { IconName, LineIconName } from './icons/names';
export type { IllustratedIcon } from './icons/illustrated';
export type { IllustrationName } from './icons/illustrations';
export * from './components/contract';

// Screen shells (DEVICE_STANDARD §1). Web-only layout; import shells/shells.css once in the app.
export * from './shells';
