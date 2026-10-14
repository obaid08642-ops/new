"""P14.11 test upstream: counts hits per path and echoes who asked. /api/v1/medicines* answers like @PublicCache,
everything else like a private answer."""
import http.server, json, sys
hits = {}
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/__hits'):
            body = json.dumps(hits).encode(); self.send_response(200); self.send_header('content-type', 'application/json'); self.end_headers(); self.wfile.write(body); return
        hits[self.path] = hits.get(self.path, 0) + 1
        public = self.path.startswith('/api/v1/medicines')
        self.send_response(200)
        self.send_header('content-type', 'application/json')
        self.send_header('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60, stale-if-error=86400' if public else 'private, no-store')
        self.end_headers()
        who = self.headers.get('authorization') or self.headers.get('cookie') or 'anon'
        self.wfile.write(json.dumps({'owner': who}).encode())
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1])), H).serve_forever()
