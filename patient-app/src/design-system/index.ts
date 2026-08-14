/**
 * Design System — Public API
 *
 * Import everything from here:
 *   import { DSButton, DSText, DSCard, ... } from '@/design-system';
 *
 * Never import directly from individual files in /components —
 * always use this barrel export to maintain API stability.
 */

// ── Tokens ───────────────────────────────────────────────────────────────────
export {
  Colors, Typography, Spacing, BorderRadius, Shadows,
  Animation, ZIndex, Gradients, BrandColors,
  SemanticColors, ComponentTokens,
  applyThemeOverrides, resetThemeOverrides, getOverrides,
  isRTLLanguage, getTextAlign, getFlexDirection,
} from './tokens';

// ── Icon ─────────────────────────────────────────────────────────────────────
export { Icon, type IconName } from './Icon';

// ── Text ─────────────────────────────────────────────────────────────────────
export {
  DSText, DSTitle, DSCaption, DSLabel,
  type DSTextProps, type TextVariant,
} from './components/Text';

// ── Button ───────────────────────────────────────────────────────────────────
export {
  DSButton,
  type DSButtonProps, type ButtonVariant, type ButtonSize,
} from './components/Button';

// ── Input ────────────────────────────────────────────────────────────────────
export {
  DSInput,
  type DSInputProps, type InputVariant, type InputState,
} from './components/Input';

// ── Card ─────────────────────────────────────────────────────────────────────
export {
  DSCard,
  type DSCardProps, type CardVariant, type CardSize,
} from './components/Card';

// ── Badge / Chip / Tag ───────────────────────────────────────────────────────
export {
  DSBadge, DSChip, DSTag,
  type DSBadgeProps, type DSChipProps, type DSTagProps,
  type TagVariant,
} from './components/Badge';

// ── Avatar ───────────────────────────────────────────────────────────────────
export {
  DSAvatar, DSAvatarGroup,
  type DSAvatarProps, type DSAvatarGroupProps, type AvatarSize,
} from './components/Avatar';

// ── Loading / Skeleton ────────────────────────────────────────────────────────
export {
  DSSpinner, DSLoadingOverlay, DSSkeleton,
  DSSkeletonCard, DSSkeletonListItem,
  type DSSpinnerProps, type DSLoadingOverlayProps, type DSSkeletonProps,
} from './components/Loading';

// ── States ───────────────────────────────────────────────────────────────────
export {
  DSEmptyState, DSErrorState,
  type DSEmptyStateProps, type DSErrorStateProps, type ErrorStateType,
} from './components/States';

// ── Bottom Sheet ─────────────────────────────────────────────────────────────
export {
  DSBottomSheet,
  type DSBottomSheetProps,
} from './components/BottomSheet';

// ── Toast ────────────────────────────────────────────────────────────────────
export {
  ToastProvider, useToast,
  type ToastConfig, type ToastType, type ToastPosition,
} from './components/Toast';

// ── OTP Input ────────────────────────────────────────────────────────────────
export {
  DSOTPInput,
  type DSOTPInputProps,
} from './components/OTPInput';

// ── Search Bar ───────────────────────────────────────────────────────────────
export {
  DSSearchBar,
  type DSSearchBarProps,
} from './components/SearchBar';

// ── Progress / Divider ───────────────────────────────────────────────────────
export {
  DSProgressBar, DSStepIndicator, DSDivider,
  type DSProgressBarProps, type DSStepIndicatorProps, type DSDividerProps,
} from './components/Progress';
