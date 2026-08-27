# PR-D — خصوصية البث ومؤلف العرض

| الضبط | النتيجة |
|---|---|
| DTO البث | يعيد ID مبهم، round/radius/lock/deadline، payment summary، وitem ID/name/quantity/matched SKU فقط. لا يعيد patient ID/phone/address/raw order/attachments، وحذفت generic name/dosage/form لغياب سياسة minimum-necessary موثقة. |
| الوصول | القائمة والتفاصيل يفرضان pharmacy account approved/active وعضوية notified recipient؛ الاختبارات تغطي provider غير صيدلية، pending، guessed ID وغير notified. |
| المرفقات | لا يوجد attachment أو signed URL ضمن DTO أو composer. يبقى هذا surface unavailable حتى عقد purpose/scoped URL/audit مستقل. |
| composer | يربط UI بالكتالوج، quantity وsubstitute وserver quote preview/TTL، ولا يقبل manual price/fee/ETA. تعرض delivery policy unavailable صراحةً. |
| التسليم | out-for-delivery/delivered غير متاحين صراحةً إلى حين policy/purpose وcollection/settlement contract. |

## الأدلة المحلية

`npm run build` ناجح. `pharmacy-broadcast.service.spec.ts` و`pharmacy-offer.service.spec.ts` نجحتا بـ17 اختباراً. لم تُشغّل component/API integration أو signed storage أو device/E2E.
