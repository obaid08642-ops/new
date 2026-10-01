/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Written by tools/design/sync-client-tokens.mjs from
 * packages/design-tokens/tokens.json. Run `npm run sync-client-tokens` in
 * packages/design-tokens after a token change; `--check` in CI fails if this
 * file drifts.
 *
 * Client: patient-app
 */

export const light = {
  brandPrimary: "var(--nabd-action.primary.bg-light)",
  brandPrimaryDeep: "var(--nabd-brand.coral-light)",
  brandBg: "var(--nabd-bg.canvas-light)",
  bg: "var(--nabd-bg.sunken-light)",
  s: "var(--nabd-bg.surface-light)",
  n: "var(--nabd-bg.canvas-dark)",
  n2: "var(--nabd-bg.surface-light)",
  t: "var(--nabd-bg.canvas-dark)",
  t2: "var(--nabd-text.secondary-light)",
  t3: "var(--nabd-text.tertiary-light)",
  bd: "var(--nabd-border.subtle-light)",
  p: "var(--nabd-action.primary.bg-light)",
  pd: "var(--nabd-brand.coral-light)",
  ps: "var(--nabd-status.danger.bg-light)",
  pt: "var(--nabd-status.danger.fg-light)",
  c1: "var(--nabd-status.info.fg-light)",
  c2: "var(--nabd-status.info.fg-light)",
  tl: "var(--nabd-status.success.fg-light)",
  ts: "var(--nabd-status.success.bg-light)",
  pr: "var(--nabd-service.radiology.glyph-dark)",
  prs: "var(--nabd-status.info.bg-light)",
  am: "var(--nabd-status.warning.fg-light)",
  as: "var(--nabd-status.warning.bg-light)",
  cr: "var(--nabd-status.danger.fg-light)",
  cs: "var(--nabd-status.danger.bg-light)",
  bl: "var(--nabd-status.info.fg-light)",
  bs: "var(--nabd-status.info.bg-light)",
  pk: "var(--nabd-service.mind.glyph-dark)",
  pks: "var(--nabd-status.danger.bg-light)",
  gr: "var(--nabd-status.success.fg-light)",
  grs: "var(--nabd-status.success.bg-light)",
  or: "var(--nabd-status.warning.fg-dark)",
  ors: "var(--nabd-status.warning.bg-light)",
} as const;

export const dark = {
  brandPrimary: "var(--nabd-brand.coral-dark)",
  brandPrimaryDeep: "var(--nabd-brand.coral-dark)",
  brandBg: "var(--nabd-bg.canvas-dark)",
  bg: "var(--nabd-bg.sunken-dark)",
  s: "var(--nabd-bg.surface-dark)",
  n: "var(--nabd-bg.canvas-dark)",
  n2: "var(--nabd-bg.elevated-dark)",
  t: "var(--nabd-bg.canvas-light)",
  t2: "var(--nabd-text.secondary-dark)",
  t3: "var(--nabd-text.tertiary-dark)",
  bd: "rgba(255,255,255,0.10)",
  p: "var(--nabd-brand.coral-dark)",
  pd: "var(--nabd-brand.coral-dark)",
  ps: "rgba(255,107,115,0.14)",
  pt: "var(--nabd-status.danger.fg-dark)",
  c1: "var(--nabd-status.info.fg-dark)",
  c2: "var(--nabd-status.info.fg-dark)",
  tl: "var(--nabd-status.success.fg-dark)",
  ts: "rgba(111,224,184,0.14)",
  pr: "var(--nabd-service.radiology.glyph-dark)",
  prs: "rgba(110,139,255,0.16)",
  am: "var(--nabd-status.warning.fg-dark)",
  as: "rgba(255,209,102,0.14)",
  cr: "var(--nabd-status.danger.fg-dark)",
  cs: "rgba(255,107,115,0.14)",
  bl: "var(--nabd-status.info.fg-dark)",
  bs: "rgba(110,139,255,0.16)",
  pk: "var(--nabd-service.mind.glyph-dark)",
  pks: "rgba(255,107,115,0.14)",
  gr: "var(--nabd-status.success.fg-dark)",
  grs: "rgba(111,224,184,0.14)",
  or: "var(--nabd-status.warning.fg-dark)",
  ors: "rgba(255,209,102,0.14)",
} as const;

export type Palette = typeof light;
export type PaletteName = keyof Palette;
