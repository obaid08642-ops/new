// Relay-only check of Cloudflare Realtime TURN: asks Cloudflare for a short-lived credential (the same call the backend makes) and has a real
// browser gather ICE candidates with iceTransportPolicy "relay". It passes only when a relay candidate comes back, i.e. the TURN allocation worked.
// Env: CF_TURN_KEY_ID, CF_TURN_API_TOKEN (never printed). Without them it says "skipped" and exits 0, so CI runs it only where the key exists.
import { createRequire } from 'node:module';

const { CF_TURN_KEY_ID: keyId, CF_TURN_API_TOKEN: apiToken } = process.env;
if (!keyId || !apiToken) { console.log('turn-relay-check: skipped (CF_TURN_KEY_ID / CF_TURN_API_TOKEN not set)'); process.exit(0); }

const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate`, {
  method: 'POST', headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ttl: 600 }),
});
if (!res.ok) { console.error(`turn-relay-check: FAIL credentials request answered ${res.status}`); process.exit(1); }
const ice = (await res.json())?.iceServers;
const servers = Array.isArray(ice) ? ice : ice ? [ice] : [];
if (!servers.length) { console.error('turn-relay-check: FAIL no iceServers in the answer'); process.exit(1); }

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  const found = await page.evaluate(async (iceServers) => {
    const pc = new RTCPeerConnection({ iceServers, iceTransportPolicy: 'relay' });
    pc.createDataChannel('x');
    const types = [];
    const done = new Promise((resolve) => {
      pc.onicecandidate = (e) => { if (!e.candidate) resolve(); else types.push({ type: e.candidate.type, protocol: e.candidate.protocol, address: e.candidate.relatedAddress ? 'relay' : '' }); };
      setTimeout(resolve, 15000);
    });
    await pc.setLocalDescription(await pc.createOffer());
    await done;
    pc.close();
    return types;
  }, servers);
  const relays = found.filter((c) => c.type === 'relay');
  if (!relays.length) { console.error(`turn-relay-check: FAIL no relay candidate (got ${JSON.stringify(found.map((c) => c.type))})`); process.exit(1); }
  console.log(`turn-relay-check: PASS ${relays.length} relay candidate(s) (${[...new Set(relays.map((c) => c.protocol))].join(', ')})`);
} finally {
  await browser.close();
}
