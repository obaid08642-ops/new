// Rehearsal stand-in for the production backend. Liveness is 200 only when the LiveKit key the
// container was created with is accepted by the LiveKit server (a real signed Twirp call), so a
// rotation that leaves backend and LiveKit out of step makes the backend unhealthy.
const http = require('http');
const crypto = require('crypto');

const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
function token(key, secret) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({ iss: key, nbf: now - 5, exp: now + 300, video: { roomList: true } });
  const sig = crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}
async function livekitAccepts() {
  const key = process.env.LIVEKIT_API_KEY;
  const secret = process.env.LIVEKIT_API_SECRET;
  if (!key || !secret) return false;
  try {
    const r = await fetch('http://livekit:7880/twirp/livekit.RoomService/ListRooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(key, secret)}` },
      body: '{}',
    });
    return r.status === 200;
  } catch {
    return false;
  }
}
http
  .createServer(async (req, res) => {
    if (req.url.startsWith('/api/v1/health/liveness')) {
      const ok = await livekitAccepts();
      res.writeHead(ok ? 200 : 503, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok }));
    }
    res.writeHead(404);
    res.end();
  })
  .listen(8002);
