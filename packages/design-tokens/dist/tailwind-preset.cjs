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
  "icon-onSolid": "#FFFFFF",
  "icon-ratingStar": {
    "light": "#A65A00",
    "dark": "#FFD166",
    "DEFAULT": "#A65A00"
  },
  "icon-ratingStarOnBrand": "#FFD166",
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
  "action-primary-gradient-from": {
    "light": "#E62337",
    "dark": "#FF6B73",
    "DEFAULT": "#E62337"
  },
  "action-primary-gradient-to": {
    "light": "#D42A38",
    "dark": "#FF6B73",
    "DEFAULT": "#D42A38"
  },
  "action-fab-from": "#FF5A63",
  "action-fab-to": "#D42A38",
  "action-fab-fg": "#FFFFFF",
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
  "accent-lime": "#D7FF00",
  "accent-limeMuted": "rgba(215,255,0,0.16)",
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
  "service-coral-fg": {
    "light": "#CE2936",
    "dark": "#FF8A91",
    "DEFAULT": "#CE2936"
  },
  "service-coral-bg": {
    "light": "#FFE8EA",
    "dark": "rgba(255,107,115,0.16)",
    "DEFAULT": "#FFE8EA"
  },
  "service-coral-solid-from": "#FF5C65",
  "service-coral-solid-to": "#E8384A",
  "service-blue-fg": {
    "light": "#2D4FD6",
    "dark": "#9DB0FF",
    "DEFAULT": "#2D4FD6"
  },
  "service-blue-bg": {
    "light": "#E7ECFF",
    "dark": "rgba(110,139,255,0.16)",
    "DEFAULT": "#E7ECFF"
  },
  "service-blue-solid-from": "#5B7CFF",
  "service-blue-solid-to": "#3A56D4",
  "service-mint-fg": {
    "light": "#0E7C5E",
    "dark": "#6FE0BC",
    "DEFAULT": "#0E7C5E"
  },
  "service-mint-bg": {
    "light": "#E1F6EE",
    "dark": "rgba(79,210,168,0.15)",
    "DEFAULT": "#E1F6EE"
  },
  "service-mint-solid-from": "#27A67F",
  "service-mint-solid-to": "#16956F",
  "service-violet-fg": {
    "light": "#6A3FD1",
    "dark": "#C2AEFF",
    "DEFAULT": "#6A3FD1"
  },
  "service-violet-bg": {
    "light": "#EFEAFF",
    "dark": "rgba(156,125,255,0.16)",
    "DEFAULT": "#EFEAFF"
  },
  "service-violet-solid-from": "#9C7DFF",
  "service-violet-solid-to": "#7A52E0",
  "service-amber-fg": {
    "light": "#A65A00",
    "dark": "#FFC56E",
    "DEFAULT": "#A65A00"
  },
  "service-amber-bg": {
    "light": "#FFF1DB",
    "dark": "rgba(255,181,71,0.15)",
    "DEFAULT": "#FFF1DB"
  },
  "service-amber-solid-from": "#D68000",
  "service-amber-solid-to": "#D38200",
  "service-pink-fg": {
    "light": "#C2296E",
    "dark": "#FF9CC6",
    "DEFAULT": "#C2296E"
  },
  "service-pink-bg": {
    "light": "#FFE7F1",
    "dark": "rgba(255,128,180,0.15)",
    "DEFAULT": "#FFE7F1"
  },
  "service-pink-solid-from": "#F4609A",
  "service-pink-solid-to": "#D63B80",
  "service-lime-fg": {
    "light": "#4A7A00",
    "dark": "#C2EA6B",
    "DEFAULT": "#4A7A00"
  },
  "service-lime-bg": {
    "light": "#EDF8D6",
    "dark": "rgba(168,217,74,0.15)",
    "DEFAULT": "#EDF8D6"
  },
  "service-lime-solid-from": "#71A230",
  "service-lime-solid-to": "#5E9A00",
  "service-peach-fg": {
    "light": "#B74B1C",
    "dark": "#FFAE8A",
    "DEFAULT": "#B74B1C"
  },
  "service-peach-bg": {
    "light": "#FFEDE3",
    "dark": "rgba(255,156,114,0.15)",
    "DEFAULT": "#FFEDE3"
  },
  "service-peach-solid-from": "#FF6021",
  "service-peach-solid-to": "#E0632C",
  "service-teal-fg": {
    "light": "#0A778C",
    "dark": "#6FD6E8",
    "DEFAULT": "#0A778C"
  },
  "service-teal-bg": {
    "light": "#E0F5F8",
    "dark": "rgba(35,181,206,0.15)",
    "DEFAULT": "#E0F5F8"
  },
  "service-teal-solid-from": "#1FA2B8",
  "service-teal-solid-to": "#0E97AE",
  "service-ink-fg": {
    "light": "#0B1B2B",
    "dark": "#F5F5F7",
    "DEFAULT": "#0B1B2B"
  },
  "service-ink-bg": {
    "light": "#EDEFF2",
    "dark": "rgba(255,255,255,0.10)",
    "DEFAULT": "#EDEFF2"
  },
  "service-ink-solid-from": "#0B1B2B",
  "service-ink-solid-to": "#1A3148",
  "service-pharmacy-bg": {
    "light": "#FFE8EA",
    "dark": "rgba(255,107,115,0.16)",
    "DEFAULT": "#FFE8EA"
  },
  "service-pharmacy-glyph": {
    "light": "#CE2936",
    "dark": "#FF8A91",
    "DEFAULT": "#CE2936"
  },
  "service-consult-bg": {
    "light": "#E7ECFF",
    "dark": "rgba(110,139,255,0.16)",
    "DEFAULT": "#E7ECFF"
  },
  "service-consult-glyph": {
    "light": "#2D4FD6",
    "dark": "#9DB0FF",
    "DEFAULT": "#2D4FD6"
  },
  "service-lab-bg": {
    "light": "#E1F6EE",
    "dark": "rgba(79,210,168,0.15)",
    "DEFAULT": "#E1F6EE"
  },
  "service-lab-glyph": {
    "light": "#0E7C5E",
    "dark": "#6FE0BC",
    "DEFAULT": "#0E7C5E"
  },
  "service-radiology-bg": {
    "light": "#EFEAFF",
    "dark": "rgba(156,125,255,0.16)",
    "DEFAULT": "#EFEAFF"
  },
  "service-radiology-glyph": {
    "light": "#6A3FD1",
    "dark": "#C2AEFF",
    "DEFAULT": "#6A3FD1"
  },
  "service-nursing-bg": {
    "light": "#E0F5F8",
    "dark": "rgba(35,181,206,0.15)",
    "DEFAULT": "#E0F5F8"
  },
  "service-nursing-glyph": {
    "light": "#0A778C",
    "dark": "#6FD6E8",
    "DEFAULT": "#0A778C"
  },
  "service-mind-bg": {
    "light": "#EFEAFF",
    "dark": "rgba(156,125,255,0.16)",
    "DEFAULT": "#EFEAFF"
  },
  "service-mind-glyph": {
    "light": "#6A3FD1",
    "dark": "#C2AEFF",
    "DEFAULT": "#6A3FD1"
  },
  "service-nutrition-bg": {
    "light": "#EDF8D6",
    "dark": "rgba(168,217,74,0.15)",
    "DEFAULT": "#EDF8D6"
  },
  "service-nutrition-glyph": {
    "light": "#4A7A00",
    "dark": "#C2EA6B",
    "DEFAULT": "#4A7A00"
  },
  "service-family-bg": {
    "light": "#FFEDE3",
    "dark": "rgba(255,156,114,0.15)",
    "DEFAULT": "#FFEDE3"
  },
  "service-family-glyph": {
    "light": "#B74B1C",
    "dark": "#FFAE8A",
    "DEFAULT": "#B74B1C"
  },
  "service-maternity-bg": {
    "light": "#FFE7F1",
    "dark": "rgba(255,128,180,0.15)",
    "DEFAULT": "#FFE7F1"
  },
  "service-maternity-glyph": {
    "light": "#C2296E",
    "dark": "#FF9CC6",
    "DEFAULT": "#C2296E"
  },
  "service-map-bg": {
    "light": "#FFF1DB",
    "dark": "rgba(255,181,71,0.15)",
    "DEFAULT": "#FFF1DB"
  },
  "service-map-glyph": {
    "light": "#A65A00",
    "dark": "#FFC56E",
    "DEFAULT": "#A65A00"
  },
  "service-health-bg": {
    "light": "#FFE8EA",
    "dark": "rgba(255,107,115,0.16)",
    "DEFAULT": "#FFE8EA"
  },
  "service-health-glyph": {
    "light": "#CE2936",
    "dark": "#FF8A91",
    "DEFAULT": "#CE2936"
  },
  "service-emergency-bg": {
    "light": "#FFEDE3",
    "dark": "rgba(255,156,114,0.15)",
    "DEFAULT": "#FFEDE3"
  },
  "service-emergency-glyph": {
    "light": "#B74B1C",
    "dark": "#FFAE8A",
    "DEFAULT": "#B74B1C"
  },
  "service-insurance-bg": {
    "light": "#E7ECFF",
    "dark": "rgba(110,139,255,0.16)",
    "DEFAULT": "#E7ECFF"
  },
  "service-insurance-glyph": {
    "light": "#2D4FD6",
    "dark": "#9DB0FF",
    "DEFAULT": "#2D4FD6"
  },
  "service-points-bg": {
    "light": "#FFF1DB",
    "dark": "rgba(255,181,71,0.15)",
    "DEFAULT": "#FFF1DB"
  },
  "service-points-glyph": {
    "light": "#A65A00",
    "dark": "#FFC56E",
    "DEFAULT": "#A65A00"
  },
  "control-segmentedTrack": {
    "light": "#EAEAEF",
    "dark": "#1A3148",
    "DEFAULT": "#EAEAEF"
  },
  "control-switchOn": "#1F9D6E",
  "control-switchKnob": "#FFFFFF",
  "control-radioOff": {
    "light": "#C7C7CC",
    "dark": "rgba(255,255,255,0.28)",
    "DEFAULT": "#C7C7CC"
  },
  "avatar-bg": {
    "light": "#FFE3E5",
    "dark": "#1A3148",
    "DEFAULT": "#FFE3E5"
  },
  "avatar-ring": "#FF4B55",
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
  },
  "iconArt-ink": "#0B1B2B",
  "iconArt-paper": "#FFFFFF",
  "iconArt-coral": "#FF6B73",
  "iconArt-amber": "#FFD166",
  "iconArt-blue": "#6E8BFF",
  "iconArt-blueSoft": "#9DB0FF",
  "iconArt-mint": "#3FBF9A",
  "iconArt-mintSoft": "#6FE0B8",
  "iconArt-violet": "#C3A8FF",
  "iconArt-lavender": "#D2B8FF",
  "iconArt-pink": "#F4B8E4",
  "iconArt-lime": "#8EDC5E",
  "iconArt-skin": "#FFB38A"
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
  "glass": "0 8px 32px rgba(11,27,43,0.10)",
  "tabBar": "0 18px 40px rgba(11,27,43,0.14)",
  "fab": "0 12px 26px rgba(212,42,56,0.38)",
  "button": "0 10px 22px rgba(212,42,56,0.28), inset 0 1px 0 rgba(255,255,255,0.25)",
  "segmented": "0 2px 6px rgba(11,27,43,0.10)",
  "knob": "0 2px 6px rgba(0,0,0,0.18)"
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
