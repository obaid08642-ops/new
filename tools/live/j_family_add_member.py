"""Journey (scenario PT-02, family members): a patient creates a family group, makes an invite code, and a second patient
joins with it. The group then lists both people.
  - POST /family/create (the owner's group)
  - POST /family/invite (no channel: an invite code)
  - POST /family/join {invite_code, display_name, relation} (the second patient)
  - GET /family/my-group (the owner sees the new member)
  Stack: backend :8002. TEST database only.
"""
from lib import Client, journey, step, summary


def members(group):
    body = group.body if isinstance(group.body, dict) else {}
    g = body.get('group') or body
    return g.get('members') or []


def run():
    import j_accounts
    owner = Client(j_accounts.app_signup(label='family-owner')['token'], 'patient')
    member_acct = j_accounts.app_signup(label='family-member')
    member = Client(member_acct['token'], 'patient')

    journey('family: the owner creates a group and an invite (PT-02)')
    r = owner.post('/family/create', {'name': 'عائلة اختبار'})
    step('the owner creates the family group (POST /family/create)', r.ok, r)
    r = owner.post('/family/invite', {})
    body = r.body if isinstance(r.body, dict) else {}
    code = body.get('invite_code') or body.get('code') or (body.get('invite') or {}).get('code')
    step('the owner gets an invite code (POST /family/invite)', r.ok and bool(code), r)
    if not code:
        return summary()

    journey('family: a second patient joins and the owner sees them (PT-02)')
    r = member.post('/family/join', {'invite_code': code, 'display_name': 'qa member', 'relation': 'child'})
    step('the second patient joins with the invite code (POST /family/join)', r.ok, r)
    r = owner.get('/family/my-group')
    step('the owner sees the group with the new member', r.ok and len(members(r)) >= 2, r)
    summary()


if __name__ == '__main__':
    run()
