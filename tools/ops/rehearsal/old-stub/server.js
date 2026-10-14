// Rehearsal stand-in for the images production runs before the deploy of main (backend, admin-web, patient-web).
// Answers 200 on every path, so the deploy task's pre-checks and its rollback checks have an "old stack" to verify.
const http = require('http');
const handler = (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', stub: true, details: { mongodb: 'up', redis: 'up' } }));
};
// backend answers on 8002, admin-web and patient-web on 3000: one image serves all three
for (const port of [8002, 3000]) http.createServer(handler).listen(port, '0.0.0.0');
