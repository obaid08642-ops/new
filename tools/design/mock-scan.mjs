/**
 * Mock / placeholder scanner for the wiring report (docs/design/WIRING_REPORT.md, "Mock / placeholder found").
 *
 * HEURISTIC. It reads the TypeScript AST of the screen sources and of the components they own and reports
 * code that looks like fake data or a dead control. It cannot know intent: every hit is a lead to check,
 * not a verdict. Precision is preferred to volume: each pattern was sampled on real hits and tightened.
 *
 * Categories (id -> what it finds):
 *   dead-button      a Pressable / TouchableOpacity / Button / <button> / <a> with no onPress/onClick/href,
 *                    `href="#"`, or a handler that does nothing (`() => {}`, `noop`, console.log only)
 *   fake-success     `setTimeout(() => setConfirmed(...))` in a handler that makes no API call: a booking "confirmed" by a timer
 *   math-random      `Math.random()` outside id/key/jitter generation (a value that could be shown)
 *   mock-name        a constant, property or function named mock/sample/dummy/fake/stub/lorem/demo that holds data
 *   hardcoded-data   an array of >= 2 object literals carrying price/rating/distance/fee-like fields with literal values
 *   fake-number      a literal number given to a rating/reviews/price/distance/stock/points/eta prop, or "4.8 ★" text
 *   dummy-value      a string that looks like a dummy value: "John Doe", lorem ipsum, 0500000000, test@example.com, ...
 *   placeholder-text TODO/FIXME/TBD/dummy/coming-soon text in a string or JSX text that can reach the screen
 *   todo-comment     a TODO/FIXME/HACK/XXX/stub/"not implemented"/"requires backend" comment (developer-facing; the repo rules forbid TODO stubs)
 *
 * Ignored: tests and fixtures (__tests__, tests/, *.test.*, *.spec.*, __mocks__), node_modules, generated mirrors
 * (patient-web/components-next/ui-generated), i18n dictionaries, .d.ts, and `placeholder=` attributes/props
 * (an input hint is not mock data), console.* arguments and thrown error messages.
 */

export const CATEGORIES = [
  ['dead-button', 'Dead buttons and links'],
  ['fake-success', 'Simulated success (a timer confirms, no API call)'],
  ['math-random', 'Math.random (value-like)'],
  ['mock-name', 'Mock / sample / dummy / fake / demo constants'],
  ['hardcoded-data', 'Hard-coded data arrays (price / rating / distance / fee fields)'],
  ['fake-number', 'Hard-coded ratings, review counts, prices, distances'],
  ['dummy-value', 'Dummy-looking values (names, phones, emails, lorem)'],
  ['placeholder-text', 'TODO / dummy / coming-soon text shown to users'],
  ['todo-comment', 'TODO / FIXME / stub comments (developer-facing)'],
];

const PRESSABLE = new Set(['Pressable', 'TouchableOpacity', 'TouchableHighlight', 'TouchableNativeFeedback', 'Button', 'button', 'a', 'IconButton', 'PrimaryButton', 'OutlineButton']);
const HANDLER_ATTRS = new Set(['onPress', 'onClick', 'onPressIn', 'onPressOut', 'onLongPress', 'href', 'to', 'onSubmit', 'asChild']);
const CLICK_ATTRS = new Set(['onPress', 'onClick', 'onLongPress']);
const MOCK_WORDS = new Set(['mock', 'mocks', 'dummy', 'fake', 'stub', 'stubs', 'lorem', 'demo']);
// "sample" alone is also lab samples and sampleRate: it only counts next to a data word (sampleDoctors, SAMPLE_DATA)
const DATA_WORDS = new Set(['data', 'item', 'items', 'list', 'user', 'users', 'doctor', 'doctors', 'product', 'products', 'order', 'orders', 'medicine', 'medicines', 'patient', 'patients', 'review', 'reviews', 'result', 'results', 'response']);
const ENTITY_KEYS = new Set(['price', 'rating', 'reviews', 'reviewcount', 'reviews_count', 'distance', 'fee', 'consultation_fee', 'amount', 'total', 'balance', 'points', 'eta', 'stock', 'phone', 'email', 'age', 'rating_count', 'experience', 'years', 'discount', 'original_price']);
// keys whose literal fallback is a made-up statistic (`rating: typeof x === "number" ? x : 4.9`)
const FALLBACK_KEYS = new Set(['rating', 'reviews', 'reviewcount', 'review_count', 'reviewscount', 'rating_count', 'ratingcount', 'price', 'distance', 'stock', 'points', 'eta', 'balance', 'discount', 'consultation_fee', 'consultationfee', 'fee', 'experience', 'years_experience', 'yearsexperience', 'defaultcopay', 'maxcopaysar', 'copay', 'copay_percent', 'copaypercent']);
const NUMERIC_PROPS = new Set(['rating', 'reviews', 'reviewcount', 'reviewscount', 'ratingcount', 'price', 'distance', 'stock', 'points', 'eta', 'balance', 'discount', 'consultationfee', 'fee']);
const DUMMY_RES = [
  /\b(john|jane) (doe|smith)\b/i,
  /lorem ipsum/i,
  /\b(foo|baz)\s*bar\b/i,
  /@example\.(com|org|net)\b/i,
  /\b(test|demo|dummy|fake)@/i,
  /\b(?:0|\+?966)?5(?:0000000|1234567|5555555|1111111)\d?\b/,
  /\b(?:1234567890|0000000000|1111111111|0123456789|9876543210)\b/,
  /\b(test|dummy|fake|sample) (user|patient|doctor|pharmacy|name)\b/i,
  /(مستخدم|اسم|مريض|طبيب|صيدلية) (تجريبي|وهمي|تجريبية)/,
  /(بيانات|نص) (وهمية|تجريبية|وهمي)/,
];
const PLACEHOLDER_RES = [
  /\b(TODO|FIXME|TBD|XXX)\b/,
  /\bdummy\b/i,
  /lorem ipsum/i,
  /\bcoming soon\b/i,
  /\bunder construction\b/i,
  /\bnot (yet )?implemented\b/i,
  /^[\s.!…\-—]*(\S+\s+){0,3}(قريباً|قريبا)[\s.!…]*$/, // "قريباً" / "ستتوفر قريباً": a coming-soon label, not "we will contact you soon"
  /قيد (التطوير|الإنشاء|الإعداد)/,
];

const IGNORE_PATH = [
  /(^|\/)(node_modules|__tests__|__mocks__|tests?|fixtures?|e2e|\.next|dist|build)\//,
  /\.(test|spec|stories)\.[jt]sx?$/,
  /\.d\.ts$/,
  /^patient-web\/components-next\/ui-generated\//,
  /(^|\/)(i18n|messages|locales?|translations?)\//,
  /(^|\/)(autoTranslations|translations)[^/]*\.[jt]sx?$/,
];

export function isScanned(relPath) {
  return /\.(tsx?|jsx?)$/.test(relPath) && !IGNORE_PATH.some((re) => re.test(relPath));
}

const words = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').split(/[_\-$]+/).filter(Boolean).map((w) => w.toLowerCase());
const hasMockWord = (name) => {
  const w = words(name);
  return w.some((x) => MOCK_WORDS.has(x)) || (w.some((x) => x === 'sample' || x === 'samples') && w.some((x) => DATA_WORDS.has(x)));
};
const oneLine = (s, n = 110) => {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};

/**
 * @param ts       the typescript module
 * @param files    [{ file: absolute path, rel: repo-relative path, app: 'patient-app'|'patient-web', src: text }]
 * @returns        [{ app, category, sub?, file, line, snippet }]
 */
export function scanMock(ts, files) {
  const out = [];
  for (const { rel, app, src } of files) {
    const sf = ts.createSourceFile(rel, src, ts.ScriptTarget.Latest, true, /x$/.test(rel) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const add = (category, node, snippet, sub, group) => {
      const pos = typeof node === 'number' ? node : node.getStart(sf);
      out.push({ app, category, ...(sub ? { sub } : {}), ...(group ? { group } : {}), file: rel, line: sf.getLineAndCharacterOfPosition(pos).line + 1, snippet: oneLine(snippet) });
    };
    const text = (n) => n.getText(sf);
    const ancestors = (n) => {
      const a = [];
      for (let p = n.parent; p; p = p.parent) a.push(p);
      return a;
    };
    const jsxName = (n) => (ts.isJsxElement(n) ? n.openingElement.tagName.getText(sf) : n.tagName.getText(sf));
    const attrsOf = (n) => (ts.isJsxElement(n) ? n.openingElement : n).attributes.properties;
    const attrName = (a) => (ts.isJsxAttribute(a) ? a.name.getText(sf) : '');
    const attrExpr = (a) => {
      const i = a.initializer;
      return i && ts.isJsxExpression(i) ? i.expression : i;
    };
    const unwrap = (e) => {
      while (e && (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e))) e = e.expression;
      return e;
    };
    // the visible label of a control: its `label=` string or its first text child
    const labelOf = (n) => {
      const l = attrsOf(n).find((a) => ts.isJsxAttribute(a) && /^(label|title|accessibilityLabel|aria-label)$/.test(attrName(a)));
      const e = l && unwrap(attrExpr(l));
      if (e && (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e))) return `"${e.text}"`;
      if (ts.isJsxElement(n)) {
        const t = n.getText(sf).match(/>\s*([^<>{}\s][^<>{}\n]{1,39}?)\s*</);
        if (t) return `"${t[1]}"`;
      }
      return '';
    };
    // a handler that does nothing
    const emptyHandler = (e) => {
      e = unwrap(e);
      if (!e) return false;
      if (ts.isIdentifier(e)) return e.text === 'undefined' || /^(noop|nop|emptyFn|doNothing)$/.test(e.text);
      if (e.kind === ts.SyntaxKind.NullKeyword) return true;
      if (ts.isArrowFunction(e) || ts.isFunctionExpression(e)) {
        const b = e.body;
        if (!ts.isBlock(b)) {
          const x = unwrap(b);
          if (ts.isIdentifier(x) && x.text === 'undefined') return true;
          if (x.kind === ts.SyntaxKind.NullKeyword || (ts.isVoidExpression(x) && (ts.isNumericLiteral(x.expression) || (ts.isIdentifier(x.expression) && x.expression.text === 'undefined')))) return true;
          return isConsoleCall(x);
        }
        return b.statements.every((s) => ts.isExpressionStatement(s) && isConsoleCall(s.expression));
      }
      return false;
    };
    const isConsoleCall = (x) => ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && x.expression.expression.getText(sf) === 'console';
    const inIgnoredCall = (n) =>
      ancestors(n).some((p) => (ts.isCallExpression(p) && isConsoleCall(p)) || (ts.isNewExpression(p) && /Error$/.test(p.expression.getText(sf))) || ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isLiteralTypeNode(p) || ts.isTypeNode(p));
    const inPlaceholderProp = (n) => {
      const p = n.parent;
      if (ts.isJsxExpression(p) && ts.isJsxAttribute(p.parent)) return /^placeholder/i.test(attrName(p.parent));
      if (ts.isJsxAttribute(p)) return /^placeholder/i.test(attrName(p));
      for (let q = n.parent, i = 0; q && i < 4; q = q.parent, i++) {
        if (ts.isPropertyAssignment(q) && /^placeholder/i.test(q.name.getText(sf))) return true;
        if (ts.isJsxAttribute(q)) return /^placeholder/i.test(attrName(q));
      }
      return false;
    };
    const isDecorative = (n) => {
      // props that never reach the screen as text
      const p = n.parent;
      const a = ts.isJsxAttribute(p) ? p : ts.isJsxExpression(p) && ts.isJsxAttribute(p.parent) ? p.parent : null;
      return !!a && /^(testID|key|id|className|style|href|src|source|name|icon|variant|size|tone|type|role|accessibilityRole|nativeID|data-.+|aria-(?!label).*)$/.test(attrName(a));
    };

    const visit = (n) => {
      /* ---- dead buttons ---- */
      if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) {
        const tag = jsxName(n);
        const attrs = attrsOf(n);
        const spread = attrs.some((a) => ts.isJsxSpreadAttribute(a));
        const names = attrs.map(attrName);
        // handler present but empty
        for (const a of attrs) {
          if (ts.isJsxAttribute(a) && CLICK_ATTRS.has(attrName(a)) && emptyHandler(attrExpr(a))) add('dead-button', n, `<${tag}${labelOf(n) ? ' ' + labelOf(n) : ''} ${attrName(a)}={${oneLine(text(attrExpr(a)), 40)}}>`, 'empty handler');
        }
        // href="#"
        const href = attrs.find((a) => ts.isJsxAttribute(a) && attrName(a) === 'href');
        if (href) {
          const e = unwrap(attrExpr(href));
          if (e && (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) && /^(#|javascript:.*)?$/.test(e.text.trim())) add('dead-button', n, `<${tag} href="${e.text}">`, 'href="#"');
        }
        // no handler at all
        if (PRESSABLE.has(tag) && !spread && !names.some((x) => HANDLER_ATTRS.has(x))) {
          const typeAttr = attrs.find((a) => ts.isJsxAttribute(a) && attrName(a) === 'type');
          const typeVal = typeAttr && attrExpr(typeAttr) && ts.isStringLiteral(attrExpr(typeAttr)) ? attrExpr(typeAttr).text : null;
          const inForm = ancestors(n).some((p) => (ts.isJsxElement(p) && /^(form|Form)$/.test(jsxName(p))));
          const linkAsChild = ancestors(n).slice(0, 2).some((p) => ts.isJsxElement(p) && /^Link$/.test(jsxName(p)));
          const submit = typeVal === 'submit' || typeVal === 'reset' || (tag === 'button' && !typeAttr && inForm);
          // a button that is a trigger for a library (Radix `asChild`, `<summary>` neighbours) or purely `disabled`
          if (!submit && !linkAsChild) add('dead-button', n, `<${tag}${labelOf(n) ? ' ' + labelOf(n) : ''}>`, 'no handler');
        }
      }

      /* ---- simulated success ---- */
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'setTimeout' && n.arguments.length >= 2) {
        const cb = n.arguments[0];
        if (ts.isArrowFunction(cb) || ts.isFunctionExpression(cb)) {
          let confirms = '';
          const sv = (x) => {
            if (ts.isCallExpression(x) && ts.isIdentifier(x.expression)) {
              const nm = x.expression.text;
              const arg = x.arguments[0];
              if (/^set(Confirmed|Success|Succeeded|Done|Submitted|Booked|Completed|Sent)\w*$/i.test(nm)) confirms = nm;
              if (/^set(Status|State|Phase|Step)$/i.test(nm) && arg && ts.isStringLiteral(arg) && /^(success|confirmed|done|booked|completed)$/i.test(arg.text)) confirms = `${nm}("${arg.text}")`;
            }
            ts.forEachChild(x, sv);
          };
          sv(cb.body);
          const fn = ancestors(n).find((p) => ts.isFunctionLike(p));
          const callsApi = fn ? /\b(fetch|apiFetch|callPatientApi|axios|mutate|mutateAsync|http\.\w+|api\.\w+|client\.\w+)\s*\(/.test(text(fn)) : false;
          if (confirms && !callsApi) add('fake-success', n, `setTimeout(() => { …${confirms}(…) }, ${text(n.arguments[1])}) and no fetch in the handler`, undefined);
        }
      }

      /* ---- Math.random ---- */
      if (ts.isCallExpression(n) && n.expression.getText(sf) === 'Math.random') {
        const chain = ancestors(n).slice(0, 6).map((p) => text(p)).join(' ');
        const near = ancestors(n).find((p) => ts.isVariableDeclaration(p) || ts.isPropertyAssignment(p) || ts.isFunctionDeclaration(p));
        const nearName = near && near.name ? near.name.getText(sf) : '';
        const benign = /toString\(\s*(36|16)\s*\)/.test(text(n.parent.parent || n.parent)) || /(^|[^a-z])(id|uuid|key|nonce|token|jitter|delay|backoff|seed|session|request)/i.test(nearName) || /(Date\.now\(\)|jitter|backoff)/i.test(oneLine(chain, 400));
        if (!benign) add('math-random', n, text(ancestors(n).find((p) => ts.isVariableDeclaration(p) || ts.isExpressionStatement(p) || ts.isPropertyAssignment(p) || ts.isReturnStatement(p)) || n), 'value');
      }

      /* ---- mock-named constants ---- */
      if ((ts.isVariableDeclaration(n) || ts.isPropertyAssignment(n) || ts.isPropertyDeclaration(n)) && n.name && (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name)) && hasMockWord(n.name.text)) {
        const init = unwrap(n.initializer);
        const holdsData = init && (ts.isArrayLiteralExpression(init) ? init.elements.length > 0 : ts.isObjectLiteralExpression(init) ? init.properties.length > 0 : ts.isStringLiteral(init) || ts.isNumericLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init) || ts.isArrowFunction(init) || ts.isFunctionExpression(init));
        if (holdsData && !/^(is|has|use)[A-Z]/.test(n.name.text)) add('mock-name', n, text(n).split('\n')[0], undefined);
      }
      if (ts.isFunctionDeclaration(n) && n.name && hasMockWord(n.name.text) && !/^[A-Z]/.test(n.name.text)) add('mock-name', n, `function ${n.name.text}(…)`, undefined);

      /* ---- hard-coded data arrays ---- */
      if (ts.isArrayLiteralExpression(n) && n.elements.length >= 2 && n.elements.every((e) => ts.isObjectLiteralExpression(e))) {
        const keysets = n.elements.map((e) => e.properties.filter((p) => ts.isPropertyAssignment(p)).map((p) => ({ k: p.name.getText(sf).replace(/['"]/g, '').toLowerCase(), v: unwrap(p.initializer) })));
        const dataLike = (kv) => ENTITY_KEYS.has(kv.k) && (ts.isNumericLiteral(kv.v) || ts.isStringLiteral(kv.v) || ts.isPrefixUnaryExpression(kv.v)) && /\d/.test(kv.v.getText(sf));
        // a catalogue: every object has a text field (name/title/label) and some object a literal number that is not layout
        const textKey = (kv) => /^(name|title|label|name_?ar|name_?en|text|desc)/i.test(kv.k) && (ts.isStringLiteral(kv.v) || ts.isNoSubstitutionTemplateLiteral(kv.v));
        const numKey = (kv) => ts.isNumericLiteral(kv.v) && !/^(id|order|index|value|step|count|duration|delay|size|width|height|min|max|days|weeks|month|year|level|priority|sort|preview|limit|take|page|columns|rows|flex|opacity|top|left|zindex)/.test(kv.k);
        const listed = (xs) => [...new Set(xs.map((x) => x.k))].join(', ');
        if (keysets.filter((ks) => ks.some(dataLike)).length >= 2) add('hardcoded-data', n, `[${n.elements.length} objects: ${listed(keysets.flat().filter(dataLike))}] ${oneLine(text(n.elements[0]), 60)}`, undefined);
        else if (keysets.every((ks) => ks.some(textKey)) && keysets.some((ks) => ks.some(numKey))) add('hardcoded-data', n, `[${n.elements.length} objects: ${listed(keysets.flat().filter((x) => textKey(x) || numKey(x)))}] ${oneLine(text(n.elements[0]), 60)}`, undefined);
      }

      /* ---- fake numbers ---- */
      // `rating: x ?? 4.9`, `rating: typeof x === "number" ? x : 4.9`, `{ rating = 4.5 }`, `rating: 4.8`
      {
        const key = ts.isPropertyAssignment(n) || ts.isBindingElement(n) || ts.isVariableDeclaration(n) || ts.isParameter(n) || ts.isPropertyDeclaration(n) ? n.name && (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name)) && n.name.text.toLowerCase() : null;
        const init = key && FALLBACK_KEYS.has(key) ? n.initializer : null;
        if (init) {
          const lits = [];
          const pick = (e) => {
            e = unwrap(e);
            if (!e) return;
            if (ts.isNumericLiteral(e)) lits.push(e);
            else if (ts.isConditionalExpression(e)) (pick(e.whenTrue), pick(e.whenFalse));
            else if (ts.isBinaryExpression(e) && (e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken || e.operatorToken.kind === ts.SyntaxKind.BarBarToken)) pick(e.right);
          };
          pick(init);
          const bad = lits.find((l) => Number(l.text) !== 0 && !(ts.isParameter(n) && Number(l.text) === 1));
          if (bad) add('fake-number', n, text(n), undefined, key);
        }
      }
      if (ts.isJsxAttribute(n) && NUMERIC_PROPS.has(attrName(n).toLowerCase())) {
        const e = unwrap(attrExpr(n));
        if (e && ((ts.isNumericLiteral(e) && Number(e.text) !== 0) || (ts.isStringLiteral(e) && /^\d+(\.\d+)?$/.test(e.text) && Number(e.text) !== 0))) add('fake-number', n, text(n), undefined);
      }
      if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isJsxText(n)) && !inIgnoredCall(n) && !inPlaceholderProp(n)) {
        const t = ts.isJsxText(n) ? n.text : n.text;
        const clean = t.replace(/\s+/g, ' ').trim();
        if (clean && !isDecorative(n) && !(ts.isStringLiteral(n) && ts.isPropertyAssignment(n.parent) && n.parent.name === n)) {
          if (/[★⭐]\s*\d(\.\d)?\b|\b\d\.\d\s*[★⭐]|\b\d\.\d\s*\(\s*\d+\s*(تقييم|reviews?|ratings?)\s*\)/.test(clean)) add('fake-number', n, clean, undefined);
          if (DUMMY_RES.some((re) => re.test(clean))) add('dummy-value', n, clean, undefined);
          if (PLACEHOLDER_RES.some((re) => re.test(clean))) add('placeholder-text', n, clean, undefined);
          // a person's name written into the source ("د. محمد أحمد الكردي", "Dr. Sara Ali")
          if (/^(د\.\s*|Dr\.?\s+|دكتور\s+)\S+(\s+\S+){1,3}$/.test(clean) && !/(الطبيب|طبيب|doctor|physician)/i.test(clean)) add('dummy-value', n, clean, 'person name');
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);

    /* ---- TODO comments ---- */
    const seen = new Set();
    const walkC = (n) => {
      for (const r of [...(ts.getLeadingCommentRanges(src, n.getFullStart()) || []), ...(ts.getTrailingCommentRanges(src, n.getEnd()) || [])]) {
        if (seen.has(r.pos)) continue;
        seen.add(r.pos);
        const body = src.slice(r.pos, r.end);
        const m = body.match(/\b(TODO|FIXME|HACK|XXX)\b[:\s(]?.*/) || body.match(/[^\n]*\b(?:stubs?|not implemented(?: yet)?|requires backend)\b.*/i);
        if (m) add('todo-comment', r.pos, m[0].replace(/\*\/\s*$/, ''), undefined);
      }
      ts.forEachChild(n, walkC);
    };
    walkC(sf);
  }
  // deterministic order, no duplicates (a node reached twice)
  const key = (x) => `${x.app}|${x.category}|${x.file}|${String(x.line).padStart(6, '0')}|${x.snippet}`;
  const uniq = new Map(out.map((x) => [key(x) + '|' + (x.sub || ''), x]));
  return [...uniq.values()].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
}
