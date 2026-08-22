# Specialty Select — Gate Result

- `pnpm check`: PASS.
- targeted SSR/parser/wrapper: 4 files, 8 tests PASS.
- `pnpm test`: PASS على baseline Web الحالي.
- `pnpm build`: PASS، وظهر route `/[locale]/consultations/specialties`.
- `pnpm test:sandbox`: BLOCKED بيئيًا؛ الاختبار توقف عند غياب `NABD_SANDBOX_BASE_URL`, `NABD_SANDBOX_OWNER_EMAIL`, و`NABD_SANDBOX_OWNER_PASSWORD`. لم يتم تخطيه ولم تُستخدم بيانات بديلة.
- التنفيذ public GET فقط؛ لا booking mutation.
