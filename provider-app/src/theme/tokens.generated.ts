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
  primary: "#D42A38",
  primaryFg: "#FFFFFF",
  primaryDeep: "#FF4B55",
  coral: "#FF4B55",
  navy: "#0B1B2B",
  mint: "#3FBF9A",
  mintDeep: "#3FBF9A",
  sky: "#2D4FD6",
  lime: "#D7FF00",
  yellow: "#D7FF00",
  purple: "#C3A8FF",
  purpleSurface: "#E7ECFF",
  pink: "#F4B8E4",
  pinkSurface: "#FFE3E5",
  background: "#F5F5F7",
  surface: "#FFFFFF",
  surfaceSunken: "#E8E8ED",
  text: "#0B1B2B",
  textSecondary: "#6E6E73",
  textTertiary: "#5B6470",
  border: "#E5E5EA",
  success: "#1F7A5C",
  successSurface: "#DDF4EC",
  error: "#B81E2B",
  errorSurface: "#FFE3E5",
  info: "#3A56D4",
  infoSurface: "#E3E9FF",
  warning: "#8A5A00",
  warningSurface: "#FFF4D6",
} as const;

export const dark = {
  primary: "#FF6B73",
  primaryFg: "#0B1B2B",
  primaryDeep: "#FF6B73",
  coral: "#FF6B73",
  navy: "#0B1B2B",
  mint: "#3FBF9A",
  mintDeep: "#3FBF9A",
  sky: "#9DB0FF",
  lime: "#D7FF00",
  yellow: "#D7FF00",
  purple: "#C3A8FF",
  purpleSurface: "rgba(110,139,255,0.16)",
  pink: "#F4B8E4",
  pinkSurface: "rgba(255,107,115,0.14)",
  background: "#0B1B2B",
  surface: "#12263A",
  surfaceSunken: "#0E1F31",
  text: "#F5F5F7",
  textSecondary: "#9AA4B2",
  textTertiary: "#8B99A8",
  border: "rgba(255,255,255,0.10)",
  success: "#6FE0B8",
  successSurface: "rgba(111,224,184,0.14)",
  error: "#FF8A91",
  errorSurface: "rgba(255,107,115,0.14)",
  info: "#9DB0FF",
  infoSurface: "rgba(110,139,255,0.16)",
  warning: "#FFD166",
  warningSurface: "rgba(255,209,102,0.14)",
} as const;

export type Palette = typeof light;
export type PaletteName = keyof Palette;
