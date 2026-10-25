"""Journey: support chat (A-13) over the API: send a message, read it back, read the thread state.
Payload copied from backend/src/modules/support/support-chat.controller.ts (POST /support/chat, body field)."""
import time
from lib import Client, journey, step
from j_accounts import app_signup


def run():
    journey('support chat: send and read back (API)')
    pat = app_signup(label='qasup')
    c = Client(pat['token'], 'patient-api')
    text = f'QA support message {int(time.time())}'
    r = c.post('/support/chat', {'body': text})
    step('send support message', r.ok, r)
    r = c.get('/support/chat/messages')
    msgs = r.body if isinstance(r.body, list) else (r.body or {}).get('items', (r.body or {}).get('messages', []))
    step('message read back in the thread', r.ok and any(m.get('body') == text and m.get('from') == 'patient' for m in msgs), str(msgs)[-200:])
    r = c.get('/support/chat/state')
    step('chat state reads', r.ok, r)


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
