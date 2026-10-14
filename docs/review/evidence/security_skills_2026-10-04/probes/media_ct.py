import sys, urllib.request, seclib
from lib import Client
name, api = sys.argv[1], sys.argv[2]
seclib.use(api)
P = seclib.signup('uploader'); c = Client(P['token'])
r = c.post('/media/presigned', {'filename': 'report.pdf', 'mimetype': 'text/html', 'purpose': 'avatar'})
print(f'[{name}] POST /media/presigned {{filename: report.pdf, mimetype: text/html}} -> {r.status} {str(r.body)[:80] if not r.ok else "upload_url issued"}')
if r.ok:
    up = r.get('upload_url') or r.get('url')
    html = b'<html><body><h1>synthetic page served from the bucket</h1></body></html>'
    q = urllib.request.Request(up, data=html, method='PUT', headers={'Content-Type': 'text/html'})
    print(f'[{name}] PUT html body to the presigned URL ->', urllib.request.urlopen(q).status)
    u = c.get(f'/media/{r.get("id")}/url')
    g = urllib.request.urlopen(u.get('url'))
    print(f'[{name}] GET signed read URL -> {g.status} Content-Type: {g.headers.get("Content-Type")} body starts: {g.read(40)!r}')
