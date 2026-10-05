/*
 * Minimal runtime for the *.dc.html boards (handoff §0), so a board opens in a
 * browser and can be screenshotted next to the component that ports it.
 *
 * The design tool that wrote the boards ships its own support.js; it is not in the
 * zip. This file implements only what the boards use:
 *   <x-dc>                 the board template
 *   <script type="text/x-dc" data-props='{...}'>  class Component extends DCLogic { renderVals() }
 *   {{path}}               a value from renderVals() (or the current sc-for item)
 *   <sc-for list as>       repeat the children for each item
 *   <sc-if value>          render the children when the value is truthy
 *   <dc-import name=...>   render another board (Name.dc.html) inline, attributes as props
 *   <helmet>               styles moved into <head>
 *   onClick="{{fn}}"       bound to the function (setState re-renders)
 * Props: data-props defaults, then the importing tag's attributes, then (top level
 * only) the page's query string, e.g. HomeApp.dc.html?theme=dark.
 *
 * Serve the folder over http (python3 -m http.server) — imports are fetched.
 */
(function () {
  'use strict';

  class DCLogic {
    constructor(props) {
      this.props = props || {};
      this.state = {};
    }
    setState(patch) {
      Object.assign(this.state, typeof patch === 'function' ? patch(this.state) : patch);
      if (this.__rerender) this.__rerender();
    }
  }

  const cache = {};
  function loadBoard(name) {
    if (!cache[name]) {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `./${name}.dc.html`, false);
      xhr.send();
      if (xhr.status !== 200) throw new Error(`board ${name} not found`);
      cache[name] = new DOMParser().parseFromString(xhr.responseText, 'text/html');
    }
    return cache[name];
  }

  function parseBoard(doc) {
    const template = doc.querySelector('x-dc');
    const script = doc.querySelector('script[type="text/x-dc"]');
    let defaults = {};
    if (script && script.dataset.props) {
      const spec = JSON.parse(script.dataset.props);
      for (const [k, v] of Object.entries(spec)) if (v && typeof v === 'object' && 'default' in v) defaults[k] = v.default;
    }
    const Component = script ? new Function('DCLogic', `${script.textContent}\nreturn Component;`)(DCLogic) : null;
    return { template, Component, defaults };
  }

  const EXACT = /^\{\{\s*([^{}]+?)\s*\}\}$/;
  function lookup(scope, path) {
    let v = scope;
    for (const part of path.split('.')) {
      if (v == null) return undefined;
      v = v[part];
    }
    return v;
  }
  function interpolate(str, scope) {
    return str.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, p) => {
      const v = lookup(scope, p);
      return v == null ? '' : String(v);
    });
  }
  function valueOf(str, scope) {
    const m = str && str.match(EXACT);
    return m ? lookup(scope, m[1]) : interpolate(str || '', scope);
  }

  function renderChildren(src, out, scope) {
    for (const node of Array.from(src.childNodes)) renderNode(node, out, scope);
  }

  function renderNode(node, out, scope) {
    if (node.nodeType === 3) {
      out.appendChild(document.createTextNode(interpolate(node.textContent, scope)));
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'helmet') {
      // styles and font links go to <head>, once per document
      for (const item of node.querySelectorAll('style, link')) {
        const key = item.outerHTML;
        if (document.head.querySelector(`[data-dc-helmet="${CSS.escape(key.length > 200 ? key.slice(0, 200) : key)}"]`)) continue;
        const copy = document.createElement(item.localName);
        for (const a of Array.from(item.attributes)) copy.setAttribute(a.name, a.value);
        copy.textContent = item.textContent;
        copy.setAttribute('data-dc-helmet', key.length > 200 ? key.slice(0, 200) : key);
        document.head.appendChild(copy);
      }
      return;
    }
    if (tag === 'sc-for') {
      const list = valueOf(node.getAttribute('list'), scope) || [];
      const as = node.getAttribute('as') || 'item';
      list.forEach((item, index) => renderChildren(node, out, Object.assign(Object.create(scope), { [as]: item, index })));
      return;
    }
    if (tag === 'sc-if') {
      if (valueOf(node.getAttribute('value'), scope)) renderChildren(node, out, scope);
      return;
    }
    if (tag === 'dc-import') {
      const props = {};
      for (const a of Array.from(node.attributes)) {
        if (a.name === 'name' || a.name.startsWith('hint-')) continue;
        props[a.name] = valueOf(a.value, scope);
      }
      const host = document.createElement('span');
      host.style.display = 'contents';
      out.appendChild(host);
      mount(node.getAttribute('name'), host, props);
      return;
    }
    // localName: lowercase for HTML (tagName is upper-case, which would make an unknown element
    // instead of a real <button>/<a>/<input>), camelCase kept for SVG (linearGradient)
    const el = document.createElementNS(node.namespaceURI, node.localName);
    for (const a of Array.from(node.attributes)) {
      if (a.name.startsWith('hint-')) continue;
      const v = valueOf(a.value, scope);
      if (/^on[a-z]+$/i.test(a.name)) {
        if (typeof v === 'function') el.addEventListener(a.name.slice(2).toLowerCase(), (e) => { e.preventDefault(); v(e); });
        continue;
      }
      if (v === false || v == null) continue;
      el.setAttribute(a.name, v === true ? '' : String(v));
    }
    renderChildren(node, el, scope);
    out.appendChild(el);
  }

  function mount(name, host, props, doc) {
    const board = parseBoard(doc || loadBoard(name));
    const instance = board.Component ? new board.Component(Object.assign({}, board.defaults, props)) : null;
    const render = () => {
      host.textContent = '';
      const vals = instance && instance.renderVals ? instance.renderVals() : {};
      renderChildren(board.template, host, vals);
    };
    if (instance) instance.__rerender = render;
    render();
  }

  window.DCLogic = DCLogic;
  document.addEventListener('DOMContentLoaded', () => {
    const top = document.querySelector('x-dc');
    if (!top) return;
    const query = Object.fromEntries(new URLSearchParams(location.search));
    const host = document.createElement('div');
    host.id = 'dc-root';
    top.parentNode.insertBefore(host, top);
    const doc = document.implementation.createHTMLDocument('');
    doc.body.innerHTML = '';
    doc.body.appendChild(top.cloneNode(true));
    const script = document.querySelector('script[type="text/x-dc"]');
    if (script) doc.body.appendChild(script.cloneNode(true));
    top.remove();
    mount(null, host, query, doc);
  });
})();
