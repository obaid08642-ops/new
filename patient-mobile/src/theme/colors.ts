export const lightColors = {
  bg: '#F2F4F7',
  s: '#FFFFFF',
  n: '#141A2A',
  n2: '#222A3D',
  t: '#141A2A',
  t2: '#4C5566',
  t3: '#8C93A3',
  bd: '#E5E8EE',
  p: '#23B5CE',
  pd: '#1A9FB6',
  ps: '#DEF5F9',
  pt: '#0A6575',
  c1: '#8FD4E3',
  c2: '#62C5D7',
  tl: '#2BB89C',
  ts: '#E2F7F2',
  pr: '#7A6BEA',
  prs: '#EDEBFD',
  am: '#F0A526',
  as: '#FEF4E0',
  cr: '#F0695C',
  cs: '#FEEFED',
  bl: '#4889D4',
  bs: '#E8F1FB',
  pk: '#E8568E',
  pks: '#FCE8F1',
  gr: '#5BA84F',
  grs: '#EBF6E9',
  or: '#F58634',
  ors: '#FEF0E4',
};

export const darkColors = {
  bg: '#0E1422',
  s: '#1A2234',
  n: '#F2F4F7',
  n2: '#E5E8EE',
  t: '#F2F4F7',
  t2: '#B8BEC9',
  t3: '#7C8494',
  bd: '#2A3346',
  p: '#23B5CE',
  pd: '#1A9FB6',
  ps: '#1A2B31',
  pt: '#0A6575',
  c1: '#8FD4E3',
  c2: '#62C5D7',
  tl: '#2BB89C',
  ts: '#1A2F2C',
  pr: '#7A6BEA',
  prs: '#221F36',
  am: '#F0A526',
  as: '#30261A',
  cr: '#F0695C',
  cs: '#351F1E',
  bl: '#4889D4',
  bs: '#1E2835',
  pk: '#E8568E',
  pks: '#341E28',
  gr: '#5BA84F',
  grs: '#1F2E1E',
  or: '#F58634',
  ors: '#35251B',
};

/**
 * Resolves a CSS variable string like 'var(--p)' to an actual color hex value.
 * Also handles plain hex/named colors by returning them as-is.
 * @param {string} c - color string, e.g. 'var(--p)' or '#23B5CE'
 * @param {object} colors - the current theme's color object (lightColors or darkColors)
 * @returns {string} resolved hex color
 */
export function resolveColor(c: string | undefined | null, colors?: Record<string, string>) {
  if (!c) return '#000';
  if (typeof c !== 'string') return '#000';
  if (c.startsWith('var(')) {
    const v = c.replace('var(--', '').replace(')', '');
    if (colors && colors[v]) return colors[v];
    // fallback to light colors if no colors object provided
    return (lightColors as Record<string, string>)[v] || c;
  }
  // If it's a key name directly (like 'p', 'cr', etc.)
  if (colors && colors[c]) return colors[c];
  return c;
}
