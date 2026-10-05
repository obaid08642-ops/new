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
  bg: "#F5F5F7",
  surface: "#FFFFFF",
  surface2: "#E8E8ED",
  surface3: "#FFFFFF",
  card: "#FFFFFF",
  inputBg: "#E8E8ED",
  border: "#E5E5EA",
  borderFocus: "#D42A38",
  borderErr: "#B81E2B",
  text: "#0B1B2B",
  textSub: "#6E6E73",
  textHint: "#5B6470",
  textInv: "#F5F5F7",
  textOff: "#5B6470",
  primary: "#D42A38",
  primaryDark: "#FF4B55",
  primaryLight: "#FFE3E5",
  secondary: "#2D4FD6",
  secondaryDark: "#2D4FD6",
  secondaryLight: "#E7ECFF",
  success: "#1F7A5C",
  successBg: "#DDF4EC",
  warn: "#8A5A00",
  warnBg: "#FFF4D6",
  danger: "#B81E2B",
  dangerBg: "#FFE3E5",
  info: "#3A56D4",
  infoBg: "#E3E9FF",
  navBg: "#FFFFFF",
  navActive: "#D42A38",
  navOff: "#6E6E73",
  overlay: "rgba(11,27,43,0.06)",
  shadow: "0 6px 18px rgba(11,27,43,0.05)",
  shadowMd: "0 16px 40px rgba(11,27,43,0.08)",
  statusBar: "#FFFFFF",
} as const;

export const dark = {
  bg: "#0B1B2B",
  surface: "#12263A",
  surface2: "#0E1F31",
  surface3: "#1A3148",
  card: "#12263A",
  inputBg: "#0E1F31",
  border: "rgba(255,255,255,0.10)",
  borderFocus: "#FF6B73",
  borderErr: "#FF8A91",
  text: "#F5F5F7",
  textSub: "#9AA4B2",
  textHint: "#8B99A8",
  textInv: "#F5F5F7",
  textOff: "#8B99A8",
  primary: "#FF6B73",
  primaryDark: "#FF6B73",
  primaryLight: "rgba(255,107,115,0.14)",
  secondary: "#9DB0FF",
  secondaryDark: "#9DB0FF",
  secondaryLight: "rgba(110,139,255,0.16)",
  success: "#6FE0B8",
  successBg: "rgba(111,224,184,0.14)",
  warn: "#FFD166",
  warnBg: "rgba(255,209,102,0.14)",
  danger: "#FF8A91",
  dangerBg: "rgba(255,107,115,0.14)",
  info: "#9DB0FF",
  infoBg: "rgba(110,139,255,0.16)",
  navBg: "#12263A",
  navActive: "#FF6B73",
  navOff: "#9AA4B2",
  overlay: "rgba(255,255,255,0.08)",
  shadow: "0 6px 18px rgba(0,0,0,0.20)",
  shadowMd: "0 16px 40px rgba(0,0,0,0.35)",
  statusBar: "#12263A",
} as const;

export type Palette = typeof light;
export type PaletteName = keyof Palette;
