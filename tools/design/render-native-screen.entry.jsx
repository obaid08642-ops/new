/*
 * Entry for tools/design/render-native-screen.mjs: renders one whole patient-app
 * screen (app/(auth)/<name>.tsx) through react-native-web at a phone size.
 *
 * Real: the screen module, AppProvider (theme and language come from the same
 * AsyncStorage keys the app reads), the auth slice in a redux store, the safe-area
 * contexts with an iPhone's insets (47 top, 34 bottom), the shared components and tokens.
 * Mocked at the module boundary by the .mjs (see MOCKS there): the router, the
 * network client, the OAuth/native sign-in modules and SecureStore.
 */
import * as React from 'react';
import { AppRegistry, Platform, View } from 'react-native';
import { SafeAreaFrameContext, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import authReducer from '@app/src/store/slices/authSlice';
import { AppProvider } from '@app/src/context/AppContext';
import { CartProvider, useCart } from '@app/src/context/CartContext';
import { ConsultationsProvider } from '@app/src/context/ConsultationsContext';
import { DiagnosticsCartProvider, useDiagnosticsCart } from '@app/src/context/DiagnosticsCartContext';
import { parseQuote } from '@app/src/utils/ordering';
import { setPick, setTime, startDraft } from '@app/src/utils/orderingBooking';
import fixtures from '@fixtures';
import Screen from '@screen';
import TabBar from '@tabbar';
import LayoutHeader from '@header';

const cfg = window.__SCREEN;
if (cfg.platform && cfg.platform !== "web") Platform.OS = cfg.platform; // e.g. the iOS layout of the sign-in screens
// --auth member: a signed-in patient (screens that ask for member-only data, e.g. "order again"); the default is a visitor
const authInitial = authReducer(undefined, { type: '@@init' });
const store = configureStore({
  reducer: { auth: authReducer },
  preloadedState: cfg.auth === 'member' ? { auth: { ...authInitial, isAuthenticated: true, isGuest: false } } : undefined,
});
// --ordering-draft quote|picked|timed: the in-memory ordering draft the compare, picker and confirm screens read, built from the TEST quote of the
// fixtures (POST /ordering/quote) the way the compare screen builds it: quote, then the best match of each group, then a time for each group.
if (cfg.draft) {
  const quote = parseQuote(JSON.parse(JSON.stringify(fixtures['POST /ordering/quote']).replace(/"@in\+(\d+)s"/g, (_m, n) => JSON.stringify(new Date(Date.now() + Number(n) * 1000).toISOString()))));
  if (quote) {
    startDraft({ kind: 'lab', payer: cfg.draftPayer || 'insurance', quote, lat: 24.7, lng: 46.7, placeLine: 'شارع تجريبي، مدينة تجريبية' });
    if (cfg.draft !== 'quote') for (const g of quote.groups) if (g.best_match) setPick(g, g.best_match);
    if (cfg.draft === 'timed') {
      for (const g of quote.groups) setTime(g.mode, g.mode === 'home' ? { type: 'window', start: new Date(Date.now() + 7200e3).toISOString(), end: new Date(Date.now() + 14400e3).toISOString() } : { type: 'slot', id: 'test-slot-1', start: new Date(Date.now() + 90000e3).toISOString(), end: new Date(Date.now() + 91800e3).toISOString() });
    }
  }
}
const metrics = { frame: { x: 0, y: 0, width: cfg.width, height: cfg.height }, insets: cfg.insets };

// --cart test: marked TEST lines in the real cart (the second needs a prescription), added once on mount
function SeedCart() {
  const { addItem } = useCart();
  React.useEffect(() => {
    if (cfg.cart !== 'test') return;
    void addItem({ id: 'test-med', name: 'منتج تجريبي ١', rx: false, activeIngredient: 'مادة تجريبية', qty: 2 });
    void addItem({ id: 'test-alt', name: 'منتج تجريبي ٢', rx: true, qty: 1 });
  }, []);
  return null;
}

// --diag-cart test: marked TEST lines in the diagnostics cart (one lab test, one scan), added once on mount
function SeedDiagCart() {
  const { addItem } = useDiagnosticsCart();
  React.useEffect(() => {
    if (cfg.diagCart !== 'test') return;
    void addItem({ id: 'test-lab-test', name: 'تحليل تجريبي ١', price: 90, kind: 'lab' });
    void addItem({ id: 'test-rad', name: 'فحص أشعة تجريبي', price: 250, kind: 'radiology' });
  }, []);
  return null;
}

function Root() {
  return (
    // dir: react-native-web resolves start/end from the writing direction of its context, the
    // counterpart of I18nManager.isRTL on a device running in Arabic.
    <View nativeID="frame" dir={cfg.dir || "rtl"} lang={cfg.lang || "ar"} style={{ width: cfg.width, height: cfg.height, overflow: 'hidden', flexDirection: 'column' }}>
      {/* the contexts directly: on the web SafeAreaProvider measures the browser (zero insets) */}
      <SafeAreaFrameContext.Provider value={metrics.frame}>
        <SafeAreaInsetsContext.Provider value={metrics.insets}>
          <Provider store={store}>
            <AppProvider>
              {/* the real cart (local state, as in the app root): the pharmacy screens read and write it */}
              <CartProvider>
               <ConsultationsProvider>
                <DiagnosticsCartProvider>
                <SeedCart />
                <SeedDiagCart />
                {/* what the tabs layout draws: its header above the screen, the tab bar floating over it */}
                {cfg.header ? <LayoutHeader /> : null}
                <View style={{ flex: 1 }}>
                  <Screen />
                </View>
                {cfg.tabbar ? <TabBar /> : null}
                </DiagnosticsCartProvider>
               </ConsultationsProvider>
              </CartProvider>
            </AppProvider>
          </Provider>
        </SafeAreaInsetsContext.Provider>
      </SafeAreaFrameContext.Provider>
    </View>
  );
}

AppRegistry.registerComponent('screen', () => Root);
AppRegistry.runApplication('screen', { rootTag: document.getElementById('root') });
