# Wave 2 — Private Medicines Read-only Parity

## التنفيذ

تم تحديث `/[locale]/medicines` ليستخدم نفس Premium catalogue surface الموجود في public medicine catalogue: hero واضح، search field، vector icons، responsive card grid، prescription badge، وkeyboard/focus states الموروثة من design module.

## العقد والأمان

لم يتغير backend contract. الصفحة ما زالت تستدعي `requirePatientAccess` ثم `getPatientMedicines(token, search)` عبر server boundary، ولا تُرسل token إلى HTML أو browser storage. الحقول المعروضة تأتي من `extractMedicineRows` فقط، ولا يتم عرض price أو patient data أو availability guarantee. رابط detail بقي إلى public allowlisted catalogue detail كما كان.

## التحقق

| الفحص | النتيجة |
|---|---|
| medicines SSR boundary | 2/2 Pass |
| medicines parser | 2/2 Pass |
| TypeScript | Pass |
| production build | Pass |
| diff check | Pass |
