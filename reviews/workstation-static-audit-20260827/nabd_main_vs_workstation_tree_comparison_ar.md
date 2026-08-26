# مقارنة ساكنة بين شجرة GitHub main وworkstation

> قورنت مسارات Git وبصمات blob فقط بين شجرتين غير متصلتين تاريخياً؛ النتيجة لا تساوي diff قابل للدمج ولا تثبت السلوك أو الأمان.

- main ref: `22526bedb77a3d8148219036367e4714f401aecc`
- workstation ref: `51a84c76a690f30baac8b4bb3df6ab575aad4520`

| الحالة | عدد المسارات |
|---|---:|
| DIFFERENT_BLOB | 1 |
| MAIN_ONLY | 360 |
| WORKSTATION_ONLY | 1970 |

## التوزيع حسب المكوّن

| المكوّن | identical | different | workstation only | main only |
|---|---:|---:|---:|---:|
| backend | 0 | 0 | 809 | 0 |
| delivery_ops | 0 | 0 | 1 | 0 |
| patient_mobile | 0 | 0 | 633 | 0 |
| patient_web | 0 | 0 | 513 | 0 |
| provider | 0 | 0 | 1 | 0 |
| root_or_other | 0 | 1 | 8 | 360 |
| shared_packages | 0 | 0 | 5 | 0 |

المسارات المصنفة `WORKSTATION_ONLY` أو `DIFFERENT_BLOB` ليست دليلاً على جودة أو قابلية دمج؛ وتبقى مشروطة بمراجعة الحزمة واختبارها.
