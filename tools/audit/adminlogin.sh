cd /home/claude/repo/backend; B=http://127.0.0.1:8002/api/v1; K=auth:otp:login-2fa:audit.admin@example.com
redis-cli del $K ratelimit:auth:otp:issue:audit.admin@example.com >/dev/null
curl -s -X POST $B/auth/login -H 'content-type: application/json' -d '{"identifier":"audit.admin@example.com","email":"audit.admin@example.com","password":"Audit#Pass2026"}' >/dev/null
H=$(node -e "console.log(require('bcryptjs').hashSync('123456',10))"); U=$(redis-cli get $K | python3 -c "import sys,json;print(json.load(sys.stdin)['user_id'])")
redis-cli set $K "{\"code_hash\":\"$H\",\"user_id\":\"$U\",\"attempts\":0}" EX 600 >/dev/null
curl -s -X POST $B/auth/login/verify-2fa -H 'content-type: application/json' -d '{"identifier":"audit.admin@example.com","code":"123456"}' > /home/claude/aud/admin_login.json
python3 -c "import json;print('admin token ok' if json.load(open('/home/claude/aud/admin_login.json')).get('token') else 'FAIL')"
