# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/web-mock-placeholder-scan.txt`
- **Member SHA-256:** `df12499d5d3a257f2c5c2cb5869617e5616308694eb94d58843a96e88686b5f5`
- **Line count:** 280
- **Read range:** `1-280`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: components-next/retry-button.test.tsx:6:vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: state.refresh }) }));`
- `2: components-next/retry-button.test.tsx:7:vi.mock("next-intl", () => ({ useTranslations: () => () => "retry" }));`
- `44: app/[locale]/home-care/services/services-ssr.test.ts:12:  it("renders public list fields only", async () => { state.list.mockResolvedValue(new Response(JSON.stringify([{ id: "svc-1", name_en: "Home nursing", price: 120, patient_id: "private`
- `45: app/[locale]/home-care/services/services-ssr.test.ts:13:  it("renders detail without creating a booking or fallback data", async () => { state.detail.mockResolvedValue(new Response(JSON.stringify({ data: { id: "svc-1", name_en: "Home nursin`
- `49: app/[locale]/consultations/doctors/doctors-ssr.test.ts:2:const state=vi.hoisted(()=>({get:vi.fn()})); vi.mock("next-intl/server",()=>({getTranslations:async()=> (k:string)=>k,setRequestLocale:vi.fn()})); vi.mock("@/lib/i18n",()=>({isLocale:`
- `50: app/[locale]/consultations/doctors/doctors-ssr.test.ts:3:describe("doctors SSR",()=>{beforeEach(()=>state.get.mockReset());it("renders public doctor fields without private data",async()=>{state.get.mockResolvedValue(new Response(JSON.string`
- `51: app/api/appointments/[appointmentId]/call-token/route.test.ts:3:vi.mock("@/lib/api/upstream",()=>({callPatientApi:state.call})); vi.mock("next/headers",()=>({cookies:async()=>state.cookies}));`
- `52: app/api/appointments/[appointmentId]/call-token/route.test.ts:6:describe("call-token BFF",()=>{beforeEach(()=>{state.call.mockReset();state.cookies.get.mockImplementation((n:string)=>n==="nabd_access"?{value:"server-access"}:undefined)});it`
- `53: app/[locale]/consultations/doctors/page.tsx:17:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("su`
- `64: app/api/appointments/[appointmentId]/reschedule/route.test.ts:3:vi.mock("@/lib/api/upstream",()=>({callPatientApi:state.call})); vi.mock("next/headers",()=>({cookies:async()=>state.cookies}));`
- `65: app/api/appointments/[appointmentId]/reschedule/route.test.ts:7:describe("appointment reschedule BFF",()=>{beforeEach(()=>{state.call.mockReset();state.cookies.get.mockImplementation((n:string)=>n==="nabd_access"?{value:"server-access"}:und`
- `66: app/[locale]/consultations/specialties/page.tsx:31:    <form className={styles.search} method="get" role="search"><Search size={18} aria-hidden="true" /><label className="sr-only" htmlFor="specialty-search">{t("searchLabel")}</label><input `
### backend_consumers_or_contracts
- `3: lib/api/radiology-server.test.ts:3:vi.mock("@/lib/api/upstream", () => ({ callPatientApi: call }));`
- `4: lib/api/radiology-server.test.ts:10:    const path = call.mock.calls[0][0] as string; expect(path).toContain("modality=mri"); expect(path).toContain("body_part=brain"); expect(path).not.toContain("evil"); expect(call.mock.calls[0][1]).not.t`
- `5: lib/api/labs-server.test.ts:3:const fetchMock = vi.fn();`
- `6: lib/api/labs-server.test.ts:4:vi.stubGlobal("fetch", fetchMock);`
- `7: lib/api/labs-server.test.ts:5:vi.mock("@/lib/api/upstream", () => ({ patientApiUrl: (path: string) => `https://api.test${path}` }));`
- `8: lib/api/labs-server.test.ts:10:  beforeEach(() => fetchMock.mockReset());`
- `9: lib/api/labs-server.test.ts:12:    fetchMock.mockResolvedValue(new Response("[]", { status: 200 }));`
- `10: lib/api/labs-server.test.ts:14:    const [url, init] = fetchMock.mock.calls[0];`
- `11: lib/api/doctors-slots-server.test.ts:2:describe("doctor slots wrapper",()=>{const old=globalThis.fetch;beforeEach(()=>{globalThis.fetch=vi.fn().mockResolvedValue(new Response("{}",{status:200}))});afterEach(()=>{globalThis.fetch=old;vi.rest`
- `12: lib/api/doctors-detail-server.test.ts:3:describe("doctor detail wrapper",()=>{const old=globalThis.fetch;beforeEach(()=>{globalThis.fetch=vi.fn().mockResolvedValue(new Response("{}",{status:200}))});afterEach(()=>{globalThis.fetch=old;vi.re`
- `13: lib/api/doctors-server.test.ts:3:describe("public doctors wrapper", () => { const original=globalThis.fetch; beforeEach(()=>{globalThis.fetch=vi.fn().mockResolvedValue(new Response("[]",{status:200}));}); afterEach(()=>{globalThis.fetch=ori`
- `14: lib/api/home-care-services-server.test.ts:6:  beforeEach(() => { globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 })); });`
### auth_ownership
- `1: components-next/retry-button.test.tsx:6:vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: state.refresh }) }));`
- `12: lib/api/doctors-detail-server.test.ts:3:describe("doctor detail wrapper",()=>{const old=globalThis.fetch;beforeEach(()=>{globalThis.fetch=vi.fn().mockResolvedValue(new Response("{}",{status:200}))});afterEach(()=>{globalThis.fetch=old;vi.re`
- `16: lib/api/home-care-services-server.test.ts:8:  it("does not send Authorization for list", async () => { await getPublicHomeCareServices(); const [, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]; expect(options.heade`
- `44: app/[locale]/home-care/services/services-ssr.test.ts:12:  it("renders public list fields only", async () => { state.list.mockResolvedValue(new Response(JSON.stringify([{ id: "svc-1", name_en: "Home nursing", price: 120, patient_id: "private`
- `51: app/api/appointments/[appointmentId]/call-token/route.test.ts:3:vi.mock("@/lib/api/upstream",()=>({callPatientApi:state.call})); vi.mock("next/headers",()=>({cookies:async()=>state.cookies}));`
- `52: app/api/appointments/[appointmentId]/call-token/route.test.ts:6:describe("call-token BFF",()=>{beforeEach(()=>{state.call.mockReset();state.cookies.get.mockImplementation((n:string)=>n==="nabd_access"?{value:"server-access"}:undefined)});it`
- `53: app/[locale]/consultations/doctors/page.tsx:17:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("su`
- `64: app/api/appointments/[appointmentId]/reschedule/route.test.ts:3:vi.mock("@/lib/api/upstream",()=>({callPatientApi:state.call})); vi.mock("next/headers",()=>({cookies:async()=>state.cookies}));`
- `65: app/api/appointments/[appointmentId]/reschedule/route.test.ts:7:describe("appointment reschedule BFF",()=>{beforeEach(()=>{state.call.mockReset();state.cookies.get.mockImplementation((n:string)=>n==="nabd_access"?{value:"server-access"}:und`
- `66: app/[locale]/consultations/specialties/page.tsx:31:    <form className={styles.search} method="get" role="search"><Search size={18} aria-hidden="true" /><label className="sr-only" htmlFor="specialty-search">{t("searchLabel")}</label><input `
- `68: app/api/appointments/[appointmentId]/cancel/route.test.ts:3:vi.mock("@/lib/api/upstream",()=>({callPatientApi:state.call})); vi.mock("next/headers",()=>({cookies:async()=>state.cookies}));`
- `69: app/api/appointments/[appointmentId]/cancel/route.test.ts:7:describe("appointment cancel BFF",()=>{beforeEach(()=>{state.call.mockReset();state.cookies.get.mockImplementation((n:string)=>n==="nabd_access"?{value:"server-access"}:undefined)}`
### state_transitions
- `1: components-next/retry-button.test.tsx:6:vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: state.refresh }) }));`
- `2: components-next/retry-button.test.tsx:7:vi.mock("next-intl", () => ({ useTranslations: () => () => "retry" }));`
- `9: lib/api/labs-server.test.ts:12:    fetchMock.mockResolvedValue(new Response("[]", { status: 200 }));`
- `11: lib/api/doctors-slots-server.test.ts:2:describe("doctor slots wrapper",()=>{const old=globalThis.fetch;beforeEach(()=>{globalThis.fetch=vi.fn().mockResolvedValue(new Response("{}",{status:200}))});afterEach(()=>{globalThis.fetch=old;vi.rest`
- `12: lib/api/doctors-detail-server.test.ts:3:describe("doctor detail wrapper",()=>{const old=globalThis.fetch;beforeEach(()=>{globalThis.fetch=vi.fn().mockResolvedValue(new Response("{}",{status:200}))});afterEach(()=>{globalThis.fetch=old;vi.re`
- `13: lib/api/doctors-server.test.ts:3:describe("public doctors wrapper", () => { const original=globalThis.fetch; beforeEach(()=>{globalThis.fetch=vi.fn().mockResolvedValue(new Response("[]",{status:200}));}); afterEach(()=>{globalThis.fetch=ori`
- `14: lib/api/home-care-services-server.test.ts:6:  beforeEach(() => { globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 })); });`
- `20: lib/api/specialties-server.test.ts:6:  beforeEach(() => { globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 })); });`
- `29: lib/api/upstream.test.ts:8:    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network timeout")));`
- `32: app/[locale]/medicine-catalog/medicine-catalog-ssr.test.ts:8:vi.mock("@/lib/api/public-medicines-server", () => ({ getPublicMedicines: state.getPublicMedicines }));`
- `33: app/[locale]/medicine-catalog/medicine-catalog-ssr.test.ts:13:  beforeEach(() => state.getPublicMedicines.mockReset());`
- `34: app/[locale]/medicine-catalog/medicine-catalog-ssr.test.ts:16:    state.getPublicMedicines.mockResolvedValue(new Response(JSON.stringify([{ id: "published-medicine", name_en: "Published medicine", active_ingredient: "Ingredient", price: 99,`
### payment_insurance_relevance
- `34: app/[locale]/medicine-catalog/medicine-catalog-ssr.test.ts:16:    state.getPublicMedicines.mockResolvedValue(new Response(JSON.stringify([{ id: "published-medicine", name_en: "Published medicine", active_ingredient: "Ingredient", price: 99,`
- `44: app/[locale]/home-care/services/services-ssr.test.ts:12:  it("renders public list fields only", async () => { state.list.mockResolvedValue(new Response(JSON.stringify([{ id: "svc-1", name_en: "Home nursing", price: 120, patient_id: "private`
- `53: app/[locale]/consultations/doctors/page.tsx:17:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("su`
- `62: app/[locale]/consultations/specialties/specialties-ssr.test.ts:16:    state.getPublicSpecialties.mockResolvedValue(new Response(JSON.stringify({ data: [{ slug: "cardiology", name_ar: "قلب", name_en: "Cardiology", count: 7, patient_id: "priv`
- `65: app/api/appointments/[appointmentId]/reschedule/route.test.ts:7:describe("appointment reschedule BFF",()=>{beforeEach(()=>{state.call.mockReset();state.cookies.get.mockImplementation((n:string)=>n==="nabd_access"?{value:"server-access"}:und`
- `83: app/api/appointments/[appointmentId]/payment-intent/route.test.ts:3:vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));`
- `84: app/api/appointments/[appointmentId]/payment-intent/route.test.ts:4:vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));`
- `85: app/api/appointments/[appointmentId]/payment-intent/route.test.ts:10:  beforeEach(() => { state.callPatientApi.mockReset(); state.cookieStore.get.mockImplementation((name: string) => name === "nabd_access" ? { value: "server-access" } : und`
- `86: app/api/appointments/[appointmentId]/payment-intent/route.test.ts:13:    state.cookieStore.get.mockReturnValue(undefined);`
- `87: app/api/appointments/[appointmentId]/payment-intent/route.test.ts:18:    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ id: "33333333-3333-4333-8333-333333333333", status: "pending", amount: 120, currency: "SAR", clien`
- `88: app/api/appointments/[appointmentId]/payment-intent/route.test.ts:24:    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ message: "not_authorized" }), { status: 400 }));`
- `100: app/api/appointments/book/route.test.ts:24:    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ booking_id: "22222222-2222-4222-8222-222222222222", status: "pending_payment", patient_id: "must-not-leak" }), { status: 201`
### error_empty_loading_retry_cancel
- `1: components-next/retry-button.test.tsx:6:vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: state.refresh }) }));`
- `2: components-next/retry-button.test.tsx:7:vi.mock("next-intl", () => ({ useTranslations: () => () => "retry" }));`
- `29: lib/api/upstream.test.ts:8:    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network timeout")));`
- `53: app/[locale]/consultations/doctors/page.tsx:17:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("su`
- `68: app/api/appointments/[appointmentId]/cancel/route.test.ts:3:vi.mock("@/lib/api/upstream",()=>({callPatientApi:state.call})); vi.mock("next/headers",()=>({cookies:async()=>state.cookies}));`
- `69: app/api/appointments/[appointmentId]/cancel/route.test.ts:7:describe("appointment cancel BFF",()=>{beforeEach(()=>{state.call.mockReset();state.cookies.get.mockImplementation((n:string)=>n==="nabd_access"?{value:"server-access"}:undefined)}`
- `80: app/[locale]/reminders/reminders-ssr.test.ts:24:    state.getPatientMedicationReminders.mockResolvedValue(new Response(JSON.stringify({ reminders: [{ id: reminderId, medicine_name_en: "Verified medicine", dose: "1 tablet", times: ["08:00"],`
- `87: app/api/appointments/[appointmentId]/payment-intent/route.test.ts:18:    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ id: "33333333-3333-4333-8333-333333333333", status: "pending", amount: 120, currency: "SAR", clien`
- `100: app/api/appointments/book/route.test.ts:24:    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ booking_id: "22222222-2222-4222-8222-222222222222", status: "pending_payment", patient_id: "must-not-leak" }), { status: 201`
- `138: app/[locale]/home-care/services/page.tsx:22:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subti`
- `151: lib/api/public-medicines-server.test.ts:8:    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connect timeout")));`
- `170: app/[locale]/diagnostics/radiology/page.tsx:21:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title"`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
