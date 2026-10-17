"""Saudi Post (SPL) National Address stand-in for live journeys (SPL_API_URL=http://127.0.0.1:9101/address?shortaddress={code}&api_key={key}).

  GET /address?shortaddress=RRRD2929&api_key=live  -> {"Addresses":[{...}], "success": true}
  GET /address?shortaddress=<unknown code>         -> {"Addresses":[], "success": true}   (valid format, no such address)
  anything with a wrong key                        -> 401
"""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

KEY = 'live'
ADDRESSES = {
    'RRRD2929': {'BuildingNumber': '8228', 'Street': 'King Fahd Road', 'District': 'Al Olaya', 'City': 'Riyadh', 'RegionName': 'Riyadh',
                 'PostCode': '12611', 'AdditionalNumber': '2929', 'Latitude': '24.6908', 'Longitude': '46.7219'},
    'JEDA1234': {'BuildingNumber': '3011', 'Street': 'Prince Sultan Road', 'District': 'Al Rawdah', 'City': 'Jeddah', 'RegionName': 'Makkah',
                 'PostCode': '23434', 'AdditionalNumber': '1234', 'Latitude': '21.5433', 'Longitude': '39.1728'},
}


class H(BaseHTTPRequestHandler):
    def _send(self, code, body):
        b = json.dumps(body).encode()
        self.send_response(code)
        self.send_header('content-type', 'application/json')
        self.send_header('content-length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        if u.path != '/address':
            return self._send(404, {'message': 'not found'})
        if (q.get('api_key') or [''])[0] != KEY:
            return self._send(401, {'message': 'bad key'})
        code = (q.get('shortaddress') or [''])[0].upper()
        hit = ADDRESSES.get(code)
        self._send(200, {'Addresses': [hit] if hit else [], 'success': True})

    def log_message(self, *a):
        pass


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', 9101), H).serve_forever()
