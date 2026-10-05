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
 * Platform.OS is "web" here, so iOS-only controls (Sign in with Apple) do not show.
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
};
const boardPage = (screen, theme) => `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><script src="./support.js"></script></head><body>
<x-dc><helmet><style>body{margin:0}</style></helmet><div style="width: 390px; height: 844px">
<dc-import name="Auth" screen="${screen}" theme="${theme}" platform="android" hint-size="390px,844px"></dc-import></div></x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":390,"height":844}}'>
class Component extends DCLogic { renderVals() { return {}; } }
</script></body></html>`;
const W = 390;
const H = 844;
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
    export async function apiFetch() { throw new Error('offline'); }
    export async function storeAuthSession() {}`,
  'expo-auth-session': `
    export const useAuthRequest = () => [null, null, async () => ({ type: 'dismiss' })];
    export const makeRedirectUri = () => 'nabdplus://redirect';`,
  'node-builtin': `export class AsyncLocalStorage { getStore() { return undefined; } run(_s, f) { return f(); } } export default {};`,
  'expo-web-browser': `export const maybeCompleteAuthSession = () => ({ type: 'failed' });`,
  'expo-apple-authentication': `
    export const AppleAuthenticationScope = { FULL_NAME: 0, EMAIL: 1 };
    export const isAvailableAsync = async () => false;
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
    build.onResolve({ filter: /^expo-secure-store$/ }, () => ({ path: join(REPO, 'tools/live/rnweb/secure-store-web.js') }));
    // the network client, as the auth screens and their auth components import it
    build.onResolve({ filter: /utils\/api$/ }, (a) => (a.importer.startsWith(SCREEN_DIR + sep) || a.importer.includes(`${sep}components${sep}auth${sep}`) ? virtual('auth-api') : undefined));
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
  const file = join(SCREEN_DIR, `${s}.tsx`);
  if (!existsSync(file)) throw new Error(`no screen ${file}`);
  bundles.set(s, await bundle(file));
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.ttf': 'font/ttf' };
const server = createServer((rq, rs) => {
  const url = decodeURIComponent(rq.url.split('?')[0]);
  const m = url.match(/^\/__app-(.+)\.js$/);
  if (m && bundles.has(m[1])) return rs.writeHead(200, { 'content-type': MIME['.js'] }).end(bundles.get(m[1]));
  const b = url.match(/^\/__board-(\w+)-(light|dark)\.html$/);
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
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, colorScheme: theme });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    // no backend in a design render: every request that is not this server fails like an offline phone
    await page.route('**/*', (r) => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
    await page.goto(`${BASE}/__blank`);
    await page.evaluate((th) => {
      localStorage.setItem('@nabdah_theme_mode', th);
      localStorage.setItem('@nabdah_language', 'ar');
    }, theme);
    const cfg = { width: W, height: H, insets: INSETS, params: BOARD[s].params };
    await page.setContent(
      `<!doctype html><html dir="rtl" lang="ar"><meta charset="utf-8"><style>${appFaces}html,body{margin:0}*{animation:none!important;transition:none!important}</style>` +
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
    const file = join(OUT, `${s}-${theme}.png`);
    await page.locator('#frame').screenshot({ path: file });
    written.push(file);

    const boardScreen = BOARD[s].board;
    const boardName = boardScreen ? `Auth screen=${boardScreen} theme=${theme} platform=android` : null;
    if (CMP) {
      let boardPng = null;
      if (boardScreen) {
        await page.unrouteAll();
        await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: boardFaces }));
        await page.goto(`${BASE}/__board-${boardScreen}-${theme}.html`);
        await page.addStyleTag({ content: '*{animation:none!important;transition:none!important}' });
        await page.waitForTimeout(500);
        await page.evaluate(() => document.fonts.ready);
        boardPng = (await page.screenshot({ clip: { x: 0, y: 0, width: W, height: H } })).toString('base64');
      }
      const appPng = shot.toString('base64');
      await page.setViewportSize({ width: 900, height: 980 });
      await page.setContent(`<!doctype html><meta charset="utf-8"><style>body{margin:0;font:13px system-ui;background:#888;display:inline-block}
        .row{display:flex;gap:24px;padding:20px;align-items:flex-start}.col{display:grid;gap:8px;justify-items:start}
        .col b{color:#fff}.col img,.none{display:block;width:${W}px;height:${H}px;border-radius:6px}.none{background:#999;color:#fff;display:flex;align-items:center;justify-content:center;text-align:center}</style>
        <div class="row"><div class="col"><b>Board: ${boardName || '(no ' + theme + ' board)'}</b>${boardPng ? `<img src="data:image/png;base64,${boardPng}">` : `<div class="none">No board for this screen.<br>It follows the Login/Register pattern.</div>`}</div>
        <div class="col"><b>patient-app ${s}.tsx, react-native-web (${theme})</b><img src="data:image/png;base64,${appPng}"></div></div>`);
      const cfile = join(CMP, `${s}-${theme}.png`);
      await page.locator('body').screenshot({ path: cfile });
      written.push(cfile);
    }
    await page.close();
  }
}
await browser.close();
server.close();
console.log(`render-native-screen: wrote ${written.length} file(s)\n${written.map((f) => '  ' + f.slice(REPO.length + 1)).join('\n')}`);
