#!/usr/bin/env python3
"""Rehearsal stand-in for the Cloudflare API calls of tools/ops/cf/20-r2-backup-bucket.sh (no real account).
Checks the Global API Key headers, keeps buckets, lifecycle and tokens in memory, and logs each call to stdout.
Also stands in for Resend (POST /emails, list: GET /_mails).
Also stands in for the mail checks: Cloudflare DNS records, Brevo, Mailjet and Resend domain status (POST /_mail).
Usage: cf-mock.py <port>   (state dump: GET /_state)"""
import json, sys, uuid
from http.server import BaseHTTPRequestHandler, HTTPServer

ACCOUNT = "acc0000000000000000000000000rehe"
STATE = {"buckets": {}, "lifecycle": {}, "tokens": {}, "public": set(), "rulesets": {}, "er": {"enabled": False, "addresses": [], "rules": []}, "edge": {}, "cached": set(), "purges": []}
PG = [{"id": "2efd5506f9c8494dacb1fa10a3e7d5b6", "name": "Workers R2 Storage Bucket Item Write"},
      {"id": "6a018a9f2fc74eb6b293b0c548f38b39", "name": "Workers R2 Storage Bucket Item Read"},
      {"id": "bf7481a1826f439697cb59a20b22293e", "name": "Workers R2 Storage Write"}]


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send(self, code, result=None, ok=True, err=None):
        body = json.dumps({"success": ok, "errors": [{"message": err}] if err else [], "result": result}).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def raw(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def handle_any(self, method):
        p = self.path.split("?")[0].replace("/client/v4", "")
        n = int(self.headers.get("Content-Length") or 0)
        data = json.loads(self.rfile.read(n) or b"null") if n else None
        print(f"{method} {p}", flush=True)
        if p == "/_state":
            return self.send(200, {"buckets": list(STATE["buckets"]), "lifecycle": STATE["lifecycle"],
                                   "tokens": [{"id": k, "name": v["name"], "policies": v["policies"]} for k, v in STATE["tokens"].items()]})
        if p == "/emails" and method == "POST":  # Resend stand-in for 62's test mail
            ok = self.headers.get("Authorization", "").startswith("Bearer ") and data and data.get("to") and data.get("from")
            STATE.setdefault("mails", []).append({"subject": (data or {}).get("subject"), "to_count": len((data or {}).get("to") or [])})
            return self.send(200 if ok else 422, {"id": "mail-rehearsal"}, ok=bool(ok))
        if p == "/_reset":
            STATE["er"] = {"enabled": False, "addresses": [], "rules": []}
            STATE["edge"], STATE["cached"], STATE["purges"] = {}, set(), []
            STATE["rulesets"] = {}
            return self.send(200, {})
        if p == "/_verify_dest" and method == "POST":  # the owner clicks the link in Cloudflare's e-mail
            for a in STATE["er"]["addresses"]:
                a["verified"] = "2026-10-18T00:00:00Z"
            return self.send(200, {})
        if p == "/_er":
            er = STATE["er"]
            return self.send(200, {"enabled": er["enabled"], "addresses": [a["email"] for a in er["addresses"]], "rules": [r["matchers"][0]["value"] for r in er["rules"]],
                                   "purges": STATE["purges"], "dns": [(r["type"], r["name"]) for r in (STATE.get("mail") or {}).get("dns", [])]})
        if p == "/_mails":
            return self.send(200, STATE.get("mails", []))
        # mail DNS and providers (tools/ops/cf/41-mail-verify.sh, tasks/70-mail-env.sh): seed with POST /_mail
        if p == "/_mail":
            if method == "POST":
                STATE["mail"] = data
            return self.send(200, STATE.get("mail"))
        mail = STATE.get("mail") or {}
        if p.startswith("/v3/senders/domains/"):  # Brevo
            if not self.headers.get("api-key"):
                return self.raw(401, {"code": "unauthorized"})
            b = mail.get("brevo") or {}
            if p.endswith("/authenticate") and method == "PUT":
                b["checks"] = b.get("checks", 0) + 1
                if b.get("fix_on_check"):
                    b["authenticated"] = b["verified"] = True
                    for r in b.get("dns_records", {}).values():
                        r["status"] = True
                return self.raw(200, {"message": "ok"})
            return self.raw(200, b) if b else self.raw(404, {"code": "document_not_found"})
        if p.startswith("/v3/REST/apikey"):  # Mailjet: who the credentials are
            import base64
            h = self.headers.get("Authorization", "")
            try:
                user, _, pw = base64.b64decode(h[6:]).decode().partition(":") if h.startswith("Basic ") else ("", "", "")
            except Exception:
                user, pw = "", ""
            want = mail.get("mailjet_auth") or {}
            if want and (user, pw) == (want.get("user"), want.get("pass")):
                return self.raw(200, {"Count": 1, "Data": [{"ID": 7, "IsActive": True, "Name": "rehearsal", "Usage": "transactional"}]})
            return self.raw(401, {"ErrorMessage": "API key authentication/authorization failure. You may be unauthorized to access the API or your API key may be expired. Visit API keys management section ( https://app.mailjet.com/account/api_keys ) to check your keys.", "StatusCode": 401})
        if p.startswith("/v3/REST/dns"):  # Mailjet
            if not self.headers.get("Authorization", "").startswith("Basic "):
                return self.raw(401, {"ErrorMessage": "unauthorized"})
            m = mail.get("mailjet") or {}
            if p.endswith("/check") and method == "POST":
                m["checks"] = m.get("checks", 0) + 1
                if m.get("fix_on_check"):
                    m["DKIMStatus"] = m["SPFStatus"] = "OK"
                return self.raw(200, {"Data": [m]})
            return self.raw(200, {"Count": 1, "Data": [m]}) if m else self.raw(404, {"ErrorMessage": "Object not found"})
        if p.startswith("/domains"):  # Resend
            if not self.headers.get("Authorization", "").startswith("Bearer "):
                return self.raw(401, {"message": "missing key"})
            r = mail.get("resend") or {}
            if p == "/domains":
                return self.raw(200, {"data": [{"id": r["id"], "name": r["name"]}] if r else []})
            if p.endswith("/verify") and method == "POST":
                r["checks"] = r.get("checks", 0) + 1
                return self.raw(200, {"object": "domain", "id": r.get("id")})
            return self.raw(200, r)
        # --- 43-search-suggest-cache: the edge in front of api.nabd.plus (GET /api/v1/search/suggest) and cache rules
        if p == "/_edge":
            if method == "POST":
                STATE["edge"] = data
                STATE["cached"] = set()
            return self.send(200, STATE["edge"])
        if p == "/api/v1/search/suggest":
            e = STATE["edge"]
            rules = STATE["rulesets"].get("http_request_cache_settings", {}).get("rules", [])
            has_rule = any(r.get("enabled") and r.get("description", "").startswith("Search suggest") for r in rules)
            signed = bool(self.headers.get("Authorization") or "nabd_access" in (self.headers.get("Cookie") or ""))
            key = self.path
            if signed and has_rule and e.get("signed_hit"):
                status = "HIT"  # a broken rule: a signed-in request served from the cache
            elif signed or not has_rule:
                status = "BYPASS" if signed else "DYNAMIC"
            elif key in STATE["cached"]:
                status = "HIT"
            else:
                status = "MISS"
                STATE["cached"].add(key)
            self.send_response(200)
            if e.get("cache_control"):
                self.send_header("Cache-Control", e["cache_control"])
            self.send_header("CF-Cache-Status", status)
            self.send_header("Content-Length", "2")
            self.end_headers()
            self.wfile.write(b"[]")
            return
        if p.startswith("/zones/") and "/rulesets/" in p:
            if not (self.headers.get("X-Auth-Email") and self.headers.get("X-Auth-Key")):
                return self.send(403, ok=False, err="missing global key headers")
            if "/phases/" in p and p.endswith("/entrypoint"):
                phase = p.split("/phases/")[1].split("/")[0]
                rs = STATE["rulesets"].setdefault(phase, {"id": "rs-" + phase, "rules": []})
                for i, r in enumerate(rs["rules"]):
                    r.setdefault("id", "r%d" % i)
                    r["version"] = "1"
                return self.send(200, rs)
            if method == "PUT":
                rid = p.rsplit("/", 1)[1]
                for phase, rs in STATE["rulesets"].items():
                    if rs["id"] == rid:
                        rs["rules"] = [dict(r, id=r.get("id") or uuid.uuid4().hex[:8]) for r in data["rules"]]
                        return self.send(200, rs)
            return self.send(404, ok=False, err="ruleset not found")
        if p.startswith("/zones/") and p.endswith("/purge_cache") and method == "POST":
            STATE["purges"].append(data)
            if data and data.get("tags") and not STATE["edge"].get("no_purge_effect"):
                STATE["cached"] = set()
            return self.send(200, {"id": "purge-1"})
        # --- 44-email-routing: Cloudflare Email Routing and the DNS records it adds
        if p.startswith("/zones/") and "/email/routing" in p or (p.startswith("/accounts/") and "/email/routing" in p):
            if not (self.headers.get("X-Auth-Email") and self.headers.get("X-Auth-Key")):
                return self.send(403, ok=False, err="missing global key headers")
            if STATE["edge"].get("er_forbidden"):
                return self.send(403, ok=False, err="Authentication error")
            er = STATE["er"]
            if p.endswith("/email/routing") and method == "GET":
                return self.send(200, {"enabled": er["enabled"], "name": "nabd.plus"})
            if p.endswith("/email/routing/dns") and method == "POST":
                er["enabled"] = True
                dns = STATE.setdefault("mail", {}).setdefault("dns", [])
                for i in (1, 2, 3):
                    dns.append({"type": "MX", "name": "nabd.plus", "content": "route%d.mx.cloudflare.net" % i})
                if STATE["edge"].get("er_adds_spf"):
                    dns.append({"type": "TXT", "name": "nabd.plus", "content": "\"v=spf1 include:_spf.mx.cloudflare.net ~all\""})
                return self.send(200, {"enabled": True})
            if p.endswith("/email/routing/addresses"):
                if method == "POST":
                    er["addresses"].append({"email": data["email"], "verified": None, "tag": uuid.uuid4().hex[:8]})
                    return self.send(200, er["addresses"][-1])
                return self.send(200, [dict(a, verified=a["verified"] or None) for a in er["addresses"]])
            if p.endswith("/email/routing/rules"):
                if method == "POST":
                    ok = any(a["email"] == (data["actions"][0]["value"][0]) and a["verified"] for a in er["addresses"])
                    if not ok:
                        return self.send(400, ok=False, err="destination address not verified")
                    er["rules"].append(data)
                    return self.send(200, data)
                return self.send(200, er["rules"])
            if method == "GET" and p.count("/") == 4:
                return self.send(200, {"id": "x"})
        if p.startswith("/zones/") and "/dns_records/" in p and method == "DELETE":
            rid = p.rsplit("/", 1)[1]
            dns = (STATE.get("mail") or {}).get("dns", [])
            before = len(dns)
            dns[:] = [r for r in dns if r.get("id") != rid]
            return self.send(200 if len(dns) < before else 404, {"id": rid}, ok=len(dns) < before)
        if p.startswith("/zones/") and p.endswith("/dns_records"):
            if not (self.headers.get("X-Auth-Key") or self.headers.get("Authorization")):
                return self.send(403, ok=False, err="no auth")
            dns = mail.setdefault("dns", []) if STATE.get("mail") is not None else []
            for i, r in enumerate(dns):
                r.setdefault("id", "d%d" % i)
            return self.send(200, dns)
        if not (self.headers.get("X-Auth-Email") and self.headers.get("X-Auth-Key")):
            return self.send(403, ok=False, err="missing global key headers")
        parts = p.strip("/").split("/")
        if parts[0] == "zones" and len(parts) == 2:
            return self.send(200, {"id": parts[1], "account": {"id": ACCOUNT}})
        if parts[:3] == ["accounts", ACCOUNT, "r2"] and parts[3] == "buckets":
            if len(parts) == 4 and method == "POST":
                STATE["buckets"][data["name"]] = {}
                return self.send(200, {"name": data["name"]})
            name = parts[4]
            if name not in STATE["buckets"]:
                return self.send(404, ok=False, err="The specified bucket does not exist.")
            if len(parts) == 5:
                return self.send(200, {"name": name})
            if parts[5] == "domains":
                if parts[6] == "managed":
                    return self.send(200, {"enabled": name in STATE["public"], "domain": f"pub-x.r2.dev"})
                return self.send(200, {"domains": []})
            if parts[5] == "lifecycle":
                if method == "PUT":
                    STATE["lifecycle"][name] = data
                    return self.send(200, {})
                return self.send(200, STATE["lifecycle"].get(name, {"rules": []}))
        if parts[:2] == ["user", "tokens"]:
            if len(parts) == 3 and parts[2] == "permission_groups":
                return self.send(200, PG)
            if len(parts) == 2 and method == "GET":
                return self.send(200, [{"id": k, "name": v["name"]} for k, v in STATE["tokens"].items()])
            if len(parts) == 2 and method == "POST":
                tid = uuid.uuid4().hex
                STATE["tokens"][tid] = data
                return self.send(200, {"id": tid, "name": data["name"], "value": uuid.uuid4().hex + uuid.uuid4().hex[:8]})
            if len(parts) == 3 and method == "DELETE":
                STATE["tokens"].pop(parts[2], None)
                return self.send(200, {"id": parts[2]})
        return self.send(404, ok=False, err=f"not in the mock: {method} {p}")

    def do_GET(self): self.handle_any("GET")
    def do_POST(self): self.handle_any("POST")
    def do_PUT(self): self.handle_any("PUT")
    def do_DELETE(self): self.handle_any("DELETE")


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
