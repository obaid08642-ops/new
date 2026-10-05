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
 * Batch 0 also renders the non-auth screens by alias (SCREEN_FILES: search, notifications, onboarding,
 * onboarding-language, onboarding-permissions). They run against the same module-boundary mocks, plus:
 *   --api empty|error|offline|fixture   what the network client answers (default for those aliases: empty,
 *                                       i.e. a real, empty account: [] for every call). `error` throws with the
 *                                       network reachable, `offline` throws and reports no connection, `fixture`
 *                                       answers from --fixture <file.json> ({ "<path prefix>": <body> }).
 *                                       A fixture is DESIGN-REVIEW TOOLING ONLY: it never ships and its images are
 *                                       named *-fixture-* so nobody mistakes them for app data.
 *   --params '{"q":"..."}'              route params the screen is opened with (e.g. the search query)
 *   --lang en|ar|ur|hi|bn|fil           UI language (sets the direction too); default ar
 *   --dark-only / --light-only          one theme
 * The permission modules (PermissionsManager), NetInfo and the push-notification hook are mocked as well.
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
const SCREENS = arg('--screens', 'welcome,login,register,otp').split(',');
/** Screens outside app/(auth), by alias (Batch 0: search, notifications, onboarding). */
const SCREEN_FILES = {
  search: 'patient-app/app/search/index.tsx',
  notifications: 'patient-app/app/notifications/index.tsx',
  onboarding: 'patient-app/app/(onboarding)/index.tsx',
  'onboarding-language': 'patient-app/app/(onboarding)/language.tsx',
  'onboarding-permissions': 'patient-app/app/(onboarding)/permissions.tsx',
};
const screenFile = (s) => (SCREEN_FILES[s] && !arg('--dir') ? join(REPO, SCREEN_FILES[s]) : join(SCREEN_DIR, `${s}.tsx`));
const API = arg('--api', null);
const EXTRA_PARAMS = arg('--params') ? JSON.parse(arg('--params')) : null;
const LANG = arg('--lang', 'ar');
const RTL_LANGS = ['ar', 'ur'];
const FIXTURE = arg('--fixture') ? JSON.parse(readFileSync(resolve(REPO, arg('--fixture')), 'utf8')) : null;
const THEMES = arg('--dark-only') ? ['dark'] : arg('--light-only') ? ['light'] : ['light', 'dark'];
/** The board each screen is drawn on, and the route params the screen is opened with in the flow. */
// `board` is the Auth.dc.html screen (Welcome/Login/Register/Otp/…Dark.dc.html are that component
// with screen/theme set; Register and Otp have no Dark file, so the dark board is Auth itself with
// theme="dark", served the same way). The otp params are the reset flow's, the one that carries the
// address in the route (the register flow carries it in a transaction that is not in the route).
const BOARD = {
  welcome: { board: 'welcome', params: {} },
  login: { board: 'login', params: {} },
  register: { board: 'register', params: {} },
  otp: { board: 'verify', params: { email: 'name@example.com', mode: 'reset' } },
  'forgot-password': { board: null, params: {} },
  'reset-password': { board: null, params: { email: 'name@example.com' } },
  // Batch 0, other boards. `dc` is a board that is its own component (Search, Notifications, Settings); `click` is
  // run on the board first to reach the state that matches the render (e.g. the empty-query view of Search).
  search: { dc: 'Search', click: 'button[aria-label="مسح"]', params: {} },
  notifications: { dc: 'Notifications', params: {} },
  // no onboarding board: the closest are Welcome (intro), Settings (language radios, toggle rows)
  onboarding: { board: 'welcome', params: {} },
  'onboarding-language': { dc: 'Settings', params: {} },
  'onboarding-permissions': { dc: 'Settings', params: {} },
};
const boardKey = (s) => (BOARD[s].dc ? `dc-${BOARD[s].dc}` : BOARD[s].board);
const boardPage = (screen, theme) => `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><script src="./support.js"></script></head><body>
<x-dc><helmet><style>body{margin:0}</style></helmet><div style="width: 390px; height: 844px; overflow: hidden">
${screen.startsWith('dc-') ? `<dc-import name="${screen.slice(3)}" hint-size="390px,844px"></dc-import>` : `<dc-import name="Auth" screen="${screen}" theme="${theme}" platform="${PLATFORM === 'ios' ? 'ios' : 'android'}" hint-size="390px,844px"></dc-import>`}</div></x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":390,"height":844}}'>
class Component extends DCLogic { renderVals() { return {}; } }
</script></body></html>`;
const W = Number(arg('--width', 390));
const H = Number(arg('--height', 844));
const PLATFORM = arg('--platform', 'web');
const SUFFIX = arg('--suffix', '');
const BOARD_SIZE = W === 390 && H === 844;
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
    export const router = { push() {}, replace() {}, back() {}, canGoBack: () => true, navigate() {} };
    export const useRouter = () => router;
    export const useLocalSearchParams = () => (window.__SCREEN.params || {});
    export const useGlobalSearchParams = useLocalSearchParams;
    export const useSegments = () => [];
    export const usePathname = () => '/';
    export const useFocusEffect = () => {};
    export const useNavigation = () => ({ addListener: () => () => {}, setOptions() {} });
    export const Link = ({ children }) => children;
    export const Redirect = () => null;
    export const Stack = Object.assign(() => null, { Screen: () => null });`,
  'auth-api': `
    // MODE: offline (the auth screens' default: every call fails), error, empty (a real empty account), fixture
    export async function apiFetch(path) {
      const mode = window.__SCREEN.api || 'offline';
      if (mode === 'offline' || mode === 'error') throw new Error('network');
      if (mode === 'fixture') {
        const f = window.__SCREEN.fixture || {};
        const k = Object.keys(f).find((x) => String(path).startsWith(x));
        // "$ago:5m|2h|3d" in a fixture is a time relative to now, so a feed is always "today" when rendered
        const at = (v) => {
          const m = typeof v === 'string' && v.match(/^\\$ago:(\\d+)([mhd])$/);
          if (m) return new Date(Date.now() - Number(m[1]) * { m: 60000, h: 3600000, d: 86400000 }[m[2]]).toISOString();
          if (Array.isArray(v)) return v.map(at);
          if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([a, b]) => [a, at(b)]));
          return v;
        };
        if (k) return at(f[k]);
      }
      return [];
    }
    export async function storeAuthSession() {}`,
  'netinfo': `
    const state = () => ({ isConnected: window.__SCREEN.api !== 'offline', isInternetReachable: window.__SCREEN.api !== 'offline' });
    const NetInfo = { fetch: async () => state(), addEventListener: () => () => {} };
    export default NetInfo;
    export const useNetInfo = () => state();`,
  'permissions-manager': `
    export const permissions = { check: async () => 'undetermined', request: async () => 'denied', isGranted: () => false };`,
  'push-hook': `export const translateBackendRoute = () => null; export default {};`,
  'expo-auth-session': `
    export const useAuthRequest = () => [null, null, async () => ({ type: 'dismiss' })];
    export const makeRedirectUri = () => 'nabdplus://redirect';`,
  'node-builtin': `export class AsyncLocalStorage { getStore() { return undefined; } run(_s, f) { return f(); } } export default {};`,
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
    build.onResolve({ filter: /^expo-apple-authentication$/ }, () => virtual('expo-apple-authentication'));
    build.onResolve({ filter: /^@react-native-community\/netinfo$/ }, () => virtual('netinfo'));
    build.onResolve({ filter: /services\/PermissionsManager$/ }, () => virtual('permissions-manager'));
    build.onResolve({ filter: /hooks\/usePushNotifications$/ }, () => virtual('push-hook'));
    build.onResolve({ filter: /^expo-secure-store$/ }, () => ({ path: join(REPO, 'tools/live/rnweb/secure-store-web.js') }));
    // the network client, as the auth screens and their auth components import it
    build.onResolve({ filter: /utils\/api$/ }, (a) => (a.importer.startsWith(APP + sep) && !a.importer.includes(`${sep}node_modules${sep}`) ? virtual('auth-api') : undefined));
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
      react: join(NM, 'react'),
      'react-dom': join(NM, 'react-dom'),
      'react-native-svg': join(NM, 'react-native-svg'),
      'react-native-safe-area-context': join(NM, 'react-native-safe-area-context'),
    },
    nodePaths: [NM],
    mainFields: ['browser', 'module', 'main'],
    conditions: ['browser', 'import', 'default'],
    resolveExtensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
    define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false', global: 'window', 'process.env.EXPO_OS': '"web"' },
    banner: { js: 'window.process = window.process || { env: { NODE_ENV: "production" } };' },
    logLevel: 'error',
  });
  return out.outputFiles[0].text;
}

const bundles = new Map();
for (const s of SCREENS) {
  const file = screenFile(s);
  if (!existsSync(file)) throw new Error(`no screen ${file}`);
  bundles.set(s, await bundle(file));
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
  for (const theme of THEMES) {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, colorScheme: theme });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    // no backend in a design render: every request that is not this server fails like an offline phone
    await page.route('**/*', (r) => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
    await page.goto(`${BASE}/__blank`);
    await page.evaluate(({ th, lng }) => {
      localStorage.setItem('@nabdah_theme_mode', th);
      localStorage.setItem('@nabdah_language', lng);
    }, { th: theme, lng: LANG });
    const cfg = { width: W, height: H, insets: INSETS, params: { ...BOARD[s].params, ...(EXTRA_PARAMS || {}) }, platform: PLATFORM, lang: LANG, dir: RTL_LANGS.includes(LANG) ? 'rtl' : 'ltr', api: API || (SCREEN_FILES[s] ? 'empty' : 'offline'), fixture: FIXTURE };
    await page.setContent(
      `<!doctype html><html dir="${cfg.dir}" lang="${LANG}"><meta charset="utf-8"><style>${appFaces}html,body{margin:0}*{animation:none!important;transition:none!important}</style>` +
        `<div id="root"></div><script>window.__SCREEN=${JSON.stringify(cfg)}</script><script src="${BASE}/__app-${s}.js"></script></html>`,
      { waitUntil: 'load' },
    );
    await page.waitForSelector('#frame', { timeout: 10000 }).catch(() => {
      throw new Error(`${s}/${theme}: did not render: ${errors.join('; ')}`);
    });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500); // AppProvider hydrates theme/language from storage; entrance animations settle
    const shot = await page.locator('#frame').screenshot();
    if (errors.length) console.warn(`${s}/${theme}: page errors: ${errors.join('; ')}`);
    const measured = await page.evaluate(() => {
      const w = (id) => { const e = document.querySelector('[data-testid="' + id + '"]'); return e ? Math.round(e.getBoundingClientRect().width) : null; };
      return { 'login-submit': w('login-submit'), 'welcome-guest': w('welcome-guest') };
    });
    if (measured['login-submit'] || measured['welcome-guest']) console.log(`measured ${s}${SUFFIX}/${theme} at ${W}: ${JSON.stringify(measured)}`);
    const file = join(OUT, `${s}${SUFFIX}-${theme}.png`);
    await page.locator('#frame').screenshot({ path: file });
    written.push(file);

    const boardScreen = boardKey(s);
    // the dc boards (Search, Notifications, Settings) are light-only; dark has no board
    const hasBoard = boardScreen && (!BOARD[s].dc || theme === 'light');
    const boardName = hasBoard ? (BOARD[s].dc ? `${BOARD[s].dc}.dc.html (light)` : `Auth screen=${boardScreen} theme=${theme} platform=${PLATFORM === 'ios' ? 'ios' : 'android'}`) : null;
    if (CMP && BOARD_SIZE) {
      let boardPng = null;
      if (hasBoard) {
        await page.unrouteAll();
        await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: boardFaces }));
        await page.goto(`${BASE}/__board-${boardScreen}-${theme}.html`);
        await page.addStyleTag({ content: '*{animation:none!important;transition:none!important}' });
        await page.waitForTimeout(500);
        // the board opens on a query; a render with no query is compared with the board's empty-query view
        if (BOARD[s].click && !EXTRA_PARAMS?.q) await page.click(BOARD[s].click, { timeout: 3000 }).catch(() => console.warn(`${s}: board click ${BOARD[s].click} not found`));
        await page.waitForTimeout(300);
        await page.evaluate(() => document.fonts.ready);
        boardPng = (await page.screenshot({ clip: { x: 0, y: 0, width: W, height: H } })).toString('base64');
      }
      const appPng = shot.toString('base64');
      await page.setViewportSize({ width: 900, height: 980 });
      await page.setContent(`<!doctype html><meta charset="utf-8"><style>body{margin:0;font:13px system-ui;background:#888;display:inline-block}
        .row{display:flex;gap:24px;padding:20px;align-items:flex-start}.col{display:grid;gap:8px;justify-items:start}
        .col b{color:#fff}.col img,.none{display:block;width:${W}px;height:${H}px;border-radius:6px}.none{background:#999;color:#fff;display:flex;align-items:center;justify-content:center;text-align:center}</style>
        <div class="row"><div class="col"><b>Board: ${boardName || '(no ' + theme + ' board)'}</b>${boardPng ? `<img src="data:image/png;base64,${boardPng}">` : `<div class="none">No ${theme} board for this screen.<br>It follows the light board and the sign-in pattern.</div>`}</div>
        <div class="col"><b>patient-app ${s}.tsx, react-native-web (${theme})</b><img src="data:image/png;base64,${appPng}"></div></div>`);
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
