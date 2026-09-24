#!/bin/bash
cd /home/claude/aud; B=http://127.0.0.1:8002/api/v1
T=$(python3 -c "import json;print(json.load(open('admin_login.json'))['token']['accessToken'])")
A=(-H "authorization: Bearer $T" -H "x-admin-bff:next-pages-router" -H "x-admin-device:auditdevice0123456789abcdef" -H "content-type:application/json")
P=6283ef6a-cc94-46e0-98c8-33d118661e2d; UID_=dff66c6d-faff-4124-a0b6-b6f5a0c36716
plogin(){ curl -s -m 10 -X POST $B/provider/auth/login -H 'content-type: application/json' -d '{"phone":"+966542223344","email":"doc.audit@example.com","password":"Doc#Pass2026"}' | head -c 90; echo; }
echo "suspend provider: $(curl -s -m 10 -X POST $B/admin/providers/$P/suspend "${A[@]}" -d '{"reason":"t"}' -o /dev/null -w '%{http_code}')"; echo -n "provider login: "; plogin
echo "users-page Reactivate (unban user $UID_): $(curl -s -m 10 -X POST $B/admin/users/$UID_/unban "${A[@]}" -d '{}')"; echo -n "provider login after users-page reactivate: "; plogin
echo "users-page Reactivate with provider account id: $(curl -s -m 10 -X POST $B/admin/users/$P/unban "${A[@]}" -d '{}')"; echo -n "provider login: "; plogin
