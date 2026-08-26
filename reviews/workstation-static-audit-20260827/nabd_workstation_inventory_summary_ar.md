# جرد ساكن لمصدر workstation وسجل التغييرات

> هذا الجرد قرأ metadata وbytes للملفات فقط ولم يشغل أو يثبت أو يستورد أي كود من workstation. وجود commit أو ملف أو نص لا يثبت اكتمال وظيفة أو أمان أو تشغيل إنتاجي.

- commits بعد seed `4194495`: **77**.
- commits المذكورة في السرد المرفق: **52**.
- ملفات المصدر/التكوين/التوثيق المفهرسة بعد استبعاد dependencies/build: **1842**.

## توزيع الملفات المتاحة

| المجموعة | عدد الملفات |
|---|---:|
| backend | 773 |
| delivery_ops | 8 |
| documentation | 12 |
| patient_mobile | 566 |
| patient_web | 487 |
| shared_packages | 7 |
| tests | 276 |

## عدد commits التي مست كل مجموعة

| المجموعة | commits |
|---|---:|
| backend | 25 |
| backend+delivery_ops | 1 |
| backend+tests | 6 |
| delivery_ops | 1 |
| documentation | 22 |
| patient_mobile | 6 |
| patient_web | 39 |
| patient_web+delivery_ops | 4 |
| patient_web+tests | 4 |
| root_or_other | 1 |
| shared_packages | 3 |
| shared_packages+tests | 1 |

## حدود الإثبات

لا يثبت هذا الجرد أن المسارات أو الشاشات أو العقود أو الحماية أو التكاملات اكتملت. وخصوصاً، يبقى Provider غير قابل للمراجعة لأن مدخل `provider` رابط رمزي يشير إلى مصدر غير موجود في الأرشيف. انظر ملفات CSV المصاحبة للتفاصيل الكاملة لكل commit وملف.
