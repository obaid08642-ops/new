# Wave 2 — Pharmacy / Medicines Boundary Audit

## النطاق

تمت مراجعة شاشات Pharmacy في React Native، بما في ذلك البحث، product detail، cart، checkout، payment، prescription upload، order tracking، wishlist، pharmacist chat، barcode scanner، وmanual order. Web يملك `medicine-catalog` و`medicines/[medicineId]` كتصفح published catalogue/detail فقط.

## القرار

لم تتم إضافة cart، wishlist، prescription upload، order creation، payment، chat، scanner، أو tracking. هذه أفعال/بيانات خاصة تتطلب عقودًا مثبتة للهوية والملكية والـauthorization وprice integrity وupload security وpayment/CSRF.

`availabilityStatus` موجود في parser لكنه غير معروض؛ وهذا مقصود لأن عقد public catalogue لا يضمن التوفر ولا السعر، ورسائل الواجهة تمنع عرض availability guarantee أو purchase information.

## النتيجة

Pharmacy parity: **read-only catalogue/detail implemented; transactional parity blocked**. لا fallback أو سعر أو صورة أو مخزون وهمي أُضيف.
