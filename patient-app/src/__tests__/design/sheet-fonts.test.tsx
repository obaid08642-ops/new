import React from 'react';
import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { CartProvider, useCart } from '../../context/CartContext';
import { HomeTopRow } from '../../components/home/HomeTopRow';
import { Sheet } from '../../components/consult/ConsultKit';
import { Chip } from '../../../../packages/ui-native/src';
import { Toast, Modal as UiModal } from '../../../../packages/ui-native/src';
import { installAppText, setUrduState } from "../../theme/urduText";

/**
 * Owner report: an Urdu-looking (Nastaliq) face showed in the Arabic app, in the consultations filters sheet and the
 * home "Your carts" sheet. Cause: texts that name no fontFamily are drawn by the device in its system font, which on
 * a phone set to Urdu is Nastaliq even for Arabic letters. The shared Text/TextInput wrapper now gives every text the
 * app face, at module level (a Modal is a separate native root, but it reads the same patched module).
 */

let mockLang = 'ar';
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({
  useApp: () => ({ isDark: false, lang: mockLang, isRTL: mockLang === 'ar' || mockLang === 'ur', toggleTheme: jest.fn(), setLang: jest.fn() }),
  LANGUAGES: [],
}));
jest.mock('../../context/DiagnosticsCartContext', () => ({ useDiagnosticsCart: () => ({ items: [{ id: 't1', kind: 'lab', qty: 3 }] }) }));
jest.mock('../../store/middleware/listenerMiddleware', () => ({ startAppListening: () => () => undefined }));

const READEX = /^ReadexPro-(300|400|500|700)$/;
const NASTALIQ = /^NotoNastaliqUrdu_(400Regular|500Medium|700Bold)$/;
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, bottom: 0, left: 0, right: 0 } };
const store = configureStore({ reducer: { auth: (s: object = {}) => s, notifications: (s: object = {}) => s } });

const familyOf = (node: { props: { style?: unknown } }) => (StyleSheet.flatten(node.props.style as never) as { fontFamily?: string } | undefined)?.fontFamily;
/** Every Text/TextInput host element under the view must resolve to the expected face. */
function allFamilies(view: ReturnType<typeof render> extends Promise<infer R> ? R : never) {
  return view.queryAllByText(/./).map((n) => familyOf(n));
}

beforeAll(() => installAppText());
afterEach(() => setUrduState('', false));

describe.each([['ar'], ['en']])('language %s', (lang) => {
  beforeEach(() => { mockLang = lang; });

  it('a Text with no fontFamily inside a Modal resolves to Readex Pro, by weight; a nested Text keeps its parent face', async () => {
    const view = await render(
      <Modal visible transparent>
        <View>
          <Text testID="plain">x</Text>
          <Text testID="bold" style={{ fontWeight: '700' }}>x</Text>
          <Text testID="semi" style={{ fontWeight: '600' }}>x</Text>
          <Text testID="parent" style={{ fontFamily: 'ReadexPro-700' }}>a<Text testID="child">b</Text></Text>
          <TextInput testID="field" placeholder="p" />
        </View>
      </Modal>,
    );
    expect(familyOf(view.getByTestId('plain'))).toBe('ReadexPro-400');
    expect(familyOf(view.getByTestId('bold'))).toBe('ReadexPro-700');
    expect(familyOf(view.getByTestId('semi'))).toBe('ReadexPro-500');
    expect(familyOf(view.getByTestId('parent'))).toBe('ReadexPro-700');
    expect(familyOf(view.getByTestId('child'))).toBeUndefined();
    expect(familyOf(view.getByTestId('field'))).toBe('ReadexPro-400');
  });

  it('the consultations filters Sheet with its chips draws every text in Readex Pro', async () => {
    const view = await render(
      <Sheet open title="t" onClose={() => undefined} closeLabel="c">
        <Chip label="one" />
        <Chip label="two" selected />
      </Sheet>,
    );
    const families = allFamilies(view);
    expect(families.length).toBeGreaterThan(2);
    for (const f of families) expect(f).toMatch(READEX);
  });

  it('the home "Your carts" sheet draws every text in Readex Pro', async () => {
    const view = await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Provider store={store}>
          <CartProvider>
            <HomeTopRow name="Test" />
          </CartProvider>
        </Provider>
      </SafeAreaProvider>,
    );
    fireEvent.press(await view.findByTestId('home-cart-button'));
    await view.findByTestId('cart-chooser');
    const families = allFamilies(view);
    expect(families.length).toBeGreaterThan(2);
    for (const f of families) expect(f).toMatch(READEX);
  });

  it('the shared ui-native Modal and Toast draw in Readex Pro', async () => {
    const view = await render(
      <>
        <UiModal open title="Title" body="Body" confirmLabel="OK" closeLabel="Close" />
        <Toast message="Saved" actionLabel="Undo" />
      </>,
    );
    const families = allFamilies(view);
    expect(families.length).toBeGreaterThan(2);
    for (const f of families) expect(f).toMatch(READEX);
  });
});

describe('language ur (Nastaliq ready)', () => {
  it('a Text with no fontFamily and an explicit Readex one both resolve to Nastaliq inside a Modal', async () => {
    mockLang = 'ur';
    setUrduState('ur', true);
    const view = await render(
      <Modal visible transparent>
        <Text testID="plain">x</Text>
        <Text testID="bold" style={{ fontFamily: 'ReadexPro-700' }}>x</Text>
      </Modal>,
    );
    expect(familyOf(view.getByTestId('plain'))).toMatch(NASTALIQ);
    expect(familyOf(view.getByTestId('bold'))).toBe('NotoNastaliqUrdu_700Bold');
  });

  it('Arabic never gets Nastaliq: after ur, switching back restores Readex Pro', async () => {
    mockLang = 'ar';
    setUrduState('ur', true);
    setUrduState('', false);
    const view = await render(<Text testID="t" style={{ fontFamily: 'ReadexPro-500' }}>x</Text>);
    expect(familyOf(view.getByTestId('t'))).toBe('ReadexPro-500');
  });
});

describe('source guards', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs') as typeof import('fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path') as typeof import('path');
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '../../../', rel), 'utf8');

  it('the root layout installs the shared text wrapper before anything renders', () => {
    expect(read('app/_layout.tsx')).toMatch(/^installAppText\(\);$/m);
  });

  it('every Text of the ui-native Modal/Toast (Feedback.tsx) names a Readex Pro face, not a bare fontWeight', () => {
    const src = read('../packages/ui-native/src/components/Feedback.tsx').slice(read('../packages/ui-native/src/components/Feedback.tsx').indexOf('export function Toast'));
    const tags = [...src.matchAll(/<Text\b[^>]*?style=\{\{[^}]*\}/g)].map((m) => m[0]);
    expect(tags.length).toBeGreaterThanOrEqual(4);
    for (const tag of tags) expect(tag).toMatch(/fontFamily: 'ReadexPro-(400|500|700)'/);
  });
});
