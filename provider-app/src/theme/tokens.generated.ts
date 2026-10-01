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
  primary: "var(--nabd-action.primary.bg-light)",
  primaryFg: "var(--nabd-bg.surface-light)",
  primaryDeep: "var(--nabd-brand.coral-light)",
  coral: "var(--nabd-brand.coral-light)",
  navy: "var(--nabd-bg.canvas-dark)",
  mint: "var(--nabd-status.success.fill-light)",
  mintDeep: "var(--nabd-status.success.fill-light)",
  sky: "var(--nabd-status.info.fg-light)",
  lime: "var(--nabd-text.link-dark)",
  yellow: "var(--nabd-text.link-dark)",
  purple: "var(--nabd-service.radiology.glyph-dark)",
  purpleSurface: "var(--nabd-status.info.bg-light)",
  pink: "var(--nabd-service.mind.glyph-dark)",
  pinkSurface: "var(--nabd-status.danger.bg-light)",
  background: "var(--nabd-bg.canvas-light)",
  surface: "var(--nabd-bg.surface-light)",
  surfaceSunken: "var(--nabd-bg.sunken-light)",
  text: "var(--nabd-bg.canvas-dark)",
  textSecondary: "var(--nabd-text.secondary-light)",
  textTertiary: "var(--nabd-text.tertiary-light)",
  border: "var(--nabd-border.subtle-light)",
  success: "var(--nabd-status.success.fg-light)",
  successSurface: "var(--nabd-status.success.bg-light)",
  error: "var(--nabd-status.danger.fg-light)",
  errorSurface: "var(--nabd-status.danger.bg-light)",
  info: "var(--nabd-status.info.fg-light)",
  infoSurface: "var(--nabd-status.info.bg-light)",
  warning: "var(--nabd-status.warning.fg-light)",
  warningSurface: "var(--nabd-status.warning.bg-light)",
} as const;

export const dark = {
  primary: "var(--nabd-brand.coral-dark)",
  primaryFg: "var(--nabd-bg.canvas-dark)",
  primaryDeep: "var(--nabd-brand.coral-dark)",
  coral: "var(--nabd-brand.coral-dark)",
  navy: "var(--nabd-bg.canvas-dark)",
  mint: "var(--nabd-status.success.fill-light)",
  mintDeep: "var(--nabd-status.success.fill-light)",
  sky: "var(--nabd-status.info.fg-dark)",
  lime: "var(--nabd-text.link-dark)",
  yellow: "var(--nabd-text.link-dark)",
  purple: "var(--nabd-service.radiology.glyph-dark)",
  purpleSurface: "rgba(110,139,255,0.16)",
  pink: "var(--nabd-service.mind.glyph-dark)",
  pinkSurface: "rgba(255,107,115,0.14)",
  background: "var(--nabd-bg.canvas-dark)",
  surface: "var(--nabd-bg.surface-dark)",
  surfaceSunken: "var(--nabd-bg.sunken-dark)",
  text: "var(--nabd-bg.canvas-light)",
  textSecondary: "var(--nabd-text.secondary-dark)",
  textTertiary: "var(--nabd-text.tertiary-dark)",
  border: "rgba(255,255,255,0.10)",
  success: "var(--nabd-status.success.fg-dark)",
  successSurface: "rgba(111,224,184,0.14)",
  error: "var(--nabd-status.danger.fg-dark)",
  errorSurface: "rgba(255,107,115,0.14)",
  info: "var(--nabd-status.info.fg-dark)",
  infoSurface: "rgba(110,139,255,0.16)",
  warning: "var(--nabd-status.warning.fg-dark)",
  warningSurface: "rgba(255,209,102,0.14)",
} as const;

export type Palette = typeof light;
export type PaletteName = keyof Palette;
