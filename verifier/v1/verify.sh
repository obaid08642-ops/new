#!/bin/bash
# Verifier v1 — جرد وفحص مشروع نبض
# Exit 0 = كل الفحوصات الأساسية مرت، Exit 1 = يوجد فشل
ROOT="/mnt/agents/output/nabd/extracted"
PATIENT="$ROOT/nabd_plus-patient/nabd_plus"
PROVIDER="$ROOT/NabdProvider-provider/NabdProvider"
ADMIN="$ROOT/Napd-admin-dashboard/Napd-admin"
BACKEND="$ROOT/nabdah-backend/nabdah-backend"
FAIL=0

echo "========================================"
echo " VERIFIER v1 — $(date -u +%FT%TZ)"
echo "========================================"

echo ""
echo "--- [1] عدد الشاشات/الصفحات الفعلي ---"
P_SCREENS=$(find "$PATIENT/app" "$PATIENT/src" -name "*.tsx" 2>/dev/null | grep -viE "test|__tests__" | wc -l)
PR_SCREENS=$(find "$PROVIDER/src" "$PROVIDER/App.tsx" -name "*.tsx" 2>/dev/null | grep -viE "test|__tests__" | wc -l)
A_PAGES=$(find "$ADMIN" -path "*/node_modules" -prune -o -name "page.tsx" -print 2>/dev/null | wc -l)
B_MODULES=$(find "$BACKEND/src" -name "*.module.ts" 2>/dev/null | wc -l)
echo "مريض tsx: $P_SCREENS (مُعلن 239)"
echo "مزود tsx: $PR_SCREENS (مُعلن 114)"
echo "أدمن page.tsx: $A_PAGES (مُعلن 23+)"
echo "باك إند modules: $B_MODULES (مُعلن 97)"

echo ""
echo "--- [2] عدد الـ Routes في الباك إند ---"
B_ROUTES=$(grep -rhoE "@(Get|Post|Put|Patch|Delete|All)\(" "$BACKEND/src" --include="*.controller.ts" 2>/dev/null | wc -l)
echo "HTTP route handlers: $B_ROUTES (مُعلن 1122)"

echo ""
echo "--- [3] TODO / FIXME / Placeholder / Mock / Dummy في كود الإنتاج ---"
for comp in "$PATIENT:مريض" "$PROVIDER:مزود" "$ADMIN:أدمن" "$BACKEND:باك"; do
  dir="${comp%%:*}"; label="${comp##*:}"
  n=$(grep -rniE "TODO|FIXME|placeholder|dummy data|mock data|fake number|hardcoded" "$dir" \
      --include="*.ts" --include="*.tsx" --include="*.js" 2>/dev/null \
      | grep -viE "node_modules|__tests__|\.test\.|\.spec\.|test_reports|/memory/|/docs/|README|dist/" | wc -l)
  echo "$label: $n موضع"
  [ "$n" -gt 0 ] && FAIL=1
done

echo ""
echo "--- [4] فحص Secrets/Tokens مسرّبة داخل الكود ---"
SECRETS=$(grep -rniE "ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY|sk_live_|AIza[0-9A-Za-z_-]{35}" "$ROOT" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" --include="*.env*" 2>/dev/null \
  | grep -viE "node_modules|package-lock|\.git/|example|EXAMPLE" | wc -l)
echo "مواضع مشبوهة: $SECRETS"
[ "$SECRETS" -gt 0 ] && FAIL=1

echo ""
echo "--- [5] صحة الـ API الحي ---"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 https://api.nabd.plus/api/v1/health/liveness 2>/dev/null || echo "000")
echo "GET https://api.nabd.plus/api/v1/health/liveness -> $HTTP"
[ "$HTTP" != "200" ] && FAIL=1

echo ""
echo "========================================"
if [ "$FAIL" -eq 0 ]; then echo " RESULT: PASS"; else echo " RESULT: FAIL (راجع التفاصيل أعلاه)"; fi
echo "========================================"
exit $FAIL
