#!/usr/bin/env python3
"""Rehearsal stand-in for the Cloudflare API calls of tools/ops/cf/20-r2-backup-bucket.sh (no real account).
Checks the Global API Key headers, keeps buckets, lifecycle and tokens in memory, and logs each call to stdout.
Also stands in for Resend (POST /emails, list: GET /_mails) and for Cloudflare Access (apps, app policies, reusable
policies, login methods) for tools/ops/cf/32-admin-access-allow-owner.sh: seed with POST /_access, read with GET /_access.
Usage: cf-mock.py <port>   (state dump: GET /_state)"""
import json, sys, uuid
from http.server import BaseHTTPRequestHandler, HTTPServer

ACCOUNT = "acc0000000000000000000000000rehe"
STATE = {"buckets": {}, "lifecycle": {}, "tokens": {}, "public": set()}
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
        if p == "/_mails":
            return self.send(200, STATE.get("mails", []))
        if p == "/_access":
            if method == "POST":
                STATE["access"] = data
            return self.send(200, STATE.get("access"))
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
        if parts[:3] == ["accounts", ACCOUNT, "access"]:
            return self.access(method, parts[3:], data)
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

    def access(self, method, parts, data):
        acc = STATE.setdefault("access", {"apps": [], "policies": [], "idps": []})
        pol = {x["id"]: x for x in acc["policies"]}
        def app_view(a):
            return dict(a, policies=[dict(pol[i["id"]], precedence=i["precedence"]) for i in a["policies"]])
        if parts == ["identity_providers"]:
            if method == "POST":
                idp = dict(data, id=uuid.uuid4().hex)
                acc["idps"].append(idp)
                return self.send(200, idp)
            return self.send(200, acc["idps"])
        if parts == ["apps"]:
            return self.send(200, [app_view(a) for a in acc["apps"]])
        app = next((a for a in acc["apps"] if len(parts) > 1 and a["id"] == parts[1]), None)
        if parts[0] == "apps" and app is None:
            return self.send(404, ok=False, err="application not found")
        if parts[0] == "apps" and len(parts) == 2:
            if method == "PUT":
                ids = [x["id"] for x in data.get("policies", [])]
                if sorted(ids) != sorted(i["id"] for i in app["policies"]):
                    return self.send(400, ok=False, err="the update would detach policies")
                app.update({k: v for k, v in data.items() if k != "policies"})
            return self.send(200, app_view(app))
        if parts[0] == "apps" and parts[2:3] == ["policies"]:
            if len(parts) == 3:
                return self.send(200, [dict(pol[i["id"]], precedence=i["precedence"]) for i in app["policies"]])
            if method == "PUT" and parts[3] in pol and not pol[parts[3]].get("reusable"):
                pol[parts[3]].update({k: v for k, v in data.items() if k != "precedence"})
                return self.send(200, pol[parts[3]])
            return self.send(400, ok=False, err="not an app policy of this app")
        if parts[0] == "policies" and len(parts) == 2 and method == "PUT" and pol.get(parts[1], {}).get("reusable"):
            pol[parts[1]].update(data)
            return self.send(200, pol[parts[1]])
        return self.send(404, ok=False, err="not in the access mock")

    def do_GET(self): self.handle_any("GET")
    def do_POST(self): self.handle_any("POST")
    def do_PUT(self): self.handle_any("PUT")
    def do_DELETE(self): self.handle_any("DELETE")


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
