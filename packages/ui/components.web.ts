/**
 * The web renderer's prop surface — 12.A7.
 *
 * What `conformance.ts` checks against the contract. The map is written out
 * component by component on purpose: an inferred map would shrink silently when
 * a renderer stopped exporting something, and a check that covers less without
 * saying so is worse than no check.
 *
 * The entries are the CONTRACT props plus the web renderer's own extras
 * (`onClick`), never a hand-copied subset — that is what the "accepts" half of
 * the check verifies.
 */

import type { WebButtonProps, WebIconButtonProps } from './components/Button';
import type * as C from './components/contract';

export interface ComponentProps {
  Button: WebButtonProps;
  IconButton: WebIconButtonProps;

  Input: C.InputProps;
  Select: C.SelectProps;
  Otp: C.OtpProps;
  Search: C.SearchProps;
  Stepper: C.StepperProps;
  SlotPicker: C.SlotPickerProps;

  Chip: C.ChipProps;
  Badge: C.BadgeProps;
  Card: C.CardProps;
  ListItem: C.ListItemProps;
  ServiceTile: C.ServiceTileProps;
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

  DataTable: C.DataTableProps<Record<string, unknown>>;
  ChartCard: C.ChartCardProps;
}
