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
  navy: '#16213A',
  sky: '#4FA8E0',
  background: '#F2F4F7',
  surface: '#FFFFFF',
  text: '#141A2A',
  textSecondary: '#4C5566',
  textTertiary: '#8C93A3',
  border: '#E5E8EE',
  success: '#5BA84F',
  successSurface: '#EBF6E9',
  warning: '#F0A526',
  warningSurface: '#FEF4E0',
  error: '#F0695C',
  errorSurface: '#FEEFED',
  info: '#4889D4',
  infoSurface: '#E8F1FB',
  radius: { sm: 8, md: 14, lg: 22, xl: 28 },
} as const;
export type Tokens = typeof tokens;
