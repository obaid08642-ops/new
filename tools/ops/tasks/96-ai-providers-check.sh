#!/bin/bash
# AI providers check (lead reviewer, 2026-10-26), READ-ONLY. The owner set keys for several AI providers on the server and wants
# every AI feature to fall through them (free tiers; on failure or limit, the next one). The gateway seeds keys from env into the
# `ai_providers` collection ONLY when that collection is empty, so keys added later may never reach the gateway. This prints:
#   1. which AI key NAMES are set in .env.production (never a value), plus any other *_API_KEY / *_TOKEN name that looks like AI
#   2. per provider in ai_providers: enabled, priority, model/vision model, has a key, whether that key equals the env key
#      (compared inside the container, only true/false printed), quota and use today, the mode (auto/manual) and pins
#   3. a minimal live probe per provider that has a key (the same probe as the admin "test key" button): ok / http code / latency
#   4. ai_usage of the last 24 h per provider and feature (ok / failed counts)
# Nothing is written. Public lines start with "status:".
set -u
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
ENVF=$D/.env.production
DK="sudo -n docker"
names=$(sudo -n grep -oE '^[A-Z0-9_]+=' "$ENVF" | tr -d '=' | sort -u)
set_names() { for n in "$@"; do sudo -n grep -qE "^${n}=.+" "$ENVF" && printf '%s ' "$n"; done; }
AI="GEMINI_API_KEY OPENAI_API_KEY GROQ_API_KEY CEREBRAS_API_KEY OPENROUTER_API_KEY DEEPSEEK_API_KEY QWEN_API_KEY REPLICATE_API_TOKEN AI_KEYS_ENC_KEY"
echo "status: ai env set: $(set_names $AI)"
echo "status: ai env missing: $(for n in $AI; do sudo -n grep -qE "^${n}=.+" "$ENVF" || printf '%s ' "$n"; done)"
echo "status: other key-like env names (not wired to the gateway): $(echo "$names" | grep -E '(_API_KEY|_TOKEN|_KEY)$' | grep -viE 'GEMINI|OPENAI|GROQ|CEREBRAS|OPENROUTER|DEEPSEEK|QWEN|REPLICATE|AI_KEYS_ENC|BREVO|MAILJET|RESEND|MOYASAR|FCM|APNS|LIVEKIT|COTURN|SENTRY|R2_|S3_|AWS_|JWT|SPL_|CLOUDFLARE|CF_|MONGO|REDIS|MEILI|SESSION|COOKIE|CSRF|SECRET' | tr '\n' ' ')"
$DK exec -i nabdah-backend node - <<'NODE'
const mongoose = require('mongoose');
const crypto = require('crypto');
let decrypt = (s) => s;
try { ({ decryptApiKey: decrypt } = require('/usr/src/app/dist/modules/ai/ai-gateway.service.js')); } catch (e) { console.log('status: ai cannot load decryptApiKey: ' + e.message); }
const envOf = { gemini: 'GEMINI_API_KEY', openai: 'OPENAI_API_KEY', groq: 'GROQ_API_KEY', cerebras: 'CEREBRAS_API_KEY', openrouter: 'OPENROUTER_API_KEY', deepseek: 'DEEPSEEK_API_KEY', qwen: 'QWEN_API_KEY', replicate: 'REPLICATE_API_TOKEN' };
const h = (s) => crypto.createHash('sha256').update(String(s || '')).digest('hex');
async function probe(p, key) {
  const t = Date.now();
  try {
    let r;
    if (p.key === 'gemini') r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(15000) });
    else if (p.key === 'replicate') r = await fetch('https://api.replicate.com/v1/account', { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000) });
    else r = await fetch(`${p.base_url || 'https://api.openai.com/v1'}/models`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000) });
    await r.text().catch(() => '');
    return `${r.ok ? 'ok' : 'FAIL'} http=${r.status} ${Date.now() - t}ms`;
  } catch (e) { return `FAIL ${String(e.name || 'error')} ${Date.now() - t}ms`; }
}
(async () => {
  const conn = await mongoose.createConnection(process.env.MONGO_URL, { dbName: process.env.DB_NAME || 'nabd_nestjs', directConnection: true, serverSelectionTimeoutMS: 15000 }).asPromise();
  const mode = await conn.collection('featureflags').findOne({ key: 'ai_mode' });
  console.log(`status: ai mode=${mode?.value || 'unset'} pinned=${mode?.pinned_provider || '-'} purpose_overrides=${JSON.stringify(mode?.purpose_overrides || {})}`);
  const rows = await conn.collection('ai_providers').find({}).sort({ priority: 1 }).toArray();
  console.log(`status: ai providers in DB: ${rows.length}`);
  for (const p of rows) {
    let key = ''; try { key = decrypt(p.api_key || ''); } catch { key = ''; }
    const envKey = process.env[envOf[p.key]] || '';
    const same = key && envKey ? (h(key) === h(envKey)) : false;
    const live = key ? await probe(p, key) : 'no key in DB';
    const envLive = envKey && !same ? await probe(p, envKey) : '-';
    console.log(`status: ai ${p.key}: enabled=${p.enabled} prio=${p.priority} model=${p.model} vision=${p.vision_model || '-'} db_key=${key ? 'yes' : 'NO'} env_key=${envKey ? 'yes' : 'no'} db_equals_env=${same} quota=${p.used_today || 0}/${p.daily_quota} probe_db=${live} probe_env=${envLive}`);
  }
  const since = new Date(Date.now() - 24 * 3600e3);
  const use = await conn.collection('ai_usage').aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { p: '$provider', f: '$feature', ok: '$ok' }, n: { $sum: 1 } } }]).toArray().catch(() => []);
  console.log('status: ai usage 24h: ' + (use.map((u) => `${u._id.p}/${u._id.f}/${u._id.ok ? 'ok' : 'fail'}=${u.n}`).join(' ') || 'none'));
  await conn.close();
  process.exit(0);
})().catch((e) => { console.log('status: ai check FAIL ' + String(e && e.message || e).slice(0, 160)); process.exit(1); });
NODE
