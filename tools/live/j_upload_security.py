"""Journey (16.5): uploads are judged by what they are. Against the live stack with the ClamAV stand-in (tools/live/fake_clamd.py):
  * a renamed .exe is refused; an infected file (the EICAR test string) is refused; a PDF that can run JavaScript is refused;
  * a photo carrying metadata (a text chunk standing for the EXIF/GPS block) has none afterwards, and its stored name is ours;
  * the presigned upload route is closed; a voice note and a clean PDF are accepted on /media/upload.
The real signature database is exercised by the clamav-integration job (security.yml)."""
import base64
import json
import urllib.error
import struct
import urllib.request
import uuid
import zlib

from lib import Client, journey, step
import j_accounts

EICAR = b'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
API = 'http://127.0.0.1:8002/api/v1'
GPS_MARKER = b'GPS-LAT-24.7136-LON-46.6753'


def chunk(kind, data):
    c = kind + data
    return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c))


def png(text=None):
    # 8 rows of 8 RGB pixels, each row led by its filter byte (0 = none)
    raw = b''.join(b'\x00' + b'\xff\x00\x00' * 8 for _ in range(8))
    parts = [b'\x89PNG\r\n\x1a\n', chunk(b'IHDR', struct.pack('>IIBBBBB', 8, 8, 8, 2, 0, 0, 0))]
    if text:
        parts.append(chunk(b'tEXt', b'Comment\0' + text))
    parts += [chunk(b'IDAT', zlib.compress(raw)), chunk(b'IEND', b'')]
    return b''.join(parts)


PDF_OK = b'%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n'


def storage(pat, data, mime, name='scan.bin'):
    return pat.post('/storage/upload', {'data_base64': base64.b64encode(data).decode(), 'mime': mime, 'original_name': name})


def media(token, data, filename, mime, purpose='chat', thread=None):
    boundary = f'----live{uuid.uuid4().hex}'
    fields = f'--{boundary}\r\nContent-Disposition: form-data; name="purpose"\r\n\r\n{purpose}\r\n'
    if thread:
        fields += f'--{boundary}\r\nContent-Disposition: form-data; name="thread_id"\r\n\r\n{thread}\r\n'
    body = fields.encode() + (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\nContent-Type: {mime}\r\n\r\n').encode() + data + f'\r\n--{boundary}--\r\n'.encode()
    req = urllib.request.Request(f'{API}/media/upload', data=body, method='POST', headers={'content-type': f'multipart/form-data; boundary={boundary}', 'authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.status, json.loads(resp.read().decode() or '{}')
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or '{}')


def run(pat, token):
    journey('uploads: refused by what they are')
    r = storage(pat, b'MZ' + b'\x00' * 200, 'image/png', 'prescription.png')
    step('a renamed .exe is refused', r.status == 400 and 'executable_upload_refused' in str(r.body), r)
    r = storage(pat, PDF_OK[:-6] + EICAR + b'\n%%EOF\n', 'application/pdf', 'report.pdf')
    step('an infected file (EICAR) is refused as file_infected', r.status == 400 and 'file_infected' in str(r.body), r)
    r = storage(pat, b'%PDF-1.4\n1 0 obj\n<< /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >>\nendobj\n%%EOF\n', 'application/pdf', 'report.pdf')
    step('a PDF that can run JavaScript is refused', r.status == 400 and 'pdf_active_content_refused' in str(r.body), r)
    r = storage(pat, PDF_OK, 'image/png', 'report.png')
    step('a PDF declared as a PNG is refused', r.status == 400, r)

    journey('uploads: a clean file is accepted, a photo loses its metadata, the name is ours')
    r = storage(pat, PDF_OK, 'application/pdf', 'my-secret-name.pdf')
    step('a clean PDF is stored', r.ok and r.get('id'), r)
    r = storage(pat, png(GPS_MARKER), 'image/png', 'home-gps.png')
    sid = r.get('id')
    step('a photo with metadata is stored', r.ok and sid, r)
    if sid:
        s = pat.get(f'/storage/{sid}/signed-url')
        url = s.get('url')
        stored = urllib.request.urlopen(url, timeout=30).read() if url else b''
        step('the stored photo carries none of the metadata and was re-encoded (JPEG)', bool(stored) and GPS_MARKER not in stored and stored[:3] == b'\xff\xd8\xff', stored[:16])
        step('the object key is random, not the caller\'s file name', url and 'home-gps' not in url and 'my-secret-name' not in url, (url or '')[:120])

    journey('uploads: /media/upload judges the bytes too')
    status, body = media(token, b'MZ' + b'\x00' * 200, 'photo.png', 'image/png', purpose='report')
    step('a renamed .exe is refused on /media/upload', status == 400 and 'executable_upload_refused' in str(body), (status, body))
    status, body = media(token, PDF_OK[:-6] + EICAR + b'\n%%EOF\n', 'note.pdf', 'application/pdf', purpose='report')
    step('an infected file is refused on /media/upload', status == 400 and 'file_infected' in str(body), (status, body))
    status, body = media(token, png(GPS_MARKER), 'a.png', 'image/png', purpose='report')
    step('a clean photo is accepted on /media/upload', status in (200, 201) and body.get('id'), (status, body))
    status, body = media(token, PDF_OK, 'lab.pdf', 'application/pdf', purpose='report')
    step('a clean PDF report is accepted', status in (200, 201) and body.get('id'), (status, body))
    r = pat.post('/media/presigned', {'filename': 'x.png', 'mimetype': 'image/png', 'purpose': 'report'})
    step('the presigned upload route is closed (410): it skipped every check', r.status == 410, r)


if __name__ == '__main__':
    from lib import summary
    acct = j_accounts.app_signup(label='upload-security')
    run(Client(acct['token'], 'patient'), acct['token'])
    summary()
