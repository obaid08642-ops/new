/*
 * Entry for tools/design/compare-native.mjs: renders one native shell through
 * react-native-web in a 390-wide frame, with what the board shows (window.__CMP).
 */
import * as React from 'react';
import { AppRegistry, View } from 'react-native';
import { SafeAreaFrameContext, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { AppHeader, StickyFooter, TabBar, shellTokens } from '@shells';
import * as UI from '@ui-native';

const cmp = window.__CMP;
const t = shellTokens(cmp.theme);
// a desktop browser has no insets; give the shells the ones the board frame draws
const frame = { x: 0, y: 0, width: 390, height: cmp.height };
const insets = { top: cmp.insetTop || 0, bottom: cmp.insetBottom || 0, left: 0, right: 0 };

/** A contract component (packages/ui-native) at the board element's width, on its background. */
function Component() {
  const Comp = UI[cmp.name];
  // a callback cannot travel as JSON: `onX: true` stands for "has a handler"
  const props = Object.fromEntries(Object.entries(cmp.props).map(([k, v]) => [k, /^on[A-Z]/.test(k) && v === true ? () => {} : v]));
  const bg = cmp.frame === 'surface' ? t.surface : t.canvas;
  return (
    <View nativeID="frame" style={{ width: cmp.width, height: cmp.frame === 'screen' ? cmp.height : undefined, backgroundColor: bg, flexDirection: 'row', alignItems: cmp.frame === 'screen' ? 'center' : 'flex-start' }}>
      <View style={{ flex: 1, alignItems: cmp.fill ? 'stretch' : 'flex-start' }}>
        <Comp {...props} theme={cmp.theme} />
      </View>
    </View>
  );
}

function Board() {
  const [tab, setTab] = React.useState(cmp.tabs ? cmp.tabs.find((x) => x.cur).key : '');
  return (
    <View nativeID="frame" style={{ width: 390, height: cmp.height, backgroundColor: t.canvas, position: 'relative', overflow: 'hidden' }}>
      <SafeAreaFrameContext.Provider value={frame}>
        <SafeAreaInsetsContext.Provider value={insets}>
          {cmp.kind === 'tabbar' ? (
            <TabBar
              theme={cmp.theme}
              direction="rtl"
              value={tab}
              onChange={setTab}
              label={cmp.label}
              items={cmp.tabs.map((x) => ({
                key: x.key,
                label: x.label,
                raised: x.fab,
                icon: (color, size) => (
                  <Svg width={size} height={size} viewBox="0 0 256 256">
                    <Path d={x.d} fill={color} />
                  </Svg>
                ),
              }))}
            />
          ) : cmp.kind === 'footer' ? (
            <View style={{ position: 'absolute', start: 0, end: 0, bottom: 0 }}>
              <StickyFooter theme={cmp.theme} direction="rtl">
                {/* the board's own price and button (react-native-web renders DOM children) */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontFamily: "'Readex Pro'" }} dangerouslySetInnerHTML={{ __html: cmp.html }} />
              </StickyFooter>
            </View>
          ) : (
            <AppHeader theme={cmp.theme} direction="rtl" title={cmp.title} onBack={() => {}} backLabel={cmp.backLabel} />
          )}
        </SafeAreaInsetsContext.Provider>
      </SafeAreaFrameContext.Provider>
    </View>
  );
}

AppRegistry.registerComponent('cmp', () => (cmp.kind === 'component' ? Component : Board));
AppRegistry.runApplication('cmp', { rootTag: document.getElementById('root') });
