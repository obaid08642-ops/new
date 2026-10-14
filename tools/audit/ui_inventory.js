#!/usr/bin/env node
/* UI inventory from source (TypeScript AST, not regex).
 *   node tools/audit/ui_inventory.js [outDir=docs/review/inventory]
 * For every screen/component file of the four clients it lists:
 *   - interactive elements: buttons (onPress/onClick/onLongPress), fields (TextInput/input/textarea/
 *     NInput... with value/onChange*), toggles (Switch/checkbox), selects/pickers, links (href);
 *     with tag, visible label (text child / label / title / placeholder / aria-label), handler, line;
 *   - API calls: apiFetch/adminFetch/client.<verb>/fetch/callPatientApi/... with method + url literal.
 * Writes <outDir>/<app>.json and prints totals per app.
 */
const fs = require('fs');
const path = require('path');
const ts = require(path.join(__dirname, '../../backend/node_modules/typescript'));

const ROOT = path.join(__dirname, '../..');
const APPS = {
  'patient-app': ['patient-app/app', 'patient-app/src'],
  'provider-app': ['provider-app/src', 'provider-app/app'],
  admin: ['admin/src'],
  'patient-web': ['patient-web/app', 'patient-web/components-next', 'patient-web/components', 'patient-web/lib'],
};
const FIELD_TAGS = /^(TextInput|input|textarea|NInput|NPriceInput|NPhoneInput|NSearch|Input|AppInput|FormInput|TextField|SearchBar|SearchInput|OtpInput|PhoneInput|Field|NTextArea|TextArea|Stepper)$/;
const TOGGLE_TAGS = /^(Switch|Checkbox|CheckBox|Toggle|NSwitch|NToggle|NCheckbox|Radio|BooleanRow)$/;
const SELECT_TAGS = /^(select|Picker|Select|Dropdown|NDropdown|NSelect|SegmentedControl|DatePicker|DateTimePicker|Chips|ChipGroup|GeoPicker|TabView)$/;
const CALLERS = /^(apiFetch|adminFetch|adminMutation|fetchWithAdminGuard|callPatientApi|patientFetch|fetch|request|api\.(get|post|put|patch|delete)|client\.(get|post|put|patch|delete)|http\.(get|post|put|patch|delete)|axios\.(get|post|put|patch|delete))$/;

function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!/node_modules|__tests__|\.next/.test(e.name)) walk(p, out); }
    else if (/\.(tsx|ts)$/.test(e.name) && !/\.(test|spec|d)\.tsx?$/.test(e.name)) out.push(p);
  }
}

function textOf(node, sf) {
  // visible label: string literals / JSX text inside, or common label props
  const parts = [];
  const visit = (n) => {
    if (ts.isJsxText(n)) { const t = n.getText(sf).trim(); if (t) parts.push(t); }
    else if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) { if (n.text.trim() && parts.length < 3) parts.push(n.text.trim()); }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return parts.join(' ').replace(/\s+/g, ' ').slice(0, 80);
}

function attr(el, name) {
  const props = ts.isJsxElement(el) ? el.openingElement.attributes : el.attributes;
  for (const p of props.properties) if (ts.isJsxAttribute(p) && p.name.getText() === name) return p;
  return null;
}
function attrText(el, name, sf) {
  const a = attr(el, name);
  if (!a || !a.initializer) return null;
  if (ts.isStringLiteral(a.initializer)) return a.initializer.text;
  return a.initializer.getText(sf).replace(/^\{|\}$/g, '').slice(0, 120);
}

function analyse(file) {
  const src = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const elements = [];
  const calls = [];
  const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const visit = (n) => {
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) {
      const open = ts.isJsxElement(n) ? n.openingElement : n;
      const tag = open.tagName.getText(sf);
      const press = attrText(open, 'onPress', sf) || attrText(open, 'onClick', sf) || attrText(open, 'onLongPress', sf);
      const change = attrText(open, 'onChangeText', sf) || attrText(open, 'onChange', sf) || attrText(open, 'onValueChange', sf) || attrText(open, 'onSelect', sf);
      const label = attrText(open, 'label', sf) || attrText(open, 'title', sf) || attrText(open, 'placeholder', sf) || attrText(open, 'aria-label', sf) || attrText(open, 'accessibilityLabel', sf) || (ts.isJsxElement(n) ? textOf(n, sf) : '');
      let kind = null;
      if (FIELD_TAGS.test(tag) || (tag === 'input' && !/checkbox|radio|submit|button/.test(attrText(open, 'type', sf) || ''))) kind = 'field';
      if (tag === 'input' && /checkbox|radio/.test(attrText(open, 'type', sf) || '')) kind = 'toggle';
      if (TOGGLE_TAGS.test(tag)) kind = 'toggle';
      if (SELECT_TAGS.test(tag)) kind = 'select';
      if (!kind && press) kind = 'button';
      if (!kind && (tag === 'Link' || tag === 'a') && attr(open, 'href')) kind = 'link';
      if (!kind && tag === 'form' && attr(open, 'onSubmit')) kind = 'form';
      if (kind) {
        elements.push({
          kind, tag, line: line(n), label: (label || '').slice(0, 80),
          handler: (press || change || attrText(open, 'onSubmit', sf) || attrText(open, 'href', sf) || '').slice(0, 120),
          binds: attrText(open, 'value', sf) || attrText(open, 'checked', sf) || attrText(open, 'selectedValue', sf) || null,
          disabled: attrText(open, 'disabled', sf) || null,
        });
      }
    }
    if (ts.isCallExpression(n)) {
      const callee = n.expression.getText(sf);
      if (CALLERS.test(callee) && n.arguments.length) {
        const a0 = n.arguments[0];
        let url = null;
        if (ts.isStringLiteral(a0) || ts.isNoSubstitutionTemplateLiteral(a0)) url = a0.text;
        else if (ts.isTemplateExpression(a0)) url = a0.getText(sf).slice(1, -1).replace(/\$\{[^}]*\}/g, ':x');
        if (url && url.startsWith('/') && !/^\/(_next|images|icons|fonts)\//.test(url)) {
          let method = /\.(get|post|put|patch|delete)$/.exec(callee)?.[1]?.toUpperCase() || null;
          const opt = n.arguments[1] && n.arguments[1].getText(sf);
          if (!method && opt) method = (/method:\s*['"`](\w+)/.exec(opt) || [])[1]?.toUpperCase() || null;
          if (!method && callee === 'adminMutation' && n.arguments[1]) method = n.arguments[1].getText(sf).replace(/['"`]/g, '').toUpperCase();
          calls.push({ method: method || 'GET', url: url.split('?')[0], line: line(n) });
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { elements, calls };
}

const outDir = path.join(ROOT, process.argv[2] || 'docs/review/inventory');
fs.mkdirSync(outDir, { recursive: true });
const totals = {};
for (const [app, dirs] of Object.entries(APPS)) {
  const files = [];
  for (const d of dirs) walk(path.join(ROOT, d), files);
  const screens = [];
  const t = { files: 0, files_with_ui: 0, buttons: 0, fields: 0, toggles: 0, selects: 0, links: 0, forms: 0, api_calls: 0 };
  for (const f of files.sort()) {
    const { elements, calls } = analyse(f);
    t.files++;
    if (!elements.length && !calls.length) continue;
    if (elements.length) t.files_with_ui++;
    for (const e of elements) t[e.kind + 's'] = (t[e.kind + 's'] || 0) + 1;
    t.api_calls += calls.length;
    screens.push({ file: path.relative(ROOT, f), elements, calls });
  }
  totals[app] = t;
  fs.writeFileSync(path.join(outDir, `${app}.json`), JSON.stringify(screens, null, 1));
}
fs.writeFileSync(path.join(outDir, 'totals.json'), JSON.stringify(totals, null, 1));
console.log(JSON.stringify(totals, null, 1));
