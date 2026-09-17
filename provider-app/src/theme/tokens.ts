/**
 * Provider App canonical theme — MIRROR of packages/design-tokens/tokens.json v1.0.0.
 * Replaces ad-hoc Material hex (#2196F3/#FF9800/#F44336/...) with Nabd brand tokens.
 * Wave 1 (this file): single import point. Wave 2: migrate screens to import from here.
 */
export const tokens = {
  primary: '#B8E030',
  primarySoft: '#D9F26B',
  primaryDeep: '#7CB518',
  mint: '#5FD9B3',
  yellow: '#FFC93C',
  coral: '#FF4D5A',
  navy: '#1E332E',
  sky: '#4FA8E0',
  background: '#FDFDFC',
  surface: '#FFFFFF',
  text: '#1E332E',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E8EDEE',
  success: '#5BA84F',
  successSurface: '#EBF6E9',
  warning: '#F0A526',
  warningSurface: '#FEF4E0',
  error: '#F0695C',
  errorSurface: '#FEEFED',
  info: '#4889D4',
  infoSurface: '#E8F1FB',
  purple: '#7A6BEA',
  purpleSurface: '#EDEBFD',
  pink: '#E8568E',
  pinkSurface: '#FCE8F1',
  mintDeep: '#00876F',
  radius: { sm: 10, md: 16, lg: 20, xl: 28 },
} as const;
export type Tokens = typeof tokens;
