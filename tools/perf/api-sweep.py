"""Read-only API timing: N sequential GETs per endpoint (default 20), p50/p95 in ms.
usage: python3 tools/perf/api-sweep.py [base] > api.json"""
import json, subprocess, sys
base = sys.argv[1] if len(sys.argv) > 1 else "https://api.nabd.plus"
EP = ["/api/v1/medicines?page=1&limit=20", "/api/v1/medicines?page=1&limit=20&sort=smart_ranking",
      "/api/v1/medicines/categories", "/api/v1/articles?limit=10",
      "/api/v1/doctors?limit=20",
      "/api/v1/entity-graph/related/doctor/7210a983-9756-4682-ae68-dcc5978d4ab5"]
def pct(a, p): a = sorted(a); return a[min(len(a) - 1, int(len(a) * p))]
out = []
for ep in EP:
    t = []
    for _ in range(20):
        r = subprocess.run(["curl", "-s", "-o", "/dev/null", "-w", "%{time_total}", base + ep], capture_output=True, text=True)
        t.append(float(r.stdout) * 1000)
    out.append({"endpoint": ep, "p50": round(pct(t, .5)), "p95": round(pct(t, .95))})
print(json.dumps(out))
