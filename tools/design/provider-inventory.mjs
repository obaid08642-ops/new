/**
 * Provider-app part of tools/design/screen-inventory.mjs (read-only audit; owner rule: the provider app is NOT redesigned).
 *
 * provider-app does not use expo-router files. Screens are React Navigation screens registered in navigators:
 *   - provider-app/App.tsx                              role "app"   (auth, onboarding, pending, guest jobs, dashboard switch)
 *   - provider-app/src/screens/<role>/**Navigator*.tsx   role <role>  (<Stack.Screen name="x">{() => <Component/>}</Stack.Screen>;
 *                                                        the tabs of "MainTabs" are `activeTab === 'x' && <Component/>`)
 * A SCREEN here is a component (file + name) that a navigator renders. The same component registered in several roles is one row
 * with several registrations. Endpoints are found exactly as for the patient app (TypeScript AST, symbol-by-symbol closure from
 * the component), then every endpoint is matched against the backend controllers.
 *
 * Besides endpoints this pass extracts, per screen, the ELEMENTS that matter (buttons, inputs, toggles, lists/data, stat cards)
 * and what each one does, by static analysis of the component, its same-file helpers and the child components it imports:
 *   - a button handler is followed (local functions, imported functions, `Service.method`) to find the requests it sends
 *     (broken when the endpoint has no route), navigation (checked against the screens its navigator registers), parent
 *     callbacks, native calls, local state, and toast/Alert only (fake success), empty or console.log-only (dead);
 *   - inputs are traced to see whether their value reaches a request body or any logic;
 *   - useState data shown in JSX is traced to the request that fills it; never filled = always empty or hard-coded;
 *   - hard-coded record arrays, `Math.random()`, fake `setTimeout` delays, price literals, TODO / "coming soon" text.
 * Limits (also stated in PROVIDER_AUDIT_SUMMARY.md): static and heuristic; props passed by a parent are not traced across
 * components; response field names are not compared with backend DTOs (the runtime check shows response shapes instead).
 *
 * Outputs (all covered by `screen-inventory.mjs --check`):
 *   docs/design/PROVIDER_INVENTORY.md, docs/design/PROVIDER_WIRING_REPORT.md,
 *   docs/design/inventory/provider-screens.json (screens + calls), docs/design/inventory/provider-elements.json (elements).
 */

export function buildProvider(h) {
  const { ts, REPO, rel, read, walk, analyseFile, resolveSpec, closure, isCallerCallee, WRAPPERS, BUILDERS, REQ_BUILDERS, collectWrappers, matchRoute, be, commit, join } = h;
  const APP = 'provider-app';

  // the patient pass is finished: start the provider pass with its own wrapper tables
  WRAPPERS.clear();
  BUILDERS.clear();
  REQ_BUILDERS.clear();
  h.UNRESOLVED_SITES.clear();
  h.WRAPPER_SITES.clear();
  collectWrappers(['provider-app/src']);

  const lineOf = (n) => n.getSourceFile().getLineAndCharacterOfPosition(n.getStart()).line + 1;
  const unwrap = (e) => {
    while (e && (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e))) e = e.expression;
    return e;
  };
  const AR_CHARS = /[؀-ۿ]/;

  /* ------------------------------------------------------------ symbol resolution */
  function defOf(file, name, depth = 0) {
    if (depth > 8) return null;
    const fa = analyseFile(file);
    const imp = fa.imports.get(name);
    if (!imp) return fa.decls.has(name) ? { file, name } : null;
    const t = resolveSpec(APP, file, imp.spec);
    return t ? defOfExport(t, imp.name, depth + 1) : null;
  }
  function defOfExport(file, name, depth) {
    if (depth > 10) return null;
    const fa = analyseFile(file);
    const e = fa.exportsMap.get(name);
    if (e && 'local' in e) return defOf(file, e.local, depth + 1);
    if (e && e.spec) {
      const t = resolveSpec(APP, file, e.spec);
      return t ? defOfExport(t, e.name, depth + 1) : null;
    }
    if (fa.decls.has(name)) return { file, name };
    for (const s of fa.stars) {
      const t = resolveSpec(APP, file, s);
      if (t) {
        const r = defOfExport(t, name, depth + 1);
        if (r) return r;
      }
    }
    return null;
  }

  // a name used inside a function: a local function / variable declared in an enclosing block, or a parameter ('param')
  const bindingNames = (b, out) => {
    if (ts.isIdentifier(b)) out.push(b.text);
    else for (const e of b.elements || []) if (!ts.isOmittedExpression(e)) bindingNames(e.name, out);
    return out;
  };
  function resolveLocal(use, name) {
    for (let a = use.parent; a; a = a.parent) {
      if (ts.isFunctionLike(a)) {
        const ps = a.parameters.flatMap((p) => bindingNames(p.name, []));
        if (ps.includes(name)) return 'param';
      }
      if (ts.isBlock(a) || ts.isSourceFile(a)) {
        for (const st of a.statements) {
          if (ts.isFunctionDeclaration(st) && st.name?.text === name) return st;
          if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (bindingNames(d.name, []).includes(name)) return d;
        }
      }
    }
    return null;
  }

  // a variable that is not a function (`const { onSave } = props`, `const x = useSomething()`) holds a callback from outside
  const isFnDecl = (d) => {
    if (!ts.isVariableDeclaration(d)) return true;
    const i = unwrap(d.initializer);
    if (!i) return false;
    if (ts.isArrowFunction(i) || ts.isFunctionExpression(i)) return true;
    if (ts.isCallExpression(i) && i.arguments.some((a) => ts.isArrowFunction(unwrap(a)) || ts.isFunctionExpression(unwrap(a)))) return true;
    return false;
  };

  // `const { login } = useAuth()`: the function is declared inside AuthProvider (context/index.tsx), whose requests are not
  // reachable by import-following, so the calls inside that member are attributed to the caller
  const ctxFile = join(REPO, 'provider-app/src/context/index.tsx');
  const ctxCache = new Map();
  function ctxMemberCalls(name) {
    if (ctxCache.has(name)) return ctxCache.get(name);
    const out = [];
    const fa = analyseFile(ctxFile);
    const decl = (fa.decls.get('AuthProvider') || [])[0];
    if (decl) {
      let member = null;
      const f = (n) => { if (!member && ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name && n.initializer && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))) member = n; ts.forEachChild(n, f); };
      f(decl);
      if (member) {
        const a = lineOf(member);
        const b = member.getSourceFile().getLineAndCharacterOfPosition(member.getEnd()).line + 1;
        for (const c of fa.info.get('AuthProvider').calls) if (c.line >= a && c.line <= b) out.push({ ...c, via: `useAuth().${name}` });
      }
    }
    ctxCache.set(name, out);
    return out;
  }
  const isUseAuthDecl = (d) => ts.isVariableDeclaration(d) && d.initializer && ts.isCallExpression(unwrap(d.initializer)) && unwrap(d.initializer).expression.getText() === 'useAuth';

  /* ------------------------------------------------------------ navigator discovery */
  const srcRoot = join(REPO, 'provider-app/src');
  const navFiles = [join(REPO, 'provider-app/App.tsx'), ...walk(srcRoot, (p) => /\.tsx$/.test(p)).filter((p) => /Stack\.Screen/.test(read(p)))];
  const roleOfNav = (f) => {
    const m = rel(f).match(/provider-app\/src\/screens\/([^/]+)\//);
    return m ? m[1] : 'app';
  };
  const SKIP_SPEC = /^(react|react-native|expo|@react-navigation|@expo|react-native-)|\/components\/(ui|icons)$/;
  const regs = []; // { role, name, def, navFile, navLine }
  const navNames = new Map(); // role -> Set of registered names (Stack names and tab:<key>)
  const navExtra = new Map(); // role -> names handled by a custom navigateTo (doctor tabs)

  for (const nf of navFiles) {
    const role = roleOfNav(nf);
    const fa = analyseFile(nf);
    const sf = ts.createSourceFile(nf, read(nf), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    if (!navNames.has(role)) navNames.set(role, new Set());
    const names = navNames.get(role);
    const extra = [...read(nf).matchAll(/\[((?:\s*'[a-z_]+',?)+)\s*\]\.includes\(s\)/g)].flatMap((m) => [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]));
    if (extra.length) navExtra.set(role, new Set([...(navExtra.get(role) || []), ...extra]));
    const visit = (n) => {
      const open = ts.isJsxElement(n) ? n.openingElement : null;
      if (open && /\.Screen$/.test(open.tagName.getText(sf))) {
        const nameAttr = open.attributes.properties.find((a) => ts.isJsxAttribute(a) && a.name.text === 'name');
        const sname = nameAttr?.initializer && ts.isStringLiteral(nameAttr.initializer) ? nameAttr.initializer.text : null;
        if (sname) {
          names.add(sname);
          const cands = [];
          const walkC = (c) => {
            if ((ts.isJsxOpeningElement(c) || ts.isJsxSelfClosingElement(c)) && ts.isIdentifier(c.tagName) && /^[A-Z]/.test(c.tagName.text)) {
              const tag = c.tagName.text;
              const imp = fa.imports.get(tag);
              const skip = (imp && SKIP_SPEC.test(imp.spec)) || /Navigator$/.test(tag) || (!imp && !fa.decls.has(tag));
              if (!skip) {
                const def = defOf(nf, tag);
                let tab = null; // tab key = the string literals of the `&&` condition that guards the element
                for (let a = c.parent; a && a !== n; a = a.parent) {
                  if (ts.isBinaryExpression(a) && a.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
                    const lits = [];
                    const lv = (x) => { if (ts.isStringLiteral(x)) lits.push(x.text); ts.forEachChild(x, lv); };
                    lv(a.left);
                    if (lits.length) { tab = lits.join('|'); break; }
                  }
                }
                if (def) cands.push({ def, tab, tag, line: lineOf(c) });
              }
            }
            ts.forEachChild(c, walkC);
          };
          ts.forEachChild(n, walkC);
          if (sname === 'MainTabs') {
            for (const c of cands.filter((x) => x.tab)) {
              regs.push({ role, name: `tab:${c.tab}`, def: c.def, navFile: rel(nf), navLine: c.line });
              for (const t of c.tab.split('|')) names.add(`tab:${t}`);
            }
          } else {
            const uniq = [...new Map(cands.map((c) => [c.def.file + '#' + c.def.name, c])).values()];
            for (const c of uniq) regs.push({ role, name: uniq.length > 1 ? `${sname}:${c.tag}` : sname, def: c.def, navFile: rel(nf), navLine: c.line });
          }
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  {
    // SplashScreen is rendered by App.tsx directly (appState "checking"), not as a registered screen
    const d = defOf(join(REPO, 'provider-app/App.tsx'), 'SplashScreen');
    if (d) regs.push({ role: 'app', name: 'Splash (appState checking)', def: d, navFile: 'provider-app/App.tsx', navLine: 1 });
  }
  const validTargets = (role) => {
    const v = new Set([...navNames.get(role)].filter((x) => !x.startsWith('tab:')));
    for (const x of navExtra.get(role) || []) v.add(x);
    return v;
  };

  /* ------------------------------------------------------------ components */
  const key = (d) => `${d.file}#${d.name}`;
  const comps = new Map(); // key -> { def, regs: [] }
  for (const r of regs) {
    if (!comps.has(key(r.def))) comps.set(key(r.def), { def: r.def, regs: [] });
    comps.get(key(r.def)).regs.push(r);
  }
  const regKeys = new Set(comps.keys());

  const areaOf = (def) => {
    const f = rel(def.file);
    if (/\/screens\/auth\//.test(f) || /Registration/.test(f)) return 'auth-onboarding';
    if (/\/screens\/shared\/blueprint\//.test(f)) return 'admin-ish';
    if (/\/screens\/shared\//.test(f)) return 'shared';
    const m = f.match(/\/screens\/([^/]+)\//);
    return m ? m[1] : 'auth-onboarding';
  };
  const byName = new Map();
  for (const c of comps.values()) {
    if (!byName.has(c.def.name)) byName.set(c.def.name, []);
    byName.get(c.def.name).push(c);
  }
  for (const [n, list] of byName) {
    for (const c of list) c.route = list.length === 1 ? n : `${n} (${areaOf(c.def)}${list.filter((x) => areaOf(x.def) === areaOf(c.def)).length > 1 ? ':' + rel(c.def.file).split('/').slice(-2).join('/') : ''})`;
  }

  /* ------------------------------------------------------------ backend status */
  const statusCache = new Map();
  const statusOf = (c) => {
    const k = `${c.method} ${c.path}`;
    if (statusCache.has(k)) return statusCache.get(k);
    const m = matchRoute(be, c.method, c.path);
    const v = { status: c.partial ? 'PARTIAL' : m.status, backend: m.route?.src, note: m.status === 'WRONG_METHOD' ? `backend has ${m.methods.join(', ')}` : undefined };
    statusCache.set(k, v);
    return v;
  };

  /* ------------------------------------------------------------ unit: component + same-file helpers + child components */
  const childOk = (f) => /provider-app\/src\/(screens|components)\//.test(rel(f)) && !/\/components\/(ui|icons)\.tsx$|Platform/.test(rel(f));
  function unitParts(def, depth, seenParts) {
    const fa = analyseFile(def.file);
    const names = new Set([def.name]);
    const queue = [def.name];
    while (queue.length) {
      const n = queue.pop();
      for (const r of fa.info.get(n)?.refs || []) {
        if (names.has(r)) continue;
        if (fa.decls.has(r) && !fa.imports.has(r) && !regKeys.has(def.file + '#' + r)) { names.add(r); queue.push(r); }
      }
    }
    const parts = [{ fa, file: def.file, names: [...names], via: depth ? def.name : null }];
    if (depth < 3) {
      for (const n of names) {
        for (const r of fa.info.get(n)?.refs || []) {
          if (!fa.imports.has(r) || !/^[A-Z]/.test(r)) continue;
          const d = defOf(def.file, r);
          if (!d || d.file === def.file || !childOk(d.file) || regKeys.has(key(d)) || seenParts.has(key(d))) continue;
          seenParts.add(key(d));
          parts.push(...unitParts(d, depth + 1, seenParts));
        }
      }
    }
    return parts;
  }

  /* ------------------------------------------------------------ handler effects */
  const callIdx = new Map();
  const callsAtLine = (fa) => {
    if (!callIdx.has(fa.file)) {
      const m = new Map();
      for (const inf of [...fa.info.values(), fa.loose]) for (const c of inf.calls) { if (!m.has(c.line)) m.set(c.line, []); m.get(c.line).push(c); }
      callIdx.set(fa.file, m);
    }
    return callIdx.get(fa.file);
  };
  const NAV_FN = new Set(['go', 'onNav', 'onNavigate', 'navigate', 'navigateTo', 'nav']);
  const NATIVE = /^(Linking|Share|Clipboard|Haptics|Vibration|ImagePicker|DocumentPicker|Camera|Location|Notifications|Biometric|FileSystem|Sharing|Print|MediaLibrary|Audio|Speech|Tokens|Vault|AsyncStorage|SecureStore|Keyboard|BackHandler|LayoutAnimation|Platform)\b/;
  const newAcc = () => ({ api: [], nav: [], callbacks: new Set(), native: 0, setters: new Set(), toasts: [], logs: 0, other: 0, timeouts: 0 });
  const mergeAcc = (m, x) => {
    m.api.push(...x.api); m.nav.push(...x.nav); x.callbacks.forEach((c) => m.callbacks.add(c)); m.native += x.native;
    x.setters.forEach((c) => m.setters.add(c)); m.toasts.push(...x.toasts); m.logs += x.logs; m.other += x.other; m.timeouts += x.timeouts;
  };
  function effects(fa, node, depth, seen, acc) {
    if (!node || depth > 4 || seen.has(node)) return acc;
    seen.add(node);
    const sf = node.getSourceFile();
    const visit = (n) => {
      if (ts.isCallExpression(n)) {
        const callee = n.expression;
        const ctext = callee.getText(sf);
        const cname = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : '';
        if (isCallerCallee(callee, sf) || (ts.isIdentifier(callee) && WRAPPERS.has(callee.text))) {
          for (const c of callsAtLine(fa).get(lineOf(n)) || []) acc.api.push(c);
        } else if (/^console\./.test(ctext)) acc.logs++;
        else if (/^Alert\.(alert|prompt)$/.test(ctext) || (ts.isIdentifier(callee) && /^(show|showToast|toast|notify|showMessage|flash)$/.test(callee.text)) || /^(toast|Toast)\.\w+$/.test(ctext)) {
          acc.toasts.push(n.arguments.map((a) => a.getText(sf)).join(' ').slice(0, 160));
        } else if (NATIVE.test(ctext)) acc.native++;
        else if (ts.isIdentifier(callee) && /^set[A-Z]/.test(callee.text)) acc.setters.add(callee.text);
        else if (ts.isIdentifier(callee) && callee.text === 'setTimeout') acc.timeouts++;
        else if ((ts.isIdentifier(callee) && NAV_FN.has(cname)) || (ts.isPropertyAccessExpression(callee) && (NAV_FN.has(cname) || /^(push|replace)$/.test(cname)) && /^(navigation|nav|router|props\.navigation)$/.test(callee.expression.getText(sf)))) {
          const a0 = n.arguments[0] && unwrap(n.arguments[0]);
          const lits = [];
          const lv = (x) => { if (ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) lits.push(x.text); else if (!ts.isFunctionLike(x)) ts.forEachChild(x, lv); };
          if (a0 && !ts.isIdentifier(a0)) lv(a0);
          acc.nav.push({ fn: cname, targets: lits, line: lineOf(n), file: rel(sf.fileName) });
        } else if (ts.isPropertyAccessExpression(callee) && /^(goBack|dispatch|reset|setParams)$/.test(callee.name.text)) {
          acc.nav.push({ fn: callee.name.text, targets: [], line: lineOf(n), file: rel(sf.fileName), back: true });
        } else if (ts.isIdentifier(callee)) {
          const loc = resolveLocal(n, callee.text);
          if (loc && loc !== 'param' && isUseAuthDecl(loc)) { const cc = ctxMemberCalls(callee.text); if (cc.length) acc.api.push(...cc); else acc.callbacks.add(callee.text); }
          else if (loc === 'param' || (loc && !isFnDecl(loc))) acc.callbacks.add(callee.text);
          else if (loc) effects(fa, loc, depth + 1, seen, acc);
          else {
            const d = defOf(fa.file, callee.text);
            if (d) {
              const fa2 = analyseFile(d.file);
              for (const nd of fa2.decls.get(d.name) || []) effects(fa2, nd, depth + 1, seen, acc);
            } else acc.other++;
          }
        } else if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) {
          const root = callee.expression.text;
          let done = false;
          const loc = resolveLocal(n, root);
          if (loc === 'param' || (loc && !isFnDecl(loc))) { acc.callbacks.add(ctext); done = true; }
          else {
            const d = loc ? null : defOf(fa.file, root);
            if (d) {
              const fa2 = analyseFile(d.file);
              for (const nd of fa2.decls.get(d.name) || []) {
                const init = ts.isVariableDeclaration(nd) ? unwrap(nd.initializer) : null;
                if (init && ts.isObjectLiteralExpression(init)) {
                  const p = init.properties.find((x) => x.name && x.name.getText() === callee.name.text);
                  if (p) { effects(fa2, p, depth + 1, seen, acc); done = true; }
                }
              }
            }
          }
          if (!done) acc.other++;
        } else acc.other++;
      }
      ts.forEachChild(n, visit);
    };
    visit(node);
    return acc;
  }

  // one handler expression -> { acc, empty?, why? }
  function handlerEffects(fa, expr) {
    const e = unwrap(expr);
    const acc = newAcc();
    if (!e) return { acc, empty: true, why: 'no handler' };
    if (ts.isIdentifier(e)) {
      if (e.text === 'undefined' || /^noop$/i.test(e.text)) return { acc, empty: true, why: 'no-op handler' };
      if (/^set[A-Z]/.test(e.text)) { acc.setters.add(e.text); return { acc }; }
      const loc = resolveLocal(e, e.text);
      if (loc && loc !== 'param' && isUseAuthDecl(loc)) { const cc = ctxMemberCalls(e.text); if (cc.length) acc.api.push(...cc); else acc.callbacks.add(e.text); return { acc }; }
      if (loc === 'param' || (loc && !isFnDecl(loc))) { acc.callbacks.add(e.text); return { acc }; }
      if (loc) { effects(fa, loc, 1, new Set(), acc); return { acc }; }
      const d = defOf(fa.file, e.text);
      if (d) { const fa2 = analyseFile(d.file); for (const nd of fa2.decls.get(d.name) || []) effects(fa2, nd, 1, new Set(), acc); return { acc }; }
      acc.callbacks.add(e.text);
      return { acc };
    }
    if (ts.isConditionalExpression(e)) {
      const a = handlerEffects(fa, e.whenTrue);
      const b = handlerEffects(fa, e.whenFalse);
      const m = newAcc();
      mergeAcc(m, a.acc);
      mergeAcc(m, b.acc);
      return { acc: m, empty: a.empty && b.empty, why: a.why };
    }
    if ((ts.isArrowFunction(e) || ts.isFunctionExpression(e)) && ts.isBlock(e.body) && e.body.statements.length === 0) return { acc, empty: true, why: 'empty function body' };
    if (ts.isPropertyAccessExpression(e)) { acc.callbacks.add(e.getText()); return { acc }; }
    if (ts.isBinaryExpression(e) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(e.operatorToken.kind)) {
      const a = handlerEffects(fa, e.left);
      const b = handlerEffects(fa, e.right);
      mergeAcc(a.acc, b.acc);
      return { acc: a.acc };
    }
    effects(fa, e, 0, new Set(), acc);
    return { acc };
  }
  const SUCCESS = /success|saved|sent|done|submitted|updated|created|deleted|accepted|تم|نجاح|✓|✅/i;
  const apiSrc = (calls) => {
    const u = [...new Map(calls.map((c) => [`${c.method} ${c.path}`, c])).values()];
    return u.map((c) => `${c.method} ${c.path}`).slice(0, 3).join(', ') + (u.length > 3 ? ` +${u.length - 3}` : '');
  };
  const worstCall = (calls) => {
    for (const c of calls) {
      const s = statusOf(c);
      if (s.status !== 'OK' && s.status !== 'PARTIAL') return `${c.method} ${c.path} (${s.status}${s.note ? `: ${s.note}` : ''})`;
    }
    return null;
  };

  /* ------------------------------------------------------------ element extraction */
  const INPUT_ATTRS = ['onChange', 'onChangeText', 'onValueChange', 'onSelect', 'onToggle'];
  const INPUT_TAGS = /^(NInput|TextInput|NSearch|NPriceInput|NPhoneInput|NDropdown|NToggle|NCheckbox|NRadio|Switch|NOnlineToggle|NDatePickerSheet|NOTP)$/;
  const UI_TOKENS = new Set(['load', 'loading', 'loaded', 'saving', 'refreshing', 'refresh', 'visible', 'open', 'modal', 'tab', 'step', 'selected', 'select', 'search', 'query', 'filter', 'sheet', 'error', 'submitting', 'expanded', 'editing', 'edit', 'focus', 'busy', 'sending', 'uploading', 'verifying', 'agree', 'agreed', 'checked', 'secure', 'reveal', 'index', 'page', 'mode', 'view', 'lang', 'theme', 'toast', 'msg', 'message', 'unlocked', 'scanning', 'syncing', 'show', 'showing', 'active', 'dirty', 'done']);
  const STATE_UI = { test: (nm) => nm.replace(/([a-z0-9])([A-Z])/g, '$1_$2').split(/[_\W]+/).some((t) => UI_TOKENS.has(t.toLowerCase())) };
  const RECORD_KEYS = /^(name|name_ar|name_en|patient|patient_name|doctor|doctor_name|price|amount|total|balance|rating|date|time|phone|order_id|reference|invoice|address|city|qty|quantity|count|value|title|subtitle|customer)$/i;
  const OPTION_NAME = /option|tab|step|menu|filter|categor|type|special|day|month|countr|cit|language|reason|unit|shift|status|gender|blood|relation|role|dept|department|region|service|insurance|bank|form|field|section|icon|color|chip|quick|action|link|nav|route|screen/i;
  const PLACEHOLDER_TXT = /\b(TODO|FIXME|coming soon|lorem ipsum|not implemented|under construction|to be implemented)\b|^\s*\u0642\u0631\u064a\u0628\u0627[\u064b]?\s*[.!]?\s*$|(\u0633\u064a\u062a\u0648\u0641\u0631|\u0633\u062a\u062a\u0648\u0641\u0631|\u0645\u062a\u0648\u0641\u0631|\u0645\u062a\u0627\u062d)\s+\u0642\u0631\u064a\u0628|\u062a\u062d\u062a \u0627\u0644\u062a\u0637\u0648\u064a\u0631|\u0642\u064a\u062f \u0627\u0644\u062a\u0637\u0648\u064a\u0631/i;

  function txt(n) {
    n = unwrap(n);
    if (!n) return null;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
    if (ts.isJsxExpression(n)) return txt(n.expression);
    if (ts.isConditionalExpression(n)) {
      const a = txt(n.whenTrue);
      const b = txt(n.whenFalse);
      if (a && b) return AR_CHARS.test(a) && !AR_CHARS.test(b) ? b : a;
      return a || b;
    }
    if (ts.isTemplateExpression(n)) return n.head.text + n.templateSpans.map((s) => '{…}' + s.literal.text).join('');
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken) return (txt(n.left) || '{…}') + (txt(n.right) || '{…}');
    if (ts.isBinaryExpression(n) && (n.operatorToken.kind === ts.SyntaxKind.BarBarToken || n.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)) return txt(n.right) || txt(n.left);
    if (ts.isIdentifier(n) || ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n) || ts.isCallExpression(n)) return '{' + n.getText().replace(/\s+/g, ' ').slice(0, 30) + '}';
    return null;
  }
  const shortLabel = (s) => (s || '').replace(/\s+/g, ' ').replace(/\|/g, '/').trim().slice(0, 48);
  const attrsOf = (open) => {
    const m = new Map();
    for (const a of open.attributes.properties) if (ts.isJsxAttribute(a)) m.set(a.name.text, a.initializer);
    return m;
  };
  const exprOf = (init) => (init && ts.isJsxExpression(init) ? init.expression : init);
  function jsxLabel(el) {
    const open = ts.isJsxElement(el) ? el.openingElement : el;
    const at = attrsOf(open);
    for (const k of ['label', 'title', 'text', 'name', 'accessibilityLabel', 'placeholder', 'sub']) if (at.has(k)) { const t = txt(at.get(k)); if (t) return shortLabel(t); }
    if (ts.isJsxElement(el)) {
      const parts = [];
      const w = (c) => {
        if (ts.isJsxText(c)) { const t = c.getText().replace(/\s+/g, ' ').trim(); if (t) parts.push(t); }
        else if (ts.isJsxExpression(c)) { const t = txt(c); if (t) parts.push(t); }
        else if (ts.isJsxElement(c) || ts.isJsxFragment(c)) c.children.forEach(w);
        else if (ts.isJsxSelfClosingElement(c)) { const a2 = attrsOf(c); const ic = a2.get('icon') || a2.get('name'); const t = ic && txt(ic); if (t && !parts.length) parts.push(`[${t}]`); }
      };
      el.children.forEach(w);
      if (parts.length) return shortLabel(parts.slice(0, 2).join(' '));
    }
    for (const k of ['icon', 'testID']) if (at.has(k)) { const t = txt(at.get(k)); if (t) return `[${shortLabel(t)}]`; }
    return `<${open.tagName.getText()}>`;
  }

  function analyseUnit(c) {
    const parts = unitParts(c.def, 0, new Set([key(c.def)]));
    const elements = [];
    const navs = [];
    const ctxCalls = [];
    const add = (e) => elements.push(e);
    const seenEl = new Set();

    for (const part of parts) {
      const { fa } = part;
      const nodes = part.names.flatMap((n) => fa.decls.get(n) || []);
      const sfile = rel(part.file);
      const via = part.via;
      const stateOf = new Map();
      const jsxIds = new Set();
      const payloadIds = new Set();
      const idCount = new Map();
      const setterSites = new Map();
      const timeouts = [];
      const randoms = [];
      const arrays = [];
      const placeholders = [];
      const prices = [];
      const jsxEls = [];
      const doneState = new Set();
      const setterRefs = new Set();

      const visit = (n) => {
        if (ts.isVariableDeclaration(n) && ts.isArrayBindingPattern(n.name) && n.initializer && ts.isCallExpression(n.initializer) && /^(React\.)?useState$/.test(n.initializer.expression.getText())) {
          const [a, b] = n.name.elements;
          if (a && ts.isBindingElement(a) && ts.isIdentifier(a.name)) stateOf.set(a.name.text, { setter: b && ts.isBindingElement(b) && ts.isIdentifier(b.name) ? b.name.text : null, init: n.initializer.arguments[0] ? unwrap(n.initializer.arguments[0]) : null, line: lineOf(n) });
        }
        if (ts.isVariableDeclaration(n) && ts.isObjectBindingPattern(n.name) && isUseAuthDecl(n)) for (const nm of bindingNames(n.name, [])) ctxCalls.push(...ctxMemberCalls(nm));
        if (ts.isIdentifier(n)) {
          idCount.set(n.text, (idCount.get(n.text) || 0) + 1);
          // a setter passed as a value (`onChange={setPrice}`) is a set site too
          if (/^set[A-Z]/.test(n.text) && !(ts.isCallExpression(n.parent) && n.parent.expression === n) && !ts.isVariableDeclaration(n.parent) && !ts.isBindingElement(n.parent)) setterRefs.add(n.text);
        }
        if (ts.isJsxExpression(n) || ts.isJsxAttribute(n)) {
          const w = (x) => { if (ts.isIdentifier(x)) jsxIds.add(x.text); ts.forEachChild(x, w); };
          ts.forEachChild(n, w);
        }
        if (ts.isCallExpression(n)) {
          const callee = n.expression;
          const sf = n.getSourceFile();
          const api = isCallerCallee(callee, sf) || (ts.isIdentifier(callee) && WRAPPERS.has(callee.text)) || (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && fa.imports.has(callee.expression.text));
          if (api) { const w = (x) => { if (ts.isIdentifier(x)) payloadIds.add(x.text); ts.forEachChild(x, w); }; n.arguments.forEach(w); }
          if (ts.isIdentifier(callee) && /^set[A-Z]/.test(callee.text)) {
            // the outermost function below the component: `useEffect(() => { client.get(..).then(r => setX(..)) })` -> the effect body
            const chain = [];
            for (let a = n.parent; a; a = a.parent) if (ts.isFunctionLike(a)) chain.push(a);
            const fnNode = chain.length > 1 ? chain[chain.length - 2] : null;
            if (!setterSites.has(callee.text)) setterSites.set(callee.text, []);
            setterSites.get(callee.text).push({ fnNode, line: lineOf(n) });
          }
          if (ts.isIdentifier(callee) && callee.text === 'setTimeout') timeouts.push(n);
          if (callee.getText() === 'Math.random') randoms.push(n);
        }
        if (ts.isArrayLiteralExpression(n) && n.elements.length >= 2 && n.elements.every((x) => ts.isObjectLiteralExpression(x))) arrays.push(n);
        if (ts.isJsxText(n)) {
          const t = n.getText().trim();
          if (t) {
            if (PLACEHOLDER_TXT.test(t)) placeholders.push({ n, t });
            if (/(\b\d{2,}(?:[.,]\d+)?\s*(SAR|SR|EGP|USD)\b|\b(SAR|SR)\s*\d{2,}|\d{2,}\s*(ر\.?\s?س|ريال))/.test(t)) prices.push({ n, t });
          }
        }
        if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && PLACEHOLDER_TXT.test(n.text) && !(ts.isJsxAttribute(n.parent) && n.parent.name.text === 'placeholder')) placeholders.push({ n, t: n.text });
        if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) jsxEls.push(n);
        // data-driven menus: { screen: 'x' } / { route: 'x' } entries that a handler passes to onNavigate
        if (ts.isPropertyAssignment(n) && /^(screen|route|goto|nav|navTo)$/.test(n.name.getText()) && ts.isStringLiteral(n.initializer) && /^[a-z][a-z0-9_]*$/.test(n.initializer.text)) navs.push({ target: n.initializer.text, file: sfile, line: lineOf(n), via: 'menu entry' });
        ts.forEachChild(n, visit);
      };
      nodes.forEach(visit);

      /* state-backed data: who fills it */
      const dataFromState = (name, st, label, line) => {
        if (doneState.has(name + ':' + label)) return;
        doneState.add(name + ':' + label);
        const sites = st.setter ? setterSites.get(st.setter) || [] : [];
        const fromApi = [];
        let local = st.setter && setterRefs.has(st.setter) ? 1 : 0;
        for (const s of sites) {
          const acc = s.fnNode ? effects(fa, s.fnNode, 1, new Set(), newAcc()) : newAcc();
          if (acc.api.length) fromApi.push(...acc.api);
          else local++;
        }
        const init = st.init;
        const initEmpty = !init || init.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(init) && init.text === 'undefined') || (ts.isArrayLiteralExpression(init) && init.elements.length === 0) || (ts.isObjectLiteralExpression(init) && init.properties.length === 0);
        if (fromApi.length) {
          const bad = worstCall(fromApi);
          add({ kind: 'data', label, src: `${apiSrc(fromApi)} → ${name}`, status: bad ? 'broken' : 'ok', file: sfile, line, via, note: bad ? `${label} is filled from ${bad}.` : null });
        } else if (sites.length && local) add({ kind: 'data', label, src: `${name}: set from user input / local logic`, status: 'ok', file: sfile, line, via, note: null });
        else if (!sites.length && !local && initEmpty) add({ kind: 'data', label, src: `${name}: never set, always empty`, status: 'not wired', file: sfile, line, via, note: `${label} (${name}) is never filled by any code, so it is always empty.` });
        else if (!sites.length && !local) add({ kind: 'data', label, src: `${name}: constant ${shortLabel(init.getText())}`, status: 'mock', file: sfile, line, via, note: `${label} (${name}) always shows its initial literal value.` });
      };
      const listed = new Set();
      const listOrData = (rn, label, line) => {
        listed.add(rn);
        const st = rn && stateOf.get(rn);
        if (!st) { add({ kind: 'data', label, src: `from ${rn || 'expression'} (prop / derived; not traced)`, status: 'ok', file: sfile, line, via, note: null, untraced: true }); return; }
        dataFromState(rn, st, label, line);
      };

      /* hard-coded record arrays, placeholders, prices, random, fake delays */
      for (const arr of arrays) {
        let nameOf = null;
        for (let a = arr.parent; a; a = a.parent) {
          if (ts.isVariableDeclaration(a) && ts.isIdentifier(a.name)) { nameOf = a.name.text; break; }
          if (ts.isCallExpression(a) && /useState$/.test(a.expression.getText())) { nameOf = '(useState)'; break; }
          if (ts.isJsxAttribute(a)) { nameOf = `(${a.name.text} prop)`; break; }
          if (ts.isFunctionLike(a)) break;
        }
        const first = arr.elements[0];
        const keys = first.properties.filter((p) => ts.isPropertyAssignment(p) && p.name && RECORD_KEYS.test(p.name.getText()) && (ts.isStringLiteral(p.initializer) || ts.isNumericLiteral(p.initializer) || ts.isNoSubstitutionTemplateLiteral(p.initializer)));
        const mockName = nameOf && /mock|demo|dummy|fake|lorem|^sample(_?data)?$/i.test(nameOf);
        const recordLike = keys.length >= 2 && !(nameOf && OPTION_NAME.test(nameOf)) && first.properties.length >= 3;
        if (!mockName && !recordLike) continue;
        const used = nameOf === '(useState)' || mockName || (nameOf && jsxIds.has(nameOf));
        if (!used) continue;
        add({ kind: 'data', label: `Hard-coded list ${nameOf || ''}`.trim(), src: `${arr.elements.length} literal records in the client`, status: 'mock', file: sfile, line: lineOf(arr), via, note: `Hard-coded ${arr.elements.length}-record list ${nameOf || ''} is shown as data.` });
      }
      for (const { n, t } of placeholders) add({ kind: 'text', label: `Text "${shortLabel(t)}"`, src: 'placeholder text', status: 'placeholder', file: sfile, line: lineOf(n), via, note: `Placeholder text "${shortLabel(t)}" is shown to the provider.` });
      for (const { n, t } of prices) add({ kind: 'number', label: `Price text "${shortLabel(t)}"`, src: 'literal in JSX', status: 'mock', file: sfile, line: lineOf(n), via, note: `Hard-coded amount "${shortLabel(t)}" is written in the screen.` });
      for (const r of randoms) {
        let nm = null;
        for (let a = r.parent; a; a = a.parent) { if (ts.isVariableDeclaration(a) && ts.isIdentifier(a.name)) { nm = a.name.text; break; } if (ts.isPropertyAssignment(a)) { nm = a.name.getText(); break; } if (ts.isFunctionLike(a)) break; }
        if (nm && /id$|key|ref|code|nonce|token|uuid|idem|otp|filename|name$/i.test(nm)) continue;
        add({ kind: 'number', label: `Math.random() ${nm || ''}`.trim(), src: 'client-generated random value', status: 'mock', file: sfile, line: lineOf(r), via, note: `Math.random() makes a value${nm ? ` (${nm})` : ''} that is not from the backend.` });
      }
      for (const t of timeouts) {
        let fnNode = null;
        for (let a = t.parent; a; a = a.parent) if (ts.isFunctionLike(a) && a !== t.arguments[0]) { fnNode = a; break; }
        const cb = t.arguments[0] && unwrap(t.arguments[0]);
        const cbAcc = newAcc();
        if (cb && (ts.isArrowFunction(cb) || ts.isFunctionExpression(cb))) effects(fa, cb, 1, new Set(), cbAcc);
        const hasUi = [...cbAcc.setters].some((s) => /load|sav|submit|send|success|done|process|sync|fetch|verif|upload|complete|finish|result/i.test(s)) || cbAcc.toasts.some((x) => SUCCESS.test(x));
        if (!hasUi) continue;
        const outer = fnNode ? effects(fa, fnNode, 1, new Set(), newAcc()) : newAcc();
        if (outer.api.length) continue;
        add({ kind: 'handler', label: 'setTimeout fake delay', src: 'timer then success / loading state, no request in the same function', status: 'mock', file: sfile, line: lineOf(t), via, note: 'A setTimeout fakes the work (no request in the same function).' });
      }

      /* elements */
      for (const open of jsxEls) {
        const tag = open.tagName.getText();
        const at = attrsOf(open);
        const holder = ts.isJsxOpeningElement(open) ? open.parent : open;
        const elLine = lineOf(open);
        const dedupe = (k) => { const kk = `${sfile}:${elLine}:${k}`; if (seenEl.has(kk)) return true; seenEl.add(kk); return false; };

        if (at.has('onPress') && !/^(Modal|ScrollView|View|NSheet)$/.test(tag)) {
          if (dedupe('b')) continue;
          const label = jsxLabel(holder);
          const hx = handlerEffects(fa, exprOf(at.get('onPress')));
          const a = hx.acc;
          const calls = [...new Map(a.api.map((x) => [`${x.method} ${x.path}`, x])).values()];
          let status = 'ok';
          let src;
          let note = null;
          for (const nv of a.nav) for (const t of nv.targets) navs.push({ target: t, file: nv.file, line: nv.line, via: label });
          const tg = a.nav.flatMap((x) => x.targets);
          const missing = [];
          for (const t of tg) {
            const bad = [...new Set(c.regs.map((r) => r.role))].filter((role) => !validTargets(role).has(t));
            if (bad.length) missing.push(`${t} (${bad.join('/')})`);
          }
          const hasOther = a.nav.length || a.callbacks.size || a.native || a.other;
          if (hx.empty) { status = 'dead'; src = hx.why; note = `Button "${label}" has ${hx.why}.`; }
          else if (calls.length) {
            const bad = worstCall(calls);
            src = apiSrc(calls);
            if (bad) { status = 'broken'; note = `Button "${label}" sends ${bad}.`; }
            else if (missing.length) { status = 'broken'; src += `; navigate → ${tg.join(', ')}`; note = `Button "${label}" navigates to screen(s) its navigator does not register: ${missing.join(', ')}.`; }
          } else if (missing.length) {
            status = 'broken'; src = `navigate → ${tg.join(', ')}`;
            note = `Button "${label}" navigates to screen(s) its navigator does not register: ${missing.join(', ')}.`;
          } else if (hasOther || a.setters.size) {
            const succ = a.toasts.some((x) => SUCCESS.test(x));
            if (a.toasts.length && !hasOther && (succ || !a.setters.size)) {
              status = 'not wired';
              src = succ ? 'fake success: toast / Alert after local state only, no request' : 'Alert / toast only, no request';
              note = `Button "${label}" ${succ ? 'shows a success message' : 'only shows a message'} without sending a request.`;
            } else src = tg.length ? `navigate → ${[...new Set(tg)].join(', ')}` : a.nav.length ? 'navigate (back / dynamic target)' : a.callbacks.size ? `parent callback ${[...a.callbacks].slice(0, 2).join(', ')}` : a.native ? 'native action' : a.setters.size ? `local state ${[...a.setters].slice(0, 2).join(', ')}` : 'local logic';
          } else if (a.toasts.length) {
            const succ = a.toasts.some((x) => SUCCESS.test(x));
            status = 'not wired';
            src = succ ? 'fake success: toast / Alert only, no request' : 'Alert / toast only, no request';
            note = `Button "${label}" ${succ ? 'shows a success message' : 'only shows a message'} without sending a request.`;
          } else if (a.logs) { status = 'dead'; src = 'console.log only'; note = `Button "${label}" only writes to the console.`; }
          else { status = 'dead'; src = 'handler does nothing'; note = `Button "${label}" handler has no effect.`; }
          add({ kind: 'button', label, src, status, file: sfile, line: lineOf(at.get('onPress')), via, note });
          continue;
        }

        if (/^(TouchableOpacity|TouchableHighlight|Pressable)$/.test(tag) && !at.has('onPress') && !at.has('onLongPress') && !at.has('onPressIn') && !at.has('disabled') && !at.has('pointerEvents')) {
          if (dedupe('d')) continue;
          const label = jsxLabel(ts.isJsxOpeningElement(open) ? open.parent : open);
          add({ kind: 'button', label, src: 'no onPress handler', status: 'dead', file: sfile, line: elLine, via, note: `Touchable "${label}" has no onPress handler.` });
          continue;
        }

        const inAttr = INPUT_ATTRS.find((k) => at.has(k));
        if (inAttr && INPUT_TAGS.test(tag)) {
          if (dedupe('i')) continue;
          const label = jsxLabel(holder);
          const ve = exprOf(at.get('value')) || exprOf(at.get('selected')) || exprOf(at.get('otp'));
          let root = ve;
          while (root && (ts.isPropertyAccessExpression(root) || ts.isElementAccessExpression(root) || ts.isCallExpression(root) || ts.isNonNullExpression(root) || ts.isParenthesizedExpression(root) || ts.isBinaryExpression(root))) root = ts.isBinaryExpression(root) ? root.left : root.expression;
          const rn = root && ts.isIdentifier(root) ? root.text : null;
          const ch = handlerEffects(fa, exprOf(at.get(inAttr)));
          let status = 'ok';
          let src;
          let note = null;
          if (ch.acc.api.length) src = `user input → ${apiSrc(ch.acc.api)}`;
          else if (rn && payloadIds.has(rn)) src = `user input → ${rn} → request body`;
          else if (ch.empty) { status = 'dead'; src = 'input has no handler'; note = `Input "${label}" has ${ch.why}.`; }
          else if (rn && stateOf.has(rn) && (idCount.get(rn) || 0) <= 2 && !ch.acc.callbacks.size && !ch.acc.api.length && !ch.acc.nav.length && !ch.acc.native && !ch.acc.other) { status = 'not wired'; src = `user input → ${rn}, value never read`; note = `Input "${label}" value (${rn}) is never used by a request or any logic.`; }
          else src = ch.acc.callbacks.size ? `user input → parent callback ${[...ch.acc.callbacks][0]}` : `user input → ${rn || 'state'} (local)`;
          add({ kind: 'input', label, src, status, file: sfile, line: elLine, via, note });
          continue;
        }

        if (tag === 'NStatCard') {
          if (dedupe('s')) continue;
          const label = jsxLabel(holder);
          const ve = exprOf(at.get('value'));
          const lit = ve && (ts.isStringLiteral(ve) || ts.isNumericLiteral(ve) || ts.isNoSubstitutionTemplateLiteral(ve));
          let status = 'ok';
          let src = ve ? `value ← ${shortLabel(ve.getText())}` : 'no value';
          let note = null;
          if (lit && /\d/.test(ve.getText()) && !/^['"`]?[-—–0٠]['"`]?$/.test(ve.getText())) { status = 'mock'; src = `literal ${ve.getText()}`; note = `Stat card "${label}" shows the literal ${ve.getText()}.`; }
          add({ kind: 'number', label: `Stat: ${label}`, src, status, file: sfile, line: elLine, via, note });
          continue;
        }

        if (/^(FlatList|SectionList)$/.test(tag) && at.has('data')) {
          if (dedupe('l')) continue;
          const de = exprOf(at.get('data'));
          const rn = de && /^[A-Za-z_$][\w$]*/.exec(de.getText())?.[0];
          listOrData(rn, `List ${shortLabel(de?.getText() || '')}`, elLine);
        }
      }
      /* .map lists rendered in JSX */
      const mapVisit = (n) => {
        if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'map' && n.arguments[0] && (ts.isArrowFunction(n.arguments[0]) || ts.isFunctionExpression(n.arguments[0]))) {
          let inJsx = false;
          for (let a = n.parent; a; a = a.parent) { if (ts.isJsxExpression(a)) { inJsx = true; break; } if (ts.isFunctionLike(a)) break; }
          let hasJsx = false;
          const w = (x) => { if (ts.isJsxElement(x) || ts.isJsxSelfClosingElement(x) || ts.isJsxFragment(x)) hasJsx = true; else ts.forEachChild(x, w); };
          w(n.arguments[0].body);
          if (inJsx && hasJsx) {
            const rtxt = n.expression.expression.getText().replace(/\s+/g, ' ');
            const rn = /^[A-Za-z_$][\w$]*/.exec(rtxt)?.[0];
            const k = `${sfile}:${lineOf(n)}:m`;
            if (rn && !rtxt.startsWith('[') && !seenEl.has(k)) { seenEl.add(k); listOrData(rn, `List ${shortLabel(rtxt)}`, lineOf(n)); }
          }
        }
        ts.forEachChild(n, mapVisit);
      };
      nodes.forEach(mapVisit);
      /* scalar / object state shown in JSX */
      for (const [name, st] of stateOf) {
        if (!jsxIds.has(name) || STATE_UI.test(name)) continue;
        const init = st.init;
        if (init && ts.isArrayLiteralExpression(init) && listed.has(name)) continue; // lists: through .map / FlatList
        const dataLike = !init || ts.isArrayLiteralExpression(init) || ts.isObjectLiteralExpression(init) || init.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(init) && init.text === 'undefined') || ((ts.isNumericLiteral(init) || ts.isStringLiteral(init)) && /count|total|balance|amount|price|rating|revenue|earn|stat|number|sum/i.test(name));
        if (dataLike) dataFromState(name, st, `Data ${name}`, st.line);
      }
    }
    const ranges = parts.map((pt) => ({ file: pt.file, via: pt.via, ranges: pt.names.flatMap((n) => (pt.fa.decls.get(n) || []).map((nd) => [lineOf(nd), nd.getSourceFile().getLineAndCharacterOfPosition(nd.getEnd()).line + 1])) }));
    return { elements, navs, ctxCalls, ranges };
  }

  /* ------------------------------------------------------------ rows */
  const rows = [];
  const elementsOut = {};
  const unitsByRoute = new Map();
  for (const c of comps.values()) {
    const cl = closure(APP, c.def.file, c.def.name);
    const un = analyseUnit(c);
    const merged = [...new Map([...cl.calls, ...un.ctxCalls].map((x) => [`${x.method} ${x.path}`, x])).values()];
    const calls = merged.map((x) => {
      const s = statusOf(x);
      return { ...x, status: s.status, ...(s.backend ? { backend: s.backend } : {}), ...(s.note ? { note: s.note } : {}) };
    });
    calls.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
    const declN = analyseFile(c.def.file).decls.get(c.def.name)?.[0];
    const navIssues = [];
    for (const nv of un.navs) {
      const bad = [...new Set(c.regs.map((r) => r.role))].filter((role) => !validTargets(role).has(nv.target));
      if (bad.length) navIssues.push({ target: nv.target, roles: bad, file: nv.file, line: nv.line, via: nv.via });
    }
    rows.push({
      app: APP, route: c.route, component: c.def.name, area: areaOf(c.def), file: rel(c.def.file), line: declN ? lineOf(declN) : 1,
      registrations: c.regs.map((r) => ({ role: r.role, name: r.name, file: r.navFile, line: r.navLine })),
      template: 'n/a', board: '— (not redesigned)', batch: 'provider', status: 'not redesigned',
      calls, files: cl.files, unresolved: cl.unresolved, navIssues,
    });
    elementsOut[c.route] = un.elements;
    unitsByRoute.set(c.route, un.ranges);
  }
  rows.sort((a, b) => a.area.localeCompare(b.area) || a.route.localeCompare(b.route));

  // generic mock scan (tools/design/mock-scan.mjs) over every provider source file, attributed to the screens whose unit holds the line
  const MOCK_STATUS = { 'math-random': 'mock', 'mock-name': 'mock', 'hardcoded-data': 'mock', 'fake-number': 'mock', 'dummy-value': 'mock', 'placeholder-text': 'placeholder', 'fake-success': 'not wired' };
  const scanFiles = walk(srcRoot, (p) => /\.tsx?$/.test(p) && !/\.test\./.test(p)).map((p) => ({ rel: rel(p), app: APP, src: read(p) }));
  const scanned = h.scanMock(ts, scanFiles).filter((f) => MOCK_STATUS[f.category]);
  const OVR = h.overrides || {};
  for (const c of comps.values()) {
    const route = c.route;
    const un = unitsByRoute.get(route);
    for (const f of scanned) {
      const part = un.find((p) => rel(p.file) === f.file && p.ranges.some(([a, b]) => f.line >= a && f.line <= b));
      if (!part) continue;
      if (elementsOut[route].some((e) => e.file === f.file && e.line === f.line && e.status !== 'ok')) continue;
      elementsOut[route].push({ kind: 'text', label: `${f.category}: ${f.snippet}`.slice(0, 70), src: `mock-scan ${f.category}`, status: MOCK_STATUS[f.category], file: f.file, line: f.line, via: part.via, note: `${f.category} (mock-scan): ${f.snippet}`.slice(0, 160) });
    }
  }
  // reviewed false positives: docs/design/inventory/provider-audit-overrides.json  { "file:line": { "status": "ok", "reason": "..." } }
  for (const route of Object.keys(elementsOut)) {
    for (const e of elementsOut[route]) {
      const o = OVR[`${e.file}:${e.line}`];
      if (o && e.status !== 'ok') { e.reviewed = o.reason; e.status = o.status || 'ok'; e.note = null; }
    }
    elementsOut[route].sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line));
  }

  const unresolvedSites = [...h.UNRESOLVED_SITES.values()].filter((u) => u.file.startsWith('provider-app'));
  const wrapperSites = [...h.WRAPPER_SITES.values()].filter((u) => u.file.startsWith('provider-app'));

  /* ------------------------------------------------------------ render */
  const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');
  const code = (s) => '`' + String(s).replace(/`/g, "'") + '`';
  const AREAS = ['auth-onboarding', 'doctor', 'pharmacy', 'lab', 'radiology', 'nursing', 'facility', 'shared', 'admin-ish', 'ambulance'];
  const nm = (calls, s) => calls.filter((c) => c.status === s).length;

  const inv = [];
  inv.push('# Provider app inventory', '');
  inv.push(`> Generated by \`node tools/design/screen-inventory.mjs\` at commit \`${commit}\`. Do not edit by hand. The provider app is NOT redesigned (owner rule); this is a read-only wiring audit.`, '');
  inv.push('Screens are React Navigation screens (not expo-router files). A **screen** is a component that a navigator renders (`<Stack.Screen name>` or a tab of `MainTabs`); the same component in several navigators is one row. Registrations come from `App.tsx` (role `app`) and the navigator file of each role. `Area` groups screens by who uses them (`admin-ish` = `shared/blueprint/*`: promotions, CRM, ads, affiliate, revenue, referral tools).', '');
  inv.push('| Area | Screens | With API calls | No API call | Endpoint pairs |', '|---|---|---|---|---|');
  for (const a of AREAS) {
    const rs = rows.filter((r) => r.area === a);
    inv.push(`| ${a} | ${rs.length} | ${rs.filter((r) => r.calls.length).length} | ${rs.filter((r) => !r.calls.length).length} | ${rs.reduce((s, r) => s + r.calls.length, 0)} |`);
  }
  inv.push(`| **total** | ${rows.length} | ${rows.filter((r) => r.calls.length).length} | ${rows.filter((r) => !r.calls.length).length} | ${rows.reduce((s, r) => s + r.calls.length, 0)} |`, '');
  inv.push(`Navigators: ${[...navNames.keys()].map((k) => `${k} (${navNames.get(k).size} names)`).join(', ')}. Registrations: ${regs.length}.`, '');
  for (const a of AREAS) {
    const rs = rows.filter((r) => r.area === a);
    if (!rs.length) continue;
    inv.push(`## ${a}`, '', '| Screen | File | Registered as | API |', '|---|---|---|---|');
    for (const r of rs) {
      const reg = [...new Set(r.registrations.map((x) => `${x.role}:${x.name}`))];
      const shown = r.calls.slice(0, 8).map((c) => `\`${c.method} ${c.path}\``);
      inv.push(`| \`${esc(r.route)}\` | \`${esc(r.file)}:${r.line}\` | ${esc(reg.slice(0, 4).join(', '))}${reg.length > 4 ? ` +${reg.length - 4}` : ''} | ${shown.join('<br>') || '—'}${r.calls.length > 8 ? ` +${r.calls.length - 8} more` : ''} |`);
    }
    inv.push('');
  }

  const allPairs = rows.flatMap((r) => r.calls.map((c) => ({ ...c, screen: r.route })));
  const uniqPairs = [...new Map(allPairs.map((c) => [`${c.method} ${c.path}`, c])).values()];
  const navBad = rows.flatMap((r) => r.navIssues.map((n) => ({ ...n, screen: r.route })));
  const wr = [];
  wr.push('# Provider wiring report: screens and API', '');
  wr.push(`> Generated by \`node tools/design/screen-inventory.mjs\` at commit \`${commit}\`. Do not edit by hand. Read-only audit: nothing here was fixed.`, '');
  wr.push(`- **Screens:** ${rows.length}; **with API calls:** ${rows.filter((r) => r.calls.length).length}; **with no API call:** ${rows.filter((r) => !r.calls.length).length}.`);
  wr.push(`- **Endpoint pairs (screen x endpoint):** ${allPairs.length}; **distinct endpoints:** ${uniqPairs.length}: OK ${nm(uniqPairs, 'OK')}, WRONG_METHOD ${nm(uniqPairs, 'WRONG_METHOD')}, NO_ROUTE ${nm(uniqPairs, 'NO_ROUTE')}, PARTIAL ${nm(uniqPairs, 'PARTIAL')}.`);
  wr.push(`- **Unresolved calls (built from variables):** ${rows.reduce((s, r) => s + r.unresolved, 0)} (summed over screen closures); distinct sites: ${unresolvedSites.length}. Generic wrapper sites attributed at their callers: ${wrapperSites.length}.`);
  wr.push(`- **Navigation targets not registered by the navigator:** ${navBad.length}.`);
  wr.push('- Matching: method + path against the Nest controllers (`tools/audit/routes.py`); `:param` matches any segment. The axios base is `/api/v1`, so `/provider/x` means `/api/v1/provider/x`. Request bodies and response fields are NOT compared with DTOs (runtime shapes: `audit/runtime-provider-*.md`).', '');
  wr.push('## 1. Endpoints that do not match a backend route', '');
  const bad = uniqPairs.filter((c) => c.status !== 'OK');
  if (!bad.length) wr.push('None.', '');
  else {
    wr.push('| Status | Call | Screens | Where | Note |', '|---|---|---|---|---|');
    for (const c of bad.sort((a, b) => a.status.localeCompare(b.status) || a.path.localeCompare(b.path))) {
      const scr = [...new Set(allPairs.filter((x) => x.method === c.method && x.path === c.path).map((x) => x.screen))];
      wr.push(`| ${c.status} | \`${c.method} ${esc(c.path)}\` | ${esc(scr.slice(0, 4).join(', '))}${scr.length > 4 ? ` +${scr.length - 4}` : ''} | \`${c.file}:${c.line}\` | ${esc(c.note || '')} |`);
    }
    wr.push('');
  }
  wr.push('## 2. Navigation targets that the navigator does not register', '');
  if (!navBad.length) wr.push('None.', '');
  else {
    wr.push('A string target of `go(...)` / `onNavigate(...)` / `onNav(...)` / `navigation.navigate(...)` that is not a `<Stack.Screen name>` of the role(s) registering the screen (tab keys count only where the navigator forwards them to its tab state, as the doctor navigator does). React Navigation logs "action NAVIGATE was not handled" and nothing happens.', '', '| Screen | Target | Missing in | Where |', '|---|---|---|---|');
    for (const n of navBad.sort((a, b) => a.screen.localeCompare(b.screen) || a.target.localeCompare(b.target))) wr.push(`| ${esc(n.screen)} | \`${esc(n.target)}\` | ${n.roles.join(', ')} | \`${n.file}:${n.line}\` |`);
    wr.push('');
  }
  wr.push('## 3. Screens with no API call', '');
  const none = rows.filter((r) => !r.calls.length);
  wr.push(none.length ? none.map((r) => `- \`${r.route}\` (${r.area}, \`${r.file}:${r.line}\`)`).join('\n') : 'None.', '');
  wr.push('## 4. Endpoint list per screen', '', '| Screen | Area | Endpoint | Status | Backend |', '|---|---|---|---|---|');
  for (const r of rows) for (const c of r.calls) wr.push(`| ${esc(r.route)} | ${r.area} | \`${c.method} ${esc(c.path)}\` | ${c.status} | ${c.backend ? `\`${c.backend}\`` : '—'} |`);
  wr.push('', '## 5. Calls built from variables', '');
  wr.push('Wrapper sites (a function forwarding its own parameter to the HTTP client; the path is attributed at each caller):', wrapperSites.length ? wrapperSites.map((w) => `- ${code(w.file + ':' + w.line)} in ${code(w.fn)}`).join('\n') : 'None.', '');
  wr.push('Still unresolved:', unresolvedSites.length ? unresolvedSites.map((u) => `- ${code(u.file + ':' + u.line)} ${code(u.call)}`).join('\n') : 'None.', '');
  wr.push('## 6. Needs review', '', 'The provider Needs-review lines are in `docs/design/needs-review/provider-*.json`, the per-area element audits in `docs/design/audit/provider-*.md`, and the roll-up is `docs/design/PROVIDER_AUDIT_SUMMARY.md`.', '');

  console.log(`provider-app: ${rows.length} screens (${regs.length} registrations), ${allPairs.length} endpoint pairs, ${uniqPairs.length} distinct: OK ${nm(uniqPairs, 'OK')}, NO_ROUTE ${nm(uniqPairs, 'NO_ROUTE')}, WRONG_METHOD ${nm(uniqPairs, 'WRONG_METHOD')}; bad nav targets ${navBad.length}; unresolved sites ${unresolvedSites.length}`);
  return {
    'docs/design/PROVIDER_INVENTORY.md': inv.join('\n') + '\n',
    'docs/design/PROVIDER_WIRING_REPORT.md': wr.join('\n') + '\n',
    'docs/design/inventory/provider-screens.json': JSON.stringify({ commit, routes: rows }, null, 1) + '\n',
    'docs/design/inventory/provider-elements.json': JSON.stringify({ commit, screens: elementsOut }, null, 1) + '\n',
  };
}
