
## Web BFF recheck

استخدمت `/api/auth/login` على `https://nabd.plus` بحساب Sandbox owner، فنجح login بحالة `200`. عند طلب `/ar/nursing/visits` بالـhttpOnly cookie أعاد الموقع المنشور `404`. هذا يثبت أن صفحة Nursing visits المضافة في الفرع ليست منشورة على production بعد، وليس حكماً على عقد backend أو ownership. يلزم نشر الدفعة ثم إعادة الفحص الحي. لم يتم تنفيذ mutation أو استخراج token.
