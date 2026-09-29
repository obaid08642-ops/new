/* GENERATED from packages/design-tokens/tokens.json by packages/design-tokens/build.mjs. Do not edit. */
/**
 * Tailwind preset carrying the Nabd+ semantic tokens.
 *
 *   colors['bg-canvas']   colors['action-primary-bg']   colors['service-pharmacy-glyph']
 *   spacing.sm            borderRadius['2xl']           boxShadow.tile
 *
 * A screen never writes a hex value: it picks a token from here. The
 * `no-raw-color` lint of 12.C2 fails the build if it does.
 */
const colors = {
  "brand-coral": {
    "light": "#FF4B55",
    "dark": "#FF6B73",
    "DEFAULT": "#FF4B55"
  },
  "brand-ink": "#0B1B2B",
  "brand-canvas": "#F5F5F7",
  "bg-canvas": {
    "light": "#F5F5F7",
    "dark": "#0B1B2B",
    "DEFAULT": "#F5F5F7"
  },
  "bg-surface": {
    "light": "#FFFFFF",
    "dark": "#12263A",
    "DEFAULT": "#FFFFFF"
  },
  "bg-elevated": {
    "light": "#FFFFFF",
    "dark": "#1A3148",
    "DEFAULT": "#FFFFFF"
  },
  "bg-sunken": {
    "light": "#E8E8ED",
    "dark": "#0E1F31",
    "DEFAULT": "#E8E8ED"
  },
  "bg-inverse": {
    "light": "#0B1B2B",
    "dark": "#12263A",
    "DEFAULT": "#0B1B2B"
  },
  "border-subtle": {
    "light": "#E5E5EA",
    "dark": "rgba(255,255,255,0.10)",
    "DEFAULT": "#E5E5EA"
  },
  "border-strong": {
    "light": "#D8D8DE",
    "dark": "rgba(255,255,255,0.20)",
    "DEFAULT": "#D8D8DE"
  },
  "border-hairline": {
    "light": "rgba(11,27,43,0.04)",
    "dark": "rgba(255,255,255,0.08)",
    "DEFAULT": "rgba(11,27,43,0.04)"
  },
  "border-onGlass": {
    "light": "rgba(11,27,43,0.08)",
    "dark": "rgba(255,255,255,0.12)",
    "DEFAULT": "rgba(11,27,43,0.08)"
  },
  "text-primary": {
    "light": "#0B1B2B",
    "dark": "#F5F5F7",
    "DEFAULT": "#0B1B2B"
  },
  "text-secondary": {
    "light": "#6E6E73",
    "dark": "#9AA4B2",
    "DEFAULT": "#6E6E73"
  },
  "text-tertiary": {
    "light": "#5B6470",
    "dark": "#8B99A8",
    "DEFAULT": "#5B6470"
  },
  "text-onBrand": {
    "light": "#FFFFFF",
    "dark": "#0B1B2B",
    "DEFAULT": "#FFFFFF"
  },
  "text-onInverse": "#F5F5F7",
  "text-onInverseSecondary": "#9AA4B2",
  "text-link": {
    "light": "#C8202F",
    "dark": "#D7FF00",
    "DEFAULT": "#C8202F"
  },
  "text-onAccent": "#0B1B2B",
  "icon-primary": {
    "light": "#0B1B2B",
    "dark": "#F5F5F7",
    "DEFAULT": "#0B1B2B"
  },
  "icon-secondary": {
    "light": "#6E6E73",
    "dark": "#9AA4B2",
    "DEFAULT": "#6E6E73"
  },
  "icon-onBrand": {
    "light": "#FFFFFF",
    "dark": "#0B1B2B",
    "DEFAULT": "#FFFFFF"
  },
  "icon-favorite": "#D42A38",
  "action-primary-bg": {
    "light": "#D42A38",
    "dark": "#FF6B73",
    "DEFAULT": "#D42A38"
  },
  "action-primary-fg": {
    "light": "#FFFFFF",
    "dark": "#0B1B2B",
    "DEFAULT": "#FFFFFF"
  },
  "action-secondary-bg": {
    "light": "#FFFFFF",
    "dark": "#1A3148",
    "DEFAULT": "#FFFFFF"
  },
  "action-secondary-fg": {
    "light": "#0B1B2B",
    "dark": "#F5F5F7",
    "DEFAULT": "#0B1B2B"
  },
  "action-selected-bg": {
    "light": "#0B1B2B",
    "dark": "#F5F5F7",
    "DEFAULT": "#0B1B2B"
  },
  "action-selected-fg": {
    "light": "#F5F5F7",
    "dark": "#0B1B2B",
    "DEFAULT": "#F5F5F7"
  },
  "action-accent-bg": "#D7FF00",
  "action-accent-fg": "#0B1B2B",
  "action-danger-bg": {
    "light": "#D42A38",
    "dark": "#FF6B73",
    "DEFAULT": "#D42A38"
  },
  "action-danger-fg": {
    "light": "#FFFFFF",
    "dark": "#0B1B2B",
    "DEFAULT": "#FFFFFF"
  },
  "status-success-fg": {
    "light": "#1F7A5C",
    "dark": "#6FE0B8",
    "DEFAULT": "#1F7A5C"
  },
  "status-success-bg": {
    "light": "#DDF4EC",
    "dark": "rgba(111,224,184,0.14)",
    "DEFAULT": "#DDF4EC"
  },
  "status-success-fill": {
    "light": "#3FBF9A",
    "dark": "#6FE0B8",
    "DEFAULT": "#3FBF9A"
  },
  "status-warning-fg": {
    "light": "#8A5A00",
    "dark": "#FFD166",
    "DEFAULT": "#8A5A00"
  },
  "status-warning-bg": {
    "light": "#FFF4D6",
    "dark": "rgba(255,209,102,0.14)",
    "DEFAULT": "#FFF4D6"
  },
  "status-danger-fg": {
    "light": "#B81E2B",
    "dark": "#FF8A91",
    "DEFAULT": "#B81E2B"
  },
  "status-danger-bg": {
    "light": "#FFE3E5",
    "dark": "rgba(255,107,115,0.14)",
    "DEFAULT": "#FFE3E5"
  },
  "status-info-fg": {
    "light": "#3A56D4",
    "dark": "#9DB0FF",
    "DEFAULT": "#3A56D4"
  },
  "status-info-bg": {
    "light": "#E3E9FF",
    "dark": "rgba(110,139,255,0.16)",
    "DEFAULT": "#E3E9FF"
  },
  "status-info-fill": {
    "light": "#3A56D4",
    "dark": "#6E8BFF",
    "DEFAULT": "#3A56D4"
  },
  "status-neutral-fg": {
    "light": "#6E6E73",
    "dark": "#9AA4B2",
    "DEFAULT": "#6E6E73"
  },
  "status-neutral-bg": {
    "light": "#F5F5F7",
    "dark": "#12263A",
    "DEFAULT": "#F5F5F7"
  },
  "service-pharmacy-bg": {
    "light": "#FFE3E5",
    "dark": "rgba(255,107,115,0.14)",
    "DEFAULT": "#FFE3E5"
  },
  "service-pharmacy-glyph": {
    "light": "#B81E2B",
    "dark": "#FF8A91",
    "DEFAULT": "#B81E2B"
  },
  "service-consult-bg": {
    "light": "#E3E9FF",
    "dark": "rgba(110,139,255,0.16)",
    "DEFAULT": "#E3E9FF"
  },
  "service-consult-glyph": {
    "light": "#3A56D4",
    "dark": "#9DB0FF",
    "DEFAULT": "#3A56D4"
  },
  "service-lab-bg": {
    "light": "#DDF4EC",
    "dark": "rgba(111,224,184,0.14)",
    "DEFAULT": "#DDF4EC"
  },
  "service-lab-glyph": {
    "light": "#1F7A5C",
    "dark": "#6FE0B8",
    "DEFAULT": "#1F7A5C"
  },
  "service-radiology-bg": {
    "light": "#F0E8FF",
    "dark": "rgba(195,168,255,0.16)",
    "DEFAULT": "#F0E8FF"
  },
  "service-radiology-glyph": {
    "light": "#5A31A8",
    "dark": "#C3A8FF",
    "DEFAULT": "#5A31A8"
  },
  "service-nursing-bg": {
    "light": "#FFF1CC",
    "dark": "rgba(255,209,102,0.14)",
    "DEFAULT": "#FFF1CC"
  },
  "service-nursing-glyph": {
    "light": "#8A5A00",
    "dark": "#FFD166",
    "DEFAULT": "#8A5A00"
  },
  "service-mind-bg": {
    "light": "#FCE7F3",
    "dark": "rgba(244,184,228,0.16)",
    "DEFAULT": "#FCE7F3"
  },
  "service-mind-glyph": {
    "light": "#9B2C6B",
    "dark": "#F4B8E4",
    "DEFAULT": "#9B2C6B"
  },
  "service-nutrition-bg": {
    "light": "#EDF7DC",
    "dark": "rgba(142,220,94,0.16)",
    "DEFAULT": "#EDF7DC"
  },
  "service-nutrition-glyph": {
    "light": "#3F6B12",
    "dark": "#8EDC5E",
    "DEFAULT": "#3F6B12"
  },
  "service-family-bg": {
    "light": "#FFE9DE",
    "dark": "rgba(255,179,138,0.16)",
    "DEFAULT": "#FFE9DE"
  },
  "service-family-glyph": {
    "light": "#A6501E",
    "dark": "#FFB38A",
    "DEFAULT": "#A6501E"
  },
  "glass-bg": {
    "light": "rgba(255,255,255,0.78)",
    "dark": "rgba(18,38,58,0.72)",
    "DEFAULT": "rgba(255,255,255,0.78)"
  },
  "glass-bgStrong": {
    "light": "rgba(255,255,255,0.90)",
    "dark": "rgba(18,38,58,0.90)",
    "DEFAULT": "rgba(255,255,255,0.90)"
  },
  "glass-scrim": {
    "light": "rgba(11,27,43,0.06)",
    "dark": "rgba(255,255,255,0.08)",
    "DEFAULT": "rgba(11,27,43,0.06)"
  },
  "glass-blur": "20px",
  "track-filled": "#D7FF00",
  "track-rest": {
    "light": "rgba(11,27,43,0.18)",
    "dark": "rgba(255,255,255,0.14)",
    "DEFAULT": "rgba(11,27,43,0.18)"
  }
};

const spacing = {
  "3xs": "4px",
  "2xs": "8px",
  "xs": "12px",
  "sm": "16px",
  "md": "20px",
  "lg": "24px",
  "xl": "32px",
  "2xl": "40px",
  "3xl": "48px",
  "4xl": "56px",
  "5xl": "64px"
};

const borderRadius = {
  "sm": "8px",
  "md": "12px",
  "lg": "16px",
  "xl": "20px",
  "2xl": "24px",
  "3xl": "28px",
  "4xl": "32px",
  "5xl": "36px",
  "pill": "9999px"
};

const boxShadow = {
  "tile": "0 8px 24px rgba(11,27,43,0.07)",
  "card": "0 6px 18px rgba(11,27,43,0.05)",
  "raised": "0 16px 40px rgba(11,27,43,0.08)",
  "avatar": "0 8px 20px rgba(11,27,43,0.10)",
  "pin": "0 6px 12px rgba(212,42,56,0.35)",
  "glass": "0 8px 32px rgba(11,27,43,0.10)"
};

const fontFamily = {
  "sans": "'Readex Pro', 'Noto Sans Arabic', 'Noto Sans Devanagari', 'Noto Sans Bengali', 'Noto Nastaliq Urdu', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  "brand": "'Readex Pro', 'Noto Sans Arabic', system-ui, sans-serif",
  "ar": "'Readex Pro', 'Noto Sans Arabic', system-ui, sans-serif",
  "en": "'Readex Pro', system-ui, sans-serif",
  "ur": "'Noto Nastaliq Urdu', 'Readex Pro', system-ui, sans-serif",
  "hi": "'Noto Sans Devanagari', 'Readex Pro', system-ui, sans-serif",
  "fil": "'Readex Pro', system-ui, sans-serif",
  "bn": "'Noto Sans Bengali', 'Readex Pro', system-ui, sans-serif"
};

module.exports = { theme: { extend: { colors, spacing, borderRadius, boxShadow, fontFamily } } };
module.exports.nabdTokens = { colors, spacing, borderRadius, boxShadow, fontFamily };
