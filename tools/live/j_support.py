"""Journey: support, patient-app support/chat.tsx + support/ticket.tsx + settings/privacy (data deletion request)
-> admin support-tickets.tsx (list, status, reply) -> the patient sees the reply in the chat."""
from lib import Client, journey, step


def rows(r):
    return r.body if isinstance(r.body, list) else r.items()


def run(pat, admin):
    journey('support: patient chats with support (chat.tsx)')
    r = pat.post('/support/chat', {'message': 'لم يصلني طلب الصيدلية'})
    tid = r.get('ticket_id')
    step('first message opens a conversation and gets an acknowledgement', r.ok and tid and r.get('reply'), r)
    r = pat.post('/support/chat', {'message': 'رقم الطلب في التطبيق'})
    step('the next message joins the same conversation', r.ok and r.get('ticket_id') == tid, r)
    r = pat.get('/support/chat')
    msgs = rows(r)
    step('chat shows both messages as {from,text}', r.ok and len(msgs) >= 2 and all(m.get('text') and m.get('from') for m in msgs), r)

    journey('support: data deletion request (settings/privacy.tsx)')
    r = pat.post('/support/requests', {'type': 'data_deletion', 'subject': 'طلب حذف البيانات الشخصية نهائياً',
                                       'message': 'أطلب حذف جميع بياناتي الشخصية نهائياً من منصة نبض وفق سياسة الخصوصية.'})
    did = r.get('id')
    step('deletion request filed', r.ok and did, r)
    r = pat.get('/support/requests/mine')
    step('ticket screen lists both tickets', r.ok and tid in str(r.body) and did in str(r.body), r)

    journey('support: admin answers (support-tickets.tsx)')
    r = admin.get('/support/admin/requests')
    step('admin sees the tickets', r.ok and tid in str(r.body), r)
    r = admin.patch(f'/support/admin/requests/{tid}', {'status': 'IN_PROGRESS'})
    step('admin moves the chat to in progress', r.ok, r)
    r = admin.post(f'/support/requests/{tid}/reply', {'message': 'نعتذر عن التأخير، الطلب في الطريق وسيصلك خلال ساعة'})
    step('admin replies', r.ok, r)
    r = pat.get('/support/chat')
    step('the patient sees the agent reply in the chat', r.ok and any(m.get('from') == 'agent' and 'نعتذر' in str(m.get('text')) for m in rows(r)), r)
    r = pat.post('/support/chat', {'message': 'شكراً'})
    step('patient answers in the same conversation', r.ok and r.get('ticket_id') == tid, r)
    r = admin.patch(f'/support/admin/requests/{tid}', {'status': 'RESOLVED'})
    step('admin resolves it', r.ok, r)
    r = pat.post('/support/chat', {'message': 'مشكلة جديدة'})
    step('a message after resolution opens a new conversation', r.ok and r.get('ticket_id') != tid, r)

    journey('support: another patient cannot read or reply')
    other = Client(__import__('j_accounts').app_signup(label='nosy')['token'], 'patient')
    r = other.get(f'/support/requests/{tid}')
    step('another patient cannot open the ticket', r.status in (403, 404), r)
    r = other.post(f'/support/requests/{tid}/reply', {'message': 'x'})
    step('another patient cannot reply', r.status in (403, 404), r)
    for path in ('/support/faqs', '/support/tickets', '/support/settings'):
        r = pat.get(path)
        step(f'GET {path}', r.ok, r)


if __name__ == '__main__':
    import j_admin, j_accounts
    from lib import summary
    admin, _ = j_admin.login()
    pat = j_accounts.app_signup(label='support-patient')
    run(Client(pat['token'], 'patient'), admin)
    summary()
