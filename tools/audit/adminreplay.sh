#!/bin/bash
B=http://127.0.0.1:8002/api/v1
T=$(python3 -c "import json;print(json.load(open('/home/claude/aud/admin_login.json'))['token']['accessToken'])")
AH="authorization: Bearer $T"; XB="x-admin-bff:next-pages-router"; XD="x-admin-device:auditdevice0123456789abcdef"; CT="content-type:application/json"
post(){ curl -s -X POST "$B$1" -H "$AH" -H "$XB" -H "$XD" -H "$CT" -d "$2" -w " [%{http_code}]"; }
put(){ curl -s -X PUT "$B$1" -H "$AH" -H "$XB" -H "$XD" -H "$CT" -d "$2" -w " [%{http_code}]"; }
patch(){ curl -s -X PATCH "$B$1" -H "$AH" -H "$XB" -H "$XD" -H "$CT" -d "$2" -w " [%{http_code}]"; }
del(){ curl -s -X DELETE "$B$1" -H "$AH" -H "$XB" -H "$XD" -H "$CT" -w " [%{http_code}]"; }
idof(){ python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('id') or d.get('data',{}).get('id') or '')" 2>/dev/null; }
echo "LABS create:"; R=$(post /labs/admin/catalog '{"name_ar":"تحليل تدقيق","name_en":"Audit Test","category":"blood","price":120,"popularity":50}'); echo "$R"|head -c 160; ID=$(echo "$R"|sed 's/ \[.*//'|idof); echo " id=$ID"
echo "LABS edit:"; put /labs/admin/catalog/$ID '{"price":99}'|tail -c 60; echo
echo "LABS delete:"; del /labs/admin/catalog/$ID|tail -c 60; echo
echo "RADIOLOGY create:"; post /radiology/admin/catalog '{"name_ar":"أشعة تدقيق","name_en":"Audit Scan","category":"ct","modality":"ct","price":300}'|tail -c 90; echo
echo "NURSING create:"; post /nursing/admin/catalog '{"name_ar":"تمريض تدقيق","name_en":"Audit Nurse","category":"nursing","duration":"hour","price":150}'|tail -c 90; echo
echo "MEDICINE create:"; R=$(post /medicines/admin/catalog '{"name_ar":"دواء تدقيق","name_en":"Audit Drug","price":25,"requires_prescription":false}'); echo "$R"|tail -c 90; MID=$(echo "$R"|sed 's/ \[.*//'|idof)
echo "MEDICINE price-history edit:"; patch "/medicines/admin/catalog/$MID" '{"price":30,"reason":"audit price change"}'|tail -c 70; echo
echo "INSURANCE company create:"; post /insurance/companies '{"code":"AUDIT","name_ar":"شركة تدقيق","name_en":"Audit Co"}'|tail -c 90; echo
echo "LOYALTY config PUT:"; put /loyalty/config '{"points_per_order":10,"referral_points":50}'|tail -c 90; echo
echo "LEGAL policy PUT:"; put /admin/legal/policy/privacy '{"content_ar":"سياسة الخصوصية المحدثة","change_note":"audit"}'|tail -c 90; echo
echo "COMMISSION PUT:"; put /admin/finance/commissions '{"service_types":{"pharmacy":{"percent":12}}}'|tail -c 90; echo
echo "ARTICLE create:"; post /admin/articles '{"title_ar":"مقال تدقيق","title_en":"Audit Article","body_ar":"محتوى","status":"PUBLISHED"}'|tail -c 90; echo
