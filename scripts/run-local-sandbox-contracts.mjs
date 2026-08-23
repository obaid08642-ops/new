#!/usr/bin/env node
/**
 * Local-only contract harness.
 * It binds to 127.0.0.1 on an ephemeral port and never reads or uses
 * NABD_API_BASE_URL or any credential environment variable.
 * Results are LOCAL_SIMULATION and must not be used as live Sandbox proof.
 */
import http from "node:http";
import assert from "node:assert/strict";

const ownerToken = "local-owner-session";
const strangerToken = "local-stranger-session";
const bookingId = "booking-local-1";
const orderId = "order-local-1";
const seenKeys = new Map();

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

function auth(req) {
  const value = req.headers.authorization || "";
  if (value === `Bearer ${ownerToken}`) return "owner";
  if (value === `Bearer ${strangerToken}`) return "stranger";
  return null;
}

async function body(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

const server = http.createServer(async (req, res) => {
  try {
    const role = auth(req);
    const method = req.method || "GET";
    const path = req.url || "/";
    if (!role) return send(res, 401, { code: "UNAUTHENTICATED" });
    if (method === "GET" && path === `/unified-bookings/${bookingId}`) {
      return send(res, role === "owner" ? 200 : 404, role === "owner" ? { id: bookingId, owner: "owner", status: "confirmed" } : { code: "NOT_FOUND" });
    }
    if (method === "GET" && path === `/orders/${orderId}`) {
      return send(res, role === "owner" ? 200 : 404, role === "owner" ? { id: orderId, owner: "owner", status: "cancelled" } : { code: "NOT_FOUND" });
    }
    if (method === "POST" && (path === `/unified-bookings/${bookingId}/cancel` || path === `/orders/${orderId}/cancel`)) {
      if (role !== "owner") return send(res, 404, { code: "NOT_FOUND" });
      const key = req.headers["idempotency-key"];
      if (typeof key !== "string" || key.length < 8) return send(res, 400, { code: "IDEMPOTENCY_KEY_REQUIRED" });
      const fingerprint = `${method}:${path}:${key}`;
      const prior = seenKeys.get(fingerprint);
      if (prior) return send(res, 200, prior);
      const result = { id: path.includes("booking") ? bookingId : orderId, status: "cancelled", total: path.includes("orders") ? 125 : undefined };
      seenKeys.set(fingerprint, result);
      return send(res, 200, result);
    }
    return send(res, 404, { code: "NOT_FOUND" });
  } catch (error) {
    return send(res, 400, { code: "INVALID_REQUEST", message: error instanceof Error ? error.message : "invalid request" });
  }
});

async function request(base, token, path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { authorization: `Bearer ${token}`, ...(options.headers || {}) }
  });
  return { status: response.status, body: await response.json() };
}

const checks = [];
function check(name, condition) {
  assert.equal(condition, true, name);
  checks.push(name);
}

server.listen(0, "127.0.0.1", async () => {
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  try {
    const unauth = await fetch(`${base}/unified-bookings/${bookingId}`);
    check("unauthenticated request is 401", unauth.status === 401);

    const ownerBooking = await request(base, ownerToken, `/unified-bookings/${bookingId}`);
    check("owner can read booking", ownerBooking.status === 200);

    const strangerBooking = await request(base, strangerToken, `/unified-bookings/${bookingId}`);
    check("stranger receives 404", strangerBooking.status === 404);

    const ownerOrder = await request(base, ownerToken, `/orders/${orderId}`);
    check("owner can read order", ownerOrder.status === 200);

    const strangerOrder = await request(base, strangerToken, `/orders/${orderId}`);
    check("stranger receives 404 for order", strangerOrder.status === 404);

    const missingKey = await request(base, ownerToken, `/unified-bookings/${bookingId}/cancel`, { method: "POST" });
    check("mutation requires idempotency key", missingKey.status === 400);

    const key = "local-replay-key-1";
    const first = await request(base, ownerToken, `/unified-bookings/${bookingId}/cancel`, { method: "POST", headers: { "idempotency-key": key } });
    const replay = await request(base, ownerToken, `/unified-bookings/${bookingId}/cancel`, { method: "POST", headers: { "idempotency-key": key } });
    check("owner mutation succeeds", first.status === 200);
    check("same idempotency key replays same result", replay.status === 200 && JSON.stringify(replay.body) === JSON.stringify(first.body));

    const strangerMutation = await request(base, strangerToken, `/unified-bookings/${bookingId}/cancel`, { method: "POST", headers: { "idempotency-key": "stranger-key-1" } });
    check("stranger mutation is hidden as 404", strangerMutation.status === 404);

    console.log(JSON.stringify({ result: "LOCAL_SIMULATION", network: "loopback-only", checks: checks.length, passed: checks }, null, 2));
    process.exitCode = 0;
  } catch (error) {
    console.error(JSON.stringify({ result: "LOCAL_SIMULATION_FAILED", network: "loopback-only", error: error instanceof Error ? error.message : String(error) }, null, 2));
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
