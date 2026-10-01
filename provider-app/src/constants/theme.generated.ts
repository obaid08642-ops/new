/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Written by tools/design/sync-client-tokens.mjs from
 * packages/design-tokens/tokens.json. Run `npm run sync-client-tokens` in
 * packages/design-tokens after a token change; `--check` in CI fails if this
 * file drifts.
 *
 * Client: provider-app
 */

export const light = {
  bg: "var(--nabd-bg.canvas-light)",
  surface: "var(--nabd-bg.surface-light)",
  surface2: "var(--nabd-bg.sunken-light)",
  surface3: "var(--nabd-bg.surface-light)",
  card: "var(--nabd-bg.surface-light)",
  inputBg: "var(--nabd-bg.sunken-light)",
  border: "var(--nabd-border.subtle-light)",
  borderFocus: "var(--nabd-action.primary.bg-light)",
  borderErr: "var(--nabd-status.danger.fg-light)",
  text: "var(--nabd-bg.canvas-dark)",
  textSub: "var(--nabd-text.secondary-light)",
  textHint: "var(--nabd-text.tertiary-light)",
  textInv: "var(--nabd-bg.canvas-light)",
  textOff: "var(--nabd-text.tertiary-light)",
  primary: "var(--nabd-action.primary.bg-light)",
  primaryDark: "var(--nabd-brand.coral-light)",
  primaryLight: "var(--nabd-status.danger.bg-light)",
  secondary: "var(--nabd-status.info.fg-light)",
  secondaryDark: "var(--nabd-status.info.fg-light)",
  secondaryLight: "var(--nabd-status.info.bg-light)",
  success: "var(--nabd-status.success.fg-light)",
  successBg: "var(--nabd-status.success.bg-light)",
  warn: "var(--nabd-status.warning.fg-light)",
  warnBg: "var(--nabd-status.warning.bg-light)",
  danger: "var(--nabd-status.danger.fg-light)",
  dangerBg: "var(--nabd-status.danger.bg-light)",
  info: "var(--nabd-status.info.fg-light)",
  infoBg: "var(--nabd-status.info.bg-light)",
  navBg: "var(--nabd-bg.surface-light)",
  navActive: "var(--nabd-action.primary.bg-light)",
  navOff: "var(--nabd-text.secondary-light)",
  overlay: "rgba(11,27,43,0.06)",
  shadow: "0 6px 18px rgba(11,27,43,0.05)",
  shadowMd: "0 16px 40px rgba(11,27,43,0.08)",
  statusBar: "var(--nabd-bg.surface-light)",
} as const;

export const dark = {
  bg: "var(--nabd-bg.canvas-dark)",
  surface: "var(--nabd-bg.surface-dark)",
  surface2: "var(--nabd-bg.sunken-dark)",
  surface3: "var(--nabd-bg.elevated-dark)",
  card: "var(--nabd-bg.surface-dark)",
  inputBg: "var(--nabd-bg.sunken-dark)",
  border: "rgba(255,255,255,0.10)",
  borderFocus: "var(--nabd-brand.coral-dark)",
  borderErr: "var(--nabd-status.danger.fg-dark)",
  text: "var(--nabd-bg.canvas-light)",
  textSub: "var(--nabd-text.secondary-dark)",
  textHint: "var(--nabd-text.tertiary-dark)",
  textInv: "var(--nabd-bg.canvas-light)",
  textOff: "var(--nabd-text.tertiary-dark)",
  primary: "var(--nabd-brand.coral-dark)",
  primaryDark: "var(--nabd-brand.coral-dark)",
  primaryLight: "rgba(255,107,115,0.14)",
  secondary: "var(--nabd-status.info.fg-dark)",
  secondaryDark: "var(--nabd-status.info.fg-dark)",
  secondaryLight: "rgba(110,139,255,0.16)",
  success: "var(--nabd-status.success.fg-dark)",
  successBg: "rgba(111,224,184,0.14)",
  warn: "var(--nabd-status.warning.fg-dark)",
  warnBg: "rgba(255,209,102,0.14)",
  danger: "var(--nabd-status.danger.fg-dark)",
  dangerBg: "rgba(255,107,115,0.14)",
  info: "var(--nabd-status.info.fg-dark)",
  infoBg: "rgba(110,139,255,0.16)",
  navBg: "var(--nabd-bg.surface-dark)",
  navActive: "var(--nabd-brand.coral-dark)",
  navOff: "var(--nabd-text.secondary-dark)",
  overlay: "rgba(255,255,255,0.08)",
  shadow: "0 6px 18px rgba(0,0,0,0.20)",
  shadowMd: "0 16px 40px rgba(0,0,0,0.35)",
  statusBar: "var(--nabd-bg.surface-dark)",
} as const;

export type Palette = typeof light;
export type PaletteName = keyof Palette;
