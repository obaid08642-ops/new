#!/bin/bash
cd /home/claude/aud; bash adminlogin.sh >/dev/null; B=http://127.0.0.1:8002/api/v1
T=$(python3 -c "import json;print(json.load(open('admin_login.json'))['token']['accessToken'])")
A=(-H "authorization: Bearer $T" -H "x-admin-bff:next-pages-router" -H "x-admin-device:auditdevice0123456789abcdef" -H "content-type:application/json")
U=f975801f-d5f2-4956-88cd-e784be481cec
login(){ curl -s -X POST $B/auth/login -H 'content-type: application/json' -d '{"phone":"+966500000001","password":"Audit#Pass2026"}' | head -c 80; echo; }
echo "ban: $(curl -s -X POST $B/admin/users/$U/ban "${A[@]}" -d '{"reason":"t"}')"; echo -n "login after ban: "; login
echo "unban: $(curl -s -X POST $B/admin/users/$U/unban "${A[@]}" -d '{}')"; echo -n "login after unban: "; login
echo "--- toggle route:"; echo "toggle: $(curl -s -X POST $B/users/$U/toggle "${A[@]}" -d '{}' -w ' [%{http_code}]' | tail -c 120)"; echo -n "login after toggle: "; login
echo "toggle again: $(curl -s -X POST $B/users/$U/toggle "${A[@]}" -d '{}' -w ' [%{http_code}]' | tail -c 120)"; echo -n "login after 2nd toggle: "; login
echo "--- provider suspend/reactivate:"; P=6283ef6a-cc94-46e0-98c8-33d118661e2d
echo "suspend: $(curl -s -X POST $B/admin/providers/$P/suspend "${A[@]}" -d '{"reason":"t"}' -o /dev/null -w '%{http_code}')"
for act in reactivate unsuspend activate approve; do echo "$act: $(curl -s -X POST $B/admin/providers/$P/$act "${A[@]}" -d '{}' -w ' [%{http_code}]' | tail -c 100)"; done
echo -n "provider login after: "; curl -s -X POST $B/provider/auth/login -H 'content-type: application/json' -d '{"phone":"+966542223344","email":"doc.audit@example.com","password":"Doc#Pass2026"}' | head -c 100; echo
