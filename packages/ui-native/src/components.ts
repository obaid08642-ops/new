/**
 * The React Native renderer's prop surface — 12.A7.
 *
 * The counterpart to `packages/ui/components.web.ts`; `conformance.ts` checks
 * both against the same contract, so a component that exists on only one of
 * them, or that accepts fewer props on one of them, fails `tsc`.
 *
 * `DataTable` and `ChartCard` are deliberately ABSENT. They are admin-only web
 * surfaces — a data table on a phone is a list and a chart on a phone is not a
 * chart — so the contract lists them and the conformance check is what will
 * report the gap rather than let it be forgotten.
 */

import type {
  NativeButtonProps,
  NativeIconButtonProps,
} from './components/Button';
import type {
  NativeInputProps,
  NativeSelectProps,
} from './components/Inputs';
import type { NativeRadioProps } from './components/Controls';
import type { NativeChipProps } from './components/Surfaces';
import type * as C from '../../ui/components/contract';

export interface ComponentProps {
  Button: NativeButtonProps;
  IconButton: NativeIconButtonProps;
  Segmented: C.SegmentedProps;
  Toggle: C.ToggleProps;
  Radio: NativeRadioProps;
  StatusChip: C.StatusChipProps;

  Input: NativeInputProps;
  Select: NativeSelectProps;
  Otp: C.OtpProps;
  Search: C.SearchProps;
  Stepper: C.StepperProps;
  SlotPicker: C.SlotPickerProps;

  Chip: NativeChipProps;
  Badge: C.BadgeProps;
  Card: C.CardProps;
  ListItem: C.ListItemProps;
  ServiceTile: C.ServiceTileProps;
  FIcon: C.FIconProps;
  SectionHeader: C.SectionHeaderProps;
  Avatar: C.AvatarProps;
  PriceTag: C.PriceTagProps;
  Rating: C.RatingProps;
  Tabs: C.TabsProps;
  NavBar: C.NavBarProps;
  BottomTabBar: C.BottomTabBarProps;
  Sidebar: C.SidebarProps;
  MapPinCard: C.MapPinCardProps;

  EmptyState: C.EmptyStateProps;
  ErrorState: C.ErrorStateProps;
  Toast: C.ToastProps;
  Modal: C.ModalProps;
  Skeleton: C.SkeletonProps;
}
