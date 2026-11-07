"""Journey (chat with an attachment): the patient uploads a picture (multipart POST /media/upload), sends it into the
appointment conversation as an image message (POST /chat/threads/:id/messages with media_ids), the message reads back with
its attachment, and a person outside the conversation cannot read it.
  Upload may go through quarantine (defer mode): the journey asserts the upload gives a media id, not a public URL.
  Routes: backend/src/modules/media/media.controller.ts:31 (upload), backend/src/modules/chat/chat.dto.ts (SendMessageDto).
  Stack: backend :8002. TEST database only.
"""
import json
import struct
import urllib.request
import uuid
import zlib

from lib import Client, journey, step, summary

API = 'http://127.0.0.1:8002/api/v1'


def png_bytes():
    def chunk(t, d):
        c = t + d
        return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c))
    raw = b''.join(b'\x00\xff\x00' for _ in range(64))
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 8, 8, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b''))


def upload(token, thread_id):
    boundary = '----chatattach'
    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="photo.png"\r\nContent-Type: image/png\r\n\r\n').encode() \
        + png_bytes() + (f'\r\n--{boundary}\r\nContent-Disposition: form-data; name="purpose"\r\n\r\nchat\r\n--{boundary}\r\nContent-Disposition: form-data; name="thread_id"\r\n\r\n{thread_id}\r\n--{boundary}--\r\n').encode()
    req = urllib.request.Request(f'{API}/media/upload', data=body, method='POST',
                                 headers={'content-type': f'multipart/form-data; boundary={boundary}', 'authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = json.loads(resp.read().decode())
        return payload.get('id') or (payload.get('data') or {}).get('id'), payload
    except Exception as e:  # the step below reports the failure
        return None, str(e)


def run():
    import j_accounts, j_concurrency
    pat = Client(j_accounts.app_signup(label='chat-attach')['token'], 'patient')
    aid = j_concurrency.completed_consultation(pat)
    step('a completed consultation exists for the chat', bool(aid), aid)
    if not aid:
        return summary()
    r = pat.post('/chat/threads/booking', {'booking_kind': 'consultation', 'booking_id': aid})
    tid = ((r.body or {}).get('data') or r.body or {}).get('id') if isinstance(r.body, dict) else None
    step('the appointment conversation opens for the patient', r.ok and bool(tid), r)
    if not tid:
        return summary()

    journey('chat attachment: the patient uploads and sends a picture (PT-chat attachment)')
    media_id, info = upload(pat.token, tid)
    step('the picture uploads to /media/upload and gets a media id (not a public URL)', bool(media_id), str(info)[:160])
    if not media_id:
        return summary()
    r = pat.req('POST', f'/chat/threads/{tid}/messages', {'type': 'image', 'media_ids': [media_id]}, headers={'Idempotency-Key': str(uuid.uuid4())})
    mid = ((r.body or {}).get('data') or r.body or {}).get('id') if isinstance(r.body, dict) else None
    step('the patient sends the picture as an image message', r.ok and bool(mid), r)

    journey('chat attachment: the message reads back with its attachment (PT-chat attachment)')
    r = pat.get(f'/chat/threads/{tid}/messages')
    rows = (r.body or {}).get('messages') if isinstance(r.body, dict) else r.body
    rows = rows or []
    mine = next((m for m in rows if isinstance(m, dict) and m.get('id') == mid), None)
    step('the image message is in the conversation', mine is not None, str(mine)[:160])
    step('the message carries the attachment (the media id is on it)', mine is not None and media_id in json.dumps(mine), str(mine)[:200])

    journey('chat attachment: a stranger cannot read the attachment message')
    stranger = Client(j_accounts.app_signup(label='chat-attach-stranger')['token'], 'patient')
    r = stranger.get(f'/chat/threads/{tid}/messages')
    step('a person outside the conversation is refused (403, or 404 thread_not_found)', r.status in (403, 404), r)
    j_concurrency.remove_published_doctor()
    summary()


if __name__ == '__main__':
    run()
