/**
 * @nabd/ui-native — the React Native entry point (12.A7).
 *
 * The same component roster as `@nabd/ui`, minus the two admin surfaces the spec
 * marks web-only, with the SAME prop names. `components/conformance.ts` is what
 * keeps that true, so this barrel is a list of what exists rather than a promise
 * about it.
 */

export { Icon, Illustration, Spinner, ILLUSTRATED_ICONS, ILLUSTRATION_NAMES, ILLUSTRATION_META, ILLUSTRATIONS, LINE_ICON_NAMES, ICON_TINT } from './Icon';
export { Button, IconButton } from './components/Button';
export { Input, Select, Otp, Search, Stepper, SlotPicker } from './components/Inputs';
export {
  Avatar, Badge, BottomTabBar, Card, Chip, ListItem, MapPinCard, NavBar, PriceTag,
  Rating, SectionHeader, ServiceTile, Sidebar, Tabs,
} from './components/Surfaces';
export { FIcon } from './components/FIcon';
export { FILL_ICON_NAMES, FILL_ICON_PATHS, SERVICE_ICONS, SERVICE_TONES } from '../../ui/icons/fill';
export type { FillIconName, ServiceName, ServiceTone } from '../../ui/icons/fill';
export { EmptyState, ErrorState, Modal, Skeleton, Toast } from './components/Feedback';

export type { IconName, LineIconName } from '../../ui/icons/names';
export type { IllustratedIcon } from '../../ui/icons/illustrated';
export type { IllustrationName } from '../../ui/icons/illustrations';
export * from '../../ui/components/contract';
