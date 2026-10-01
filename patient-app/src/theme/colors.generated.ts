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
  brandPrimary: "#D42A38",
  brandPrimaryDeep: "#FF4B55",
  brandBg: "#F5F5F7",
  bg: "#E8E8ED",
  s: "#FFFFFF",
  n: "#0B1B2B",
  n2: "#FFFFFF",
  t: "#0B1B2B",
  t2: "#6E6E73",
  t3: "#5B6470",
  bd: "#E5E5EA",
  p: "#D42A38",
  pd: "#FF4B55",
  ps: "#FFE3E5",
  pt: "#B81E2B",
  c1: "#3A56D4",
  c2: "#3A56D4",
  tl: "#1F7A5C",
  ts: "#DDF4EC",
  pr: "#C3A8FF",
  prs: "#E3E9FF",
  am: "#8A5A00",
  as: "#FFF4D6",
  cr: "#B81E2B",
  cs: "#FFE3E5",
  bl: "#3A56D4",
  bs: "#E3E9FF",
  pk: "#F4B8E4",
  pks: "#FFE3E5",
  gr: "#1F7A5C",
  grs: "#DDF4EC",
  or: "#FFD166",
  ors: "#FFF4D6",
} as const;

export const dark = {
  brandPrimary: "#FF6B73",
  brandPrimaryDeep: "#FF6B73",
  brandBg: "#0B1B2B",
  bg: "#0E1F31",
  s: "#12263A",
  n: "#0B1B2B",
  n2: "#1A3148",
  t: "#F5F5F7",
  t2: "#9AA4B2",
  t3: "#8B99A8",
  bd: "rgba(255,255,255,0.10)",
  p: "#FF6B73",
  pd: "#FF6B73",
  ps: "rgba(255,107,115,0.14)",
  pt: "#FF8A91",
  c1: "#9DB0FF",
  c2: "#9DB0FF",
  tl: "#6FE0B8",
  ts: "rgba(111,224,184,0.14)",
  pr: "#C3A8FF",
  prs: "rgba(110,139,255,0.16)",
  am: "#FFD166",
  as: "rgba(255,209,102,0.14)",
  cr: "#FF8A91",
  cs: "rgba(255,107,115,0.14)",
  bl: "#9DB0FF",
  bs: "rgba(110,139,255,0.16)",
  pk: "#F4B8E4",
  pks: "rgba(255,107,115,0.14)",
  gr: "#6FE0B8",
  grs: "rgba(111,224,184,0.14)",
  or: "#FFD166",
  ors: "rgba(255,209,102,0.14)",
} as const;

export type Palette = typeof light;
export type PaletteName = keyof Palette;
