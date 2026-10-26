"""Journey (QA A-09): family members, API and MongoDB, from creation to removal.
  owner creates the group; a member joins with the invite code (POST /family/join); the owner lists members, sets the
  relation, and removes the member (DELETE /family/remove-member/:userId). The member loses the family calendar.
  Every write is checked in MongoDB (family_groups, family_members). Routes: modules/family/family.controller.ts."""
import json
import subprocess

from lib import Client, journey, step


def mongo_json(js):
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', 'nabd_live', '--eval', f'JSON.stringify({js})'],
                         capture_output=True, text=True).stdout.strip()
    return json.loads(out) if out and out != 'null' else None


def group_row(owner_id):
    return mongo_json(f'db.family_groups.findOne({{owner_id: "{owner_id}"}}, {{_id: 0, owner_id: 1, name: 1, invite_code: 1}})')


def main():
    import j_accounts
    owner_acct = j_accounts.app_signup(label='family-owner')
    member_acct = j_accounts.app_signup(label='family-member')
    owner = Client(owner_acct['token'], 'patient')
    member = Client(member_acct['token'], 'patient')
    owner_id = owner.get('/auth/me').get('id')
    member_id = member.get('/auth/me').get('id')

    journey('family A-09: the owner creates a family group')
    r = owner.post('/family/create', {'name': 'عائلة QA'})
    step('the owner creates the family group', r.ok, r)
    grp = group_row(owner_id)
    step('MongoDB: the family group exists for the owner', bool(grp) and grp.get('name') == 'عائلة QA', f'owner {owner_id} group {grp}')
    r = owner.post('/family/invite', {})
    code = r.get('invite_code')
    step('the owner gets an invite code', r.ok and bool(code), r)

    journey('family A-09: a member joins with the invite code')
    r = member.post('/family/join', {'invite_code': code, 'display_name': 'ابن QA', 'relation': 'son'})
    step('the member joins the family', r.ok, r)
    ids = [m.get('user_id') for m in (mongo_json(f'db.family_groups.findOne({{owner_id: "{owner_id}"}}, {{_id: 0, members: 1}})') or {}).get('members', [])]
    step('MongoDB: the member is in the owner\'s family group', member_id in ids, f'member {member_id} in {ids}')
    r = owner.get('/family/members')
    members = r.body if isinstance(r.body, list) else r.items()
    if not members and isinstance(r.body, dict):
        members = r.body.get('members') or r.body.get('data') or []
    step('the owner lists the member', r.ok and any((m.get('user_id') or m.get('id')) == member_id for m in members), r.status)
    r = member.get('/family/calendar')
    step('the member can read the family calendar', r.ok, r)

    journey('family A-09: the owner removes the member')
    r = owner.patch(f'/family/member/{member_id}/relation', {'relation': 'daughter'})
    step('the owner changes the member relation', r.ok, r)
    mem = next((m for m in (mongo_json(f'db.family_groups.findOne({{owner_id: "{owner_id}"}}, {{_id: 0, members: 1}})') or {}).get('members', []) if m.get('user_id') == member_id), None)
    step('MongoDB: the relation is saved on the member', bool(mem) and mem.get('relation') == 'daughter', mem)
    r = owner.delete(f'/family/remove-member/{member_id}')
    step('the owner removes the member', r.ok, r)
    ids = [m.get('user_id') for m in (mongo_json(f'db.family_groups.findOne({{owner_id: "{owner_id}"}}, {{_id: 0, members: 1}})') or {}).get('members', [])]
    step('MongoDB: the member is gone from the family group', member_id not in ids, f'{ids}')
    r = member.get('/family/calendar')
    step('the removed member no longer reads the family calendar', r.status == 404 and 'not part of a family group' in str(r.body).lower(), r)


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
