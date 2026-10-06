#!/usr/bin/env node
/**
 * Whole patient-app screens through react-native-web, next to their board.
 *
 *   node tools/design/render-native-screen.mjs --out <dir> [--compare <dir>] [--screens welcome,login]
 *
 * Renders app/(auth)/<screen>.tsx at 390×844 (the boards' frame, iPhone insets
 * 47/34) in light and dark, and writes <out>/<screen>-<theme>.png. With
 * --compare it also writes <compare>/<screen>-<theme>.png: the board (left) and
 * the screen (right) side by side.
 *
 * What is real: the screen file, AppProvider (theme and language are set through
 * the same AsyncStorage keys the app reads), the auth slice in a redux store, the
 * safe-area provider, packages/ui-native and the tokens.
 * What is mocked, at the module boundary only (MOCKS below): the router, the
 * network client (utils/api, as imported by the auth screens), the OAuth/native
 * sign-in modules (expo-auth-session, expo-web-browser, expo-apple-authentication)
 * and SecureStore (the repo's web shim). Nothing is filled in: fields are empty,
 * and providers that need a client id render only if one is configured.
 * Platform.OS is "web" here, so iOS-only controls (Sign in with Apple) do not show; --platform ios
 * forces Platform.OS to 'ios' (the official Apple button is a stub on the web: a plain button in the
 * button's black / white style). --width/--height set the viewport (default 390x844; the boards are 390 wide,
 * so a different size skips the board comparison) and --suffix is added to the file names (welcome-768-light.png).
 *
 *
 * Tabs screens (Home, Services): `--dir "patient-app/app/(tabs)" --screens index:home,services` renders
 * (tabs)/index.tsx and writes home-<theme>.png (`file[:name]`). With no --height the frame is the board's
 * (HomeApp 390x2140, ServiceHub 390x1640), so the whole scroll is in the picture. `--tabbar <file>` puts a
 * tab bar component (default export, e.g. patient-app/src/components/BottomNavBar.tsx) over the screen and
 * `--header <file>` the tabs layout's header above it, as the tabs layout does; `--path` is what usePathname
 * returns ('/' = Home). `--crop-bottom N` keeps the bottom N px of the frame and of the board (the tab bar).
 * `--api empty` (default) answers every endpoint with an empty payload ("no data yet", nothing invented),
 * `offline` makes every request fail, `fixture` answers with clearly marked TEST values from
 * tools/design/render-native-screen.fixtures.json so data-bound layouts can be checked.
 *
 * Needs Playwright (Chromium) and patient-app's node_modules; esbuild from packages/ui.
 */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const req = createRequire(import.meta.url);
const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i === -1 ? d : process.argv[i + 1];
};
const APP = join(REPO, 'patient-app');
const NM = join(APP, 'node_modules');
const BOARDS = join(REPO, 'docs/design/canvas');
const FONTS = join(APP, 'assets/fonts');
const OUT = resolve(REPO, arg('--out', 'docs/design/screenshots/batch0-app/after'));
const CMP = arg('--compare') ? resolve(REPO, arg('--compare')) : null;
// --dir renders the screens from another folder at the same depth (e.g. a copy of the screens as
// they were before a change, so BEFORE and AFTER go through the same renderer).
const SCREEN_DIR = resolve(REPO, arg('--dir', 'patient-app/app/(auth)'));
// `file[:name]`: the screen file in --dir, and the name its images are written under.
const SCREEN_SPECS = arg('--screens', 'welcome,login,register,otp').split(',').map((x) => {
  const [file, name] = x.split(':');
  return { file, name: name || file };
});
const SCREENS = SCREEN_SPECS.map((x) => x.name);
const API_MODE = arg('--api', 'empty');
// --auth member renders as a signed-in patient (default: a visitor with no session)
const AUTH = arg('--auth', 'visitor');
// --cart test fills the local cart with marked TEST lines (one needs a prescription) so a filled cart can be drawn
const CART = arg('--cart', 'empty');
// --params 'a=b,c=d' overrides the route params of every screen of the run (e.g. prescriptionId=test-rx)
// --params takes JSON ('{"orderId":"x"}') or a comma list ('a=1,b=2')
const PARAMS_OVERRIDE = arg('--params') ? (arg('--params').trim().startsWith('{') ? JSON.parse(arg('--params')) : Object.fromEntries(arg('--params').split(',').map((kv) => kv.split('=')))) : null;
const WAIT = Number(arg('--wait', 2600));
// --lang en renders the left-to-right layout (the same AsyncStorage key the app reads); the default is Arabic
const LANG = arg('--lang', 'ar');
const DIR = LANG === 'ar' || LANG === 'ur' ? 'rtl' : 'ltr';
const TABBAR = arg('--tabbar') ? resolve(REPO, arg('--tabbar')) : null;
const HEADER = arg('--header') ? resolve(REPO, arg('--header')) : null;
const PATHNAME = arg('--path', '/');
const CROP_BOTTOM = Number(arg('--crop-bottom', 0));
/** The board each screen is drawn on, and the route params the screen is opened with in the flow. */
// `board` is the Auth.dc.html screen (Welcome/Login/Register/Otp/…Dark.dc.html are that component
// with screen/theme set; Register and Otp have no Dark file, so the dark board is Auth itself with
// theme="dark", served the same way). The otp params are the reset flow's, the one that carries the
// address in the route (the register flow carries it in a transaction that is not in the route).
const BOARD = {
  home: { component: 'HomeApp', size: [390, 2140], params: {} },
  services: { component: 'ServiceHub', size: [390, 1640], params: {} },
  // the tab bar alone: the HomeApp frame cropped to its bottom edge (--crop-bottom)
  tabbar: { component: 'HomeApp', size: [390, 2140], params: {} },
  // screens without a board of their own render at a phone's size and are not compared
  'all-services': { params: {} },
  splash: { params: {} },
  notifications: { params: {} },
  search: { params: {} },
  // Batch 1a (pharmacy hub and product screens). The hub and the product page have their own boards;
  // the three list screens follow the PharmacyHub template and have none. product-detail is opened with
  // the id the fixtures answer for; medicine-compare with two ids.
  'pharmacy-hub': { component: 'PharmacyHub', size: [390, 1420], params: {} },
  'product-detail': { component: 'ProductFull', size: [390, 3380], params: { id: 'test-med' } },
  wishlist: { params: {} },
  filters: { params: {} },
  'medicine-compare': { params: { ids: 'test-med,test-alt' } },
  // Batch 1b (cart and prescription). The cart and the prescription upload have boards; the prescription list
  // (rx-order), the barcode scanner, the manual request and the negotiation chat follow the RxUpload / PharmacyHub
  // templates and have none. The cart is filled with --cart test (marked test lines), the chat opens an order id.
  cart: { component: 'Cart', size: [390, 1260], params: {} },
  'scan-prescription': { component: 'RxUpload', size: [390, 1100], params: {} },
  'rx-order': { params: {} },
  'rx-order-detail': { params: { prescriptionId: 'test-rx' } },
  'barcode-scanner': { params: {} },
  request: { params: {} },
  'pharmacist-chat': { params: { orderId: 'test-order' } },
  // Batch 1c (pharmacy offers, high effort). broadcast-status is the PharmacyOffers board; final-quote follows the same
  // template with no board of its own. The order ids select the TEST order of render-native-screen.fixtures.json
  // (`--order <id>`, or `--params '{"requestId":"test-order"}'` for a screen that reads another param).
  'broadcast-status': { component: 'PharmacyOffers', size: [390, 1180], params: { orderId: 'test-order' } },
  'final-quote': { params: { orderId: 'test-order-quote' } },
  // Batch 1d (checkout, payment, insurance decision, payment result; high effort). checkout, payment and the insurance decision
  // are the CheckoutV2 board's header, summary cards, totals and sticky action; the result of a payment is the Success board.
  // The ids select the TEST orders and payments of render-native-screen.fixtures.json.
  checkout: { component: 'CheckoutV2', size: [390, 1100], params: {} },
  payment: { component: 'CheckoutV2', size: [390, 1100], params: { orderId: 'test-pay' } },
  'insurance-decision': { component: 'CheckoutV2', size: [390, 1100], params: { orderId: 'test-ins-partial' } },
  'order-confirm': { params: { orderId: 'test-order' } },
  'payment-result': { component: 'Success', size: [390, 844], params: { transactionId: 'test-txn-paid', bookingKind: 'pharmacy', bookingId: 'test-pay' } },
  // Batch 1e (orders and tracking). Orders and OrderTracking are boards; the pharmacy order history is the Orders board for the
  // governed orders only, order-again and the delivery address follow its card and the Account board's rows (no board of their own).
  orders: { component: 'Orders', size: [390, 900], params: {} },
  'order-history': { component: 'Orders', size: [390, 900], params: {} },
  'order-tracking': { component: 'OrderTracking', size: [390, 1120], params: { orderId: 'test-track' } },
  reorder: { params: { orderId: 'test-delivered' } },
  'address-select': { params: {} },
  // Batch 2 (consultations; the 22 screens of the batch). Run them per folder: `--dir patient-app/app/consultations --screens
  // appointments:c-appointments,book/[id]:c-book,...` (`file[:name]`), `--dir "patient-app/app/(tabs)/consultations" --screens index:c-hub`
  // and `--dir patient-app/app/room --screens "[id]:c-room"`. The ids select the TEST records of render-native-screen.fixtures.json
  // (`test-appt`, `test-doc`, `test-clinic`). Screens that follow the Consult template draw on its board (the hub), pass --height 844.
  // The call screens have no board: they keep their layout (owner decision of 2026-10-04) and render at a phone's size.
  'c-hub': { component: 'Consult', size: [390, 1660], params: {} },
  'c-specialty-select': { component: 'Consult', size: [390, 1660], params: {} },
  'c-appointments': { component: 'Appointments', size: [390, 960], params: {} },
  'c-call-history': { component: 'Appointments', size: [390, 960], params: {} },
  'c-appointment-detail': { component: 'Consult', size: [390, 1660], params: { appointmentId: 'test-appt' } },
  'c-cancel-reschedule': { component: 'Consult', size: [390, 1660], params: { appointmentId: 'test-appt' } },
  'c-follow-up': { component: 'Consult', size: [390, 1660], params: { appointmentId: 'test-appt' } },
  'c-post-call-rating': { component: 'Consult', size: [390, 1660], params: { appointmentId: 'test-appt-done' } },
  'c-prescription-from-doctor': { component: 'Consult', size: [390, 1660], params: {} },
  'c-share-report': { component: 'Consult', size: [390, 1660], params: {} },
  'c-summary': { component: 'Consult', size: [390, 1660], params: { appointmentId: 'test-appt-done' } },
  'c-book': { component: 'BookingConfirm', size: [390, 1180], params: { id: 'test-doc', visit_type: 'clinic' } },
  'c-booking-status': { component: 'BookingConfirm', size: [390, 1180], params: { appointmentId: 'test-appt', visitType: 'clinic' } },
  'c-clinic-confirm': { component: 'BookingConfirm', size: [390, 1180], params: { appointmentId: 'test-appt' } },
  'c-clinic': { component: 'DoctorFull', size: [390, 2700], params: { id: 'test-clinic' } },
  'c-doctor': { component: 'DoctorFull', size: [390, 2700], params: { id: 'test-doc' } },
  'c-home-visit-tracking': { component: 'OrderTracking', size: [390, 1120], params: { appointmentId: 'test-appt-home' } },
  'c-chat': { params: { doctorId: 'test-doc', appointmentId: 'test-appt' } },
  'c-incoming-call': { params: { callerName: 'د. طبيب تجريبي', sessionId: 'test-session', callType: 'video' } },
  'c-video-call': { params: { appointmentId: 'test-appt-video' } },
  'c-waiting-room': { params: { appointmentId: 'test-appt-video' } },
  'c-room': { params: { id: 'test-room' } },
  // Batch 5 (health and records; merge map). The hub is the HealthHub board; every other screen follows its card, row and
  // tile language and has none. The tab of a merged screen is a route param (`tab`), so one file is rendered once per tab:
  // `--dir patient-app/app/health --screens vitals:h-vitals,vitals:h-vitals-trends,...` (`--dir "patient-app/app/(tabs)" --screens health:h-hub`).
  // The ids select the TEST records of render-native-screen.fixtures.json (`test-report`).
  'h-hub': { component: 'HealthHub', size: [390, 1360], params: {} },
  'h-vitals': { params: {} },
  'h-vitals-history': { params: { tab: 'history', type: 'bp' } },
  'h-vitals-trends': { params: { tab: 'trends' } },
  'h-sleep': { params: {} },
  'h-meds': { params: {} },
  'h-meds-reminders': { params: { tab: 'reminders' } },
  'h-meds-refills': { params: { tab: 'refills' } },
  'h-meds-chronic': { params: { tab: 'chronic' } },
  'h-profile': { params: {} },
  'h-profile-conditions': { params: { tab: 'conditions' } },
  'h-profile-emergency': { params: { tab: 'emergency' } },
  'h-records': { params: {} },
  'h-records-rx': { params: { tab: 'prescriptions' } },
  'h-records-timeline': { params: { tab: 'timeline' } },
  'h-wearables': { params: {} },
  'h-report': { params: { id: 'test-report' } },
  'h-id': { params: {} },
  welcome: { board: 'welcome', params: {} },
  login: { board: 'login', params: {} },
  register: { board: 'register', params: {} },
  otp: { board: 'verify', params: { email: 'name@example.com', mode: 'reset' } },
  'forgot-password': { board: null, params: {} },
  'reset-password': { board: null, params: { email: 'name@example.com' } },
};
const boardPage = (screen, theme) => {
  const comp = BOARD[screen]?.component;
  const [bw, bh] = BOARD[screen]?.size || [390, 844];
  const tag = comp
    ? `<dc-import name="${comp}" theme="${theme}" hint-size="${bw}px,${bh}px"></dc-import>`
    : `<dc-import name="Auth" screen="${screen}" theme="${theme}" platform="${PLATFORM === 'ios' ? 'ios' : 'android'}" hint-size="390px,844px"></dc-import>`;
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><script src="./support.js"></script></head><body>
<x-dc><helmet><style>body{margin:0}</style></helmet><div style="width: ${bw}px; height: ${bh}px">
${tag}</div></x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${bw},"height":${bh}}}'>
class Component extends DCLogic { renderVals() { return {}; } }
</script></body></html>`;
};
// --order <id> sets the route param orderId; --params '<json>' replaces the params of every rendered screen
const ORDER_OVERRIDE = arg('--order');
const paramsOf = (screen) => PARAMS_OVERRIDE ?? { ...BOARD[screen].params, ...(ORDER_OVERRIDE ? { orderId: ORDER_OVERRIDE } : {}) };
const W = Number(arg('--width', 390));
const H_ARG = arg('--height');
/** The frame height: --height, else the board's own (Home, Services), else a phone's 844. */
const frameHeight = (screen) => (H_ARG ? Number(H_ARG) : BOARD[screen]?.size?.[1] ?? 844);
const PLATFORM = arg('--platform', 'web');
const CAMERA = arg('--camera', 'granted');
const SUFFIX = arg('--suffix', '');
const INSETS = { top: 47, bottom: 34, left: 0, right: 0 };

let playwright;
try {
  playwright = req('playwright');
} catch {
  console.error('render-native-screen: playwright not found (install it or set NODE_PATH)');
  process.exit(2);
}
const esbuild = createRequire(join(REPO, 'packages/ui/package.json'))('esbuild');

/** Module-boundary mocks. Each is the smallest surface the auth screens call. */
const MOCKS = {
  'expo-router': `
    import * as React from 'react';
    export const router = { push() {}, replace() {}, back() {}, canGoBack: () => true, navigate() {} };
    export const useRouter = () => router;
    export const useLocalSearchParams = () => (window.__SCREEN.params || {});
    export const useGlobalSearchParams = useLocalSearchParams;
    export const useSegments = () => [];
    export const usePathname = () => (window.__SCREEN && window.__SCREEN.pathname) || '/';
    // a screen that loads on focus loads once when it is drawn
    export const useFocusEffect = (cb) => { React.useEffect(() => { const out = cb(); return typeof out === 'function' ? out : undefined; }, [cb]); };
    export const useNavigation = () => ({ addListener: () => () => {}, setOptions() {} });
    export const Link = ({ children }) => children;
    export const Redirect = () => null;
    export const Stack = Object.assign(() => null, { Screen: () => null });`,
  // The network client. 'empty' answers every endpoint with an empty payload (no data yet, nothing
  // invented); 'offline' fails every request; 'fixture' answers with the TEST values in
  // render-native-screen.fixtures.json (clearly marked as such) so data-bound layouts can be checked.
  'auth-api': `
    import fixtures from '@fixtures';
    const EMPTY = { '/health/reminders': [], '/mental-health/mood': [], '/health/vitals/summary': [], '/home/upcoming-appointment': null, '/content/home': { sections: [] } };
    // a fixture string "@in+600s" is a time 600 s from now (an offer's expiry), so a countdown draws like a live one
    const resolve = (v) => typeof v === 'string' && /^@in\\+\\d+s$/.test(v) ? new Date(Date.now() + Number(v.slice(4, -1)) * 1000).toISOString() : Array.isArray(v) ? v.map(resolve) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x)])) : v;
    export async function apiFetch(path, options) {
      const mode = (window.__SCREEN && window.__SCREEN.api) || 'empty';
      if (mode === 'offline') throw new Error('offline');
      const key = String(path).split('?')[0];
      // a fixture of the form {"__error": "code"} makes the request fail with that server code, like an answer of 400
      const answer = (v) => { if (v && typeof v === 'object' && '__error' in v) throw new Error(v.__error); return resolve(v); };
      // a mutation is recorded; a fixture named "POST /path" is its answer (e.g. the result of a payment check), else {}
      if (options && options.method && options.method !== 'GET') { window.__MUTATIONS = (window.__MUTATIONS || []).concat([{ path: key, method: options.method }]); const fk = options.method + ' ' + key; return mode === 'fixture' && fk in fixtures ? answer(fixtures[fk]) : {}; }
      if (mode === 'fixture' && key in fixtures) return answer(fixtures[key]);
      return key in EMPTY ? EMPTY[key] : {};
    }
    export const newIdempotencyKey = () => 'app-render-test-key';
    export async function storeAuthSession() {}
    // the constants other modules read from the client (image URLs resolve against them); no real host in a render
    export const BASE_URL = 'https://api.example.test/api/v1';
    export const FASTAPI_BASE_URL = 'https://ai.example.test';
    export const R2_PUBLIC_URL = 'https://cdn.example.test';`,
  'expo-auth-session': `
    export const useAuthRequest = () => [null, null, async () => ({ type: 'dismiss' })];
    export const makeRedirectUri = () => 'nabdplus://redirect';`,
  'node-builtin': `export class AsyncLocalStorage { getStore() { return undefined; } run(_s, f) { return f(); } } export default {};`,
  // camera and picker: a design render has neither; the permission is "granted" unless --camera denied
  'expo-camera': `
    import * as React from 'react';
    const state = () => (window.__SCREEN && window.__SCREEN.camera) || 'granted';
    export const useCameraPermissions = () => {
      const s = state();
      return s === 'undetermined' ? [null, async () => {}] : [{ granted: s === 'granted', canAskAgain: s !== 'blocked', status: s }, async () => {}];
    };
    export const CameraView = React.forwardRef(({ style }, ref) => <div ref={ref} style={{ ...(Array.isArray(style) ? Object.assign({}, ...style.flat()) : style), background: 'transparent' }} />);`,
  'expo-image-picker': `
    export const requestCameraPermissionsAsync = async () => ({ granted: false });
    export const requestMediaLibraryPermissionsAsync = async () => ({ granted: false });
    export const launchCameraAsync = async () => ({ canceled: true });
    export const launchImageLibraryAsync = async () => ({ canceled: true });`,
  // the call screens load the native LiveKit modules lazily; a design render draws the screen before any connection, with no media
  'livekit-native': `
    export const VideoView = () => null;
    export const AudioSession = { startAudioSession: async () => {}, stopAudioSession: async () => {} };
    export const registerGlobals = () => {};
    export const useRoomContext = () => null;
    export default {};`,
  // the realtime socket: a design render has no connection (the chat draws its thread from the REST fixtures)
  'socket-context': `
    export const useSocket = () => ({ socket: null, onlineUsers: [], isConnected: false, sendTyping() {}, joinThread() {}, leaveThread() {} });
    export const SocketProvider = ({ children }) => children;`,
  'expo-web-browser': `export const maybeCompleteAuthSession = () => ({ type: 'failed' });`,
  'expo-apple-authentication': `
    export const AppleAuthenticationScope = { FULL_NAME: 0, EMAIL: 1 };
    export const isAvailableAsync = async () => false;
    export const AppleAuthenticationButtonType = { SIGN_IN: 0, CONTINUE: 1, SIGN_UP: 2 };
    export const AppleAuthenticationButtonStyle = { WHITE: 0, WHITE_OUTLINE: 1, BLACK: 2 };
    // web stand-in for the native button: same size, radius and black/white style, the system's wording
    export function AppleAuthenticationButton({ buttonStyle, cornerRadius, style }) {
      const dark = buttonStyle === 2;
      return (
        <div role="button" style={{ ...style, boxSizing: 'border-box', borderRadius: cornerRadius, background: dark ? '#000' : '#fff', color: dark ? '#fff' : '#000', border: dark ? 'none' : '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, font: '500 17px -apple-system, system-ui, sans-serif', overflow: 'hidden' }}>
          <span style={{ fontSize: 20 }}>&#63743;</span>{cornerRadius === 18 && <span>Continue with Apple</span>}
        </div>
      );
    }
    export async function signInAsync() { throw Object.assign(new Error('unavailable'), { code: 'ERR_UNAVAILABLE' }); }`,
};

const mockPlugin = {
  name: 'boundary-mocks',
  setup(build) {
    const virtual = (key) => ({ path: key, namespace: 'mock' });
    build.onResolve({ filter: /^expo-router$/ }, () => virtual('expo-router'));
    build.onResolve({ filter: /^expo-auth-session(\/providers\/google)?$/ }, () => virtual('expo-auth-session'));
    build.onResolve({ filter: /^expo-web-browser$/ }, () => virtual('expo-web-browser'));
    build.onResolve({ filter: /context\/SocketContext$/ }, (a) => (a.importer.startsWith(APP + sep) ? virtual('socket-context') : undefined));
    build.onResolve({ filter: /^@livekit\/react-native(-webrtc)?$/ }, () => virtual('livekit-native'));
    build.onResolve({ filter: /^expo-camera$/ }, () => virtual('expo-camera'));
    build.onResolve({ filter: /^expo-image-picker$/ }, () => virtual('expo-image-picker'));
    build.onResolve({ filter: /^expo-apple-authentication$/ }, () => virtual('expo-apple-authentication'));
    build.onResolve({ filter: /^expo-secure-store$/ }, () => ({ path: join(REPO, 'tools/live/rnweb/secure-store-web.js') }));
    // the network client, as the auth screens and their auth components import it
    build.onResolve({ filter: /(utils\/|^\.\/)api$/ }, (a) => (a.importer.startsWith(APP + sep) && !a.importer.includes(`${sep}node_modules${sep}`) ? virtual('auth-api') : undefined));
    // server-rendering branches of expo packages import node builtins; the browser never runs them
    build.onResolve({ filter: /^node:/ }, () => virtual('node-builtin'));
    build.onLoad({ filter: /.*/, namespace: 'mock' }, (a) => ({ contents: MOCKS[a.path], loader: 'jsx', resolveDir: APP }));
  },
};

async function bundle(screenFile) {
  const out = await esbuild.build({
    entryPoints: [join(REPO, 'tools/design/render-native-screen.entry.jsx')],
    bundle: true,
    write: false,
    jsx: 'automatic',
    loader: { '.js': 'jsx', '.png': 'dataurl', '.jpg': 'dataurl', '.ttf': 'dataurl', '.otf': 'dataurl', '.wav': 'empty', '.mp3': 'empty', '.mp4': 'empty', '.lottie': 'empty', '.glb': 'empty' },
    plugins: [mockPlugin],
    alias: {
      'react-native': join(NM, 'react-native-web'),
      '@app': APP,
      '@screen': screenFile,
      '@tabbar': TABBAR || join(REPO, 'tools/design/render-native-screen.null.jsx'),
      '@header': HEADER || join(REPO, 'tools/design/render-native-screen.null.jsx'),
      '@fixtures': join(REPO, 'tools/design/render-native-screen.fixtures.json'),
      react: join(NM, 'react'),
      'react-dom': join(NM, 'react-dom'),
      'react-native-svg': join(NM, 'react-native-svg'),
      'react-native-safe-area-context': join(NM, 'react-native-safe-area-context'),
    },
    nodePaths: [NM],
    mainFields: ['browser', 'module', 'main'],
    conditions: ['browser', 'import', 'default'],
    resolveExtensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
    define: { 'process.env.EXPO_PUBLIC_CONSULT_NEARBY_FILTERS': JSON.stringify(process.env.EXPO_PUBLIC_CONSULT_NEARBY_FILTERS ?? ''), 'process.env.NODE_ENV': '"production"', __DEV__: 'false', global: 'window', 'process.env.EXPO_OS': '"web"' },
    banner: { js: 'window.process = window.process || { env: { NODE_ENV: "production" } };' },
    logLevel: 'error',
  });
  return out.outputFiles[0].text;
}

const bundles = new Map();
for (const { file: f, name } of SCREEN_SPECS) {
  const file = join(SCREEN_DIR, `${f}.tsx`);
  if (!existsSync(file)) throw new Error(`no screen ${file}`);
  bundles.set(name, await bundle(file));
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.ttf': 'font/ttf' };
const server = createServer((rq, rs) => {
  const url = decodeURIComponent(rq.url.split('?')[0]);
  const m = url.match(/^\/__app-(.+)\.js$/);
  if (m && bundles.has(m[1])) return rs.writeHead(200, { 'content-type': MIME['.js'] }).end(bundles.get(m[1]));
  const b = url.match(/^\/__board-([\w-]+)-(light|dark)\.html$/);
  if (b) return rs.writeHead(200, { 'content-type': MIME['.html'] }).end(boardPage(b[1], b[2]));
  if (url === '/__blank') return rs.writeHead(200, { 'content-type': MIME['.html'] }).end('<!doctype html><title>x</title>');
  const root = url.startsWith('/__font/') ? FONTS : BOARDS;
  const file = resolve(root, '.' + sep + (url.startsWith('/__font/') ? url.slice(8) : url));
  if (!file.startsWith(root + sep)) return rs.writeHead(403).end();
  if (!existsSync(file)) return rs.writeHead(404).end();
  rs.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  rs.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, r));
const BASE = `http://localhost:${server.address().port}`;
const boardFaces = [300, 400, 500, 600, 700]
  .map((w) => `@font-face{font-family:'Readex Pro';font-weight:${w};src:url(${BASE}/__font/ReadexPro-${w === 600 ? 700 : w}.ttf)}`)
  .join('');
const appFaces =
  [300, 400, 500, 700].map((w) => `@font-face{font-family:'ReadexPro-${w}';src:url(${BASE}/__font/ReadexPro-${w}.ttf)}`).join('') +
  `@font-face{font-family:'MaterialSymbolsRounded';src:url(${BASE}/__font/MaterialSymbolsRounded.ttf)}` +
  boardFaces;

mkdirSync(OUT, { recursive: true });
if (CMP) mkdirSync(CMP, { recursive: true });
const browser = await playwright.chromium.launch();
const written = [];
for (const s of SCREENS) {
  const H = frameHeight(s);
  const [BW, BH] = BOARD[s].size || [390, 844];
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, colorScheme: theme });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    // no backend in a design render: every request that is not this server fails like an offline phone
    await page.route('**/*', (r) => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
    await page.goto(`${BASE}/__blank`);
    await page.evaluate(([th, lg]) => {
      localStorage.setItem('@nabdah_theme_mode', th);
      localStorage.setItem('@nabdah_language', lg);
    }, [theme, LANG]);
    const cfg = { width: W, height: H, insets: INSETS, params: paramsOf(s), cart: CART, camera: CAMERA, platform: PLATFORM, dir: DIR, lang: LANG, pathname: PATHNAME, api: API_MODE, auth: AUTH, tabbar: Boolean(TABBAR), header: Boolean(HEADER) };
    await page.setContent(
      `<!doctype html><html dir="${DIR}" lang="${LANG}"><meta charset="utf-8"><style>${appFaces}html,body{margin:0}*{animation:none!important;transition:none!important}</style>` +
        `<div id="root"></div><script>window.__SCREEN=${JSON.stringify(cfg)}</script><script src="${BASE}/__app-${s}.js"></script></html>`,
      { waitUntil: 'load' },
    );
    await page.waitForSelector('#frame', { timeout: 10000 }).catch(() => {
      throw new Error(`${s}/${theme}: did not render: ${errors.join('; ')}`);
    });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(WAIT); // AppProvider hydrates theme/language from storage; entrance animations settle (the home ECG line draws for 1.7 s)
    const frameBox = await page.locator('#frame').boundingBox();
    const cropClip = CROP_BOTTOM ? { x: frameBox.x, y: frameBox.y + H - CROP_BOTTOM, width: W, height: CROP_BOTTOM } : null;
    const shoot = (path) => (cropClip ? page.screenshot({ clip: cropClip, path }) : page.locator('#frame').screenshot({ path }));
    const shot = await shoot();
    if (errors.length) console.warn(`${s}/${theme}: page errors: ${errors.join('; ')}`);
    const measured = await page.evaluate(() => {
      const w = (id) => { const e = document.querySelector('[data-testid="' + id + '"]'); return e ? Math.round(e.getBoundingClientRect().width) : null; };
      return { 'login-submit': w('login-submit'), 'welcome-guest': w('welcome-guest') };
    });
    if (measured['login-submit'] || measured['welcome-guest']) console.log(`measured ${s}${SUFFIX}/${theme} at ${W}: ${JSON.stringify(measured)}`);
    const file = join(OUT, `${s}${SUFFIX}-${theme}.png`);
    await shoot(file);
    written.push(file);

    const boardScreen = BOARD[s].board ?? (BOARD[s].component ? s : null);
    const boardName = boardScreen ? (BOARD[s].component ? `${BOARD[s].component} theme=${theme}` : `Auth screen=${boardScreen} theme=${theme} platform=${PLATFORM === 'ios' ? 'ios' : 'android'}`) : null;
    // the board is drawn at its own size, so a comparison needs the same width (and, for the auth boards, height)
    if (CMP && W === BW && (BOARD[s].component ? true : H === BH)) {
      let boardPng = null;
      if (boardScreen) {
        await page.unrouteAll();
        await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: boardFaces }));
        await page.goto(`${BASE}/__board-${boardScreen}-${theme}.html`);
        await page.addStyleTag({ content: '*{animation:none!important;transition:none!important}' });
        await page.waitForTimeout(500);
        await page.evaluate(() => document.fonts.ready);
        const bclip = CROP_BOTTOM ? { x: 0, y: BH - CROP_BOTTOM, width: BW, height: CROP_BOTTOM } : { x: 0, y: 0, width: BW, height: BH };
        boardPng = (await page.screenshot({ clip: bclip, fullPage: true })).toString('base64');
      }
      const appPng = shot.toString('base64');
      const PH = CROP_BOTTOM || H;
      const BPH = CROP_BOTTOM || BH;
      await page.setViewportSize({ width: 900, height: 980 });
      await page.setContent(`<!doctype html><meta charset="utf-8"><style>body{margin:0;font:13px system-ui;background:#888;display:inline-block}
        .row{display:flex;gap:24px;padding:20px;align-items:flex-start}.col{display:grid;gap:8px;justify-items:start}
        .col b{color:#fff}.col img{display:block;width:${W}px;border-radius:6px}.none{display:block;width:${W}px;height:${BPH}px;border-radius:6px}.none{background:#999;color:#fff;display:flex;align-items:center;justify-content:center;text-align:center}</style>
        <div class="row"><div class="col"><b>Board: ${boardName || '(no ' + theme + ' board)'}</b>${boardPng ? `<img src="data:image/png;base64,${boardPng}">` : `<div class="none">No board for this screen.<br>It follows the Login/Register pattern.</div>`}</div>
        <div class="col"><b>patient-app ${s}, react-native-web (${theme}${API_MODE === 'empty' ? ', no data' : ', ' + API_MODE})</b><img src="data:image/png;base64,${appPng}"></div></div>`);
      const cfile = join(CMP, `${s}${SUFFIX}-${theme}.png`);
      await page.locator('body').screenshot({ path: cfile });
      written.push(cfile);
    }
    await page.close();
  }
}
await browser.close();
server.close();
console.log(`render-native-screen: wrote ${written.length} file(s)\n${written.map((f) => '  ' + f.slice(REPO.length + 1)).join('\n')}`);
