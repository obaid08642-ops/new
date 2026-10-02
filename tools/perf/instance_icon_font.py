"""Pin the Material Symbols Rounded variable font to the one instance the apps render.

  pip install fonttools && python3 tools/perf/instance_icon_font.py <variable.ttf> patient-app/assets/fonts/MaterialSymbolsRounded.ttf

React Native (native and web) never sets font-variation-settings, so every icon is drawn with the font's default
axes (FILL 0, GRAD 0, opsz 24, wght 400). The variable file (15.05 MB) also carries the deltas for every other
instance; the root layout waits for all fonts before the first render, so on the web those bytes sat on the
critical path. The static instance keeps every glyph and the ligature table (GSUB), so every icon name still
resolves. Verified 2026-10-02: 3,971 icon ligatures rendered in Chromium with both files, 0 pixels differ
(docs/review/PERFORMANCE.md). To use another weight or the filled style, instance it as a separate family.
"""
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

DEFAULTS = {'FILL': 0, 'GRAD': 0, 'opsz': 24, 'wght': 400}

src, dst = sys.argv[1], sys.argv[2]
font = TTFont(src)
if 'fvar' not in font:
    sys.exit(f'{src} is already static')
axes = {a.axisTag: a.defaultValue for a in font['fvar'].axes}
assert axes == DEFAULTS, f'default axes changed upstream: {axes}'
instancer.instantiateVariableFont(font, DEFAULTS).save(dst)
print(f'wrote {dst}')
