// Stand-in API for the zero-downtime rehearsal (20.9). Same shutdown behaviour as backend/src/common/graceful-drain.ts:
// after SIGTERM it keeps serving for SHUTDOWN_DRAIN_MS with `Connection: close`, then closes the listener.
const http = require('http');
const VERSION = process.env.VERSION || 'v0';
const DRAIN_MS = Number(process.env.SHUTDOWN_DRAIN_MS || 0);
const BROKEN = process.env.FAIL_HEALTH === '1';
let draining = false;

const server = http.createServer((req, res) => {
  const headers = { 'Content-Type': 'application/json' };
  if (draining) headers.Connection = 'close';
  if (req.url.startsWith('/api/v1/health/liveness')) {
    res.writeHead(BROKEN ? 503 : 200, headers);
    return res.end('{"ok":' + (!BROKEN) + '}');
  }
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    // 20-60 ms of "work" so requests are in flight when a container is stopped
    setTimeout(() => {
      res.writeHead(200, headers);
      res.end(JSON.stringify({ v: VERSION, method: req.method, echo: Buffer.concat(chunks).length }));
    }, 20 + Math.random() * 40);
  });
});
server.keepAliveTimeout = 65000;
server.listen(8002);

process.on('SIGTERM', () => {
  draining = true;
  setTimeout(() => server.close(() => process.exit(0)), DRAIN_MS);
});
