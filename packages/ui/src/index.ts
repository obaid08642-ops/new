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

export { Icon, IllustratedIconView, Illustration, LINE_ICON_NAMES, ILLUSTRATED_ICONS, ILLUSTRATION_NAMES, ILLUSTRATION_META, ILLUSTRATIONS, ICON_TINT } from './Icon';
export { Button, IconButton } from '../components/Button';
export { Spinner } from '../components/Spinner';
export { Segmented, Toggle, Radio, StatusChip } from '../components/Controls';
export { DoctorCard, ProductCard, OfferCard, Timeline, ProgressRing } from '../components/Cards';
export { Input, Select, Otp, Search, Stepper, SlotPicker } from '../components/Inputs';
export {
  Avatar, Badge, BottomTabBar, Card, Chip, ListItem, MapPinCard, NavBar, PriceTag,
  Rating, SectionHeader, ServiceTile, Sidebar, Tabs,
} from '../components/Surfaces';
export { FIcon } from '../components/FIcon';
export { FILL_ICON_NAMES, FILL_ICON_PATHS, SERVICE_ICONS, SERVICE_TONES } from '../icons/fill';
export type { FillIconName, ServiceName, ServiceTone } from '../icons/fill';
export { ChartCard, DataTable, EmptyState, ErrorState, Modal, Skeleton, Toast } from '../components/Feedback';

export type { IconName, LineIconName } from '../icons/names';
export type { IllustratedIcon } from '../icons/illustrated';
export type { IllustrationName } from '../icons/illustrations';
export * from '../components/contract';
export * as fixtures from '../components/fixtures';
