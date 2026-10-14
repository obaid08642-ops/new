#!/usr/bin/env node
/**
 * A tiny fault-injecting proxy in front of the backend, for the runtime check (QUALITY_STANDARDS.md §7.3).
 *
 * patient-web fetches almost everything on the SERVER, where a browser-side route interception cannot reach.
 * Point patient-web's NABD_API_BASE_URL at this proxy and switch the mode between scenarios:
 *
 *   POST /__fault/pass    forward everything untouched
 *   POST /__fault/empty   answer every GET (except /auth/*) with 200 and an empty list
 *   POST /__fault/error   answer every GET (except /auth/*) with 500
 *
 * Non-GET requests and /auth/* are always forwarded, so a test can still sign in. Test infrastructure only:
 * it listens on localhost and forwards to the backend you name.
 *
 *   node tools/design/fault-proxy.mjs --listen 3003 --target http://localhost:3002
 */
import http from 'node:http';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const LISTEN = Number(arg('listen', '3003'));
const TARGET = new URL(arg('target', 'http://localhost:3002'));
let mode = 'pass';

http.createServer((req, res) => {
  const m = req.url.match(/^\/__fault\/(pass|empty|error)$/);
  if (m && req.method === 'POST') {
    mode = m[1];
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ mode }));
    return;
  }
  const injectable = req.method === 'GET' && !/^\/api\/v1\/auth\//.test(req.url) && !/\/health\//.test(req.url);
  if (injectable && mode === 'empty') return void res.writeHead(200, { 'content-type': 'application/json' }).end('[]');
  if (injectable && mode === 'error') return void res.writeHead(500, { 'content-type': 'application/json' }).end('{"message":"fault-proxy injected failure"}');
  const up = http.request({ hostname: TARGET.hostname, port: TARGET.port, path: req.url, method: req.method, headers: req.headers }, (r) => {
    res.writeHead(r.statusCode ?? 502, r.headers);
    r.pipe(res);
  });
  up.on('error', () => res.writeHead(502).end());
  req.pipe(up);
}).listen(LISTEN, '127.0.0.1', () => console.log(`fault-proxy: :${LISTEN} -> ${TARGET.origin} (mode pass)`));
