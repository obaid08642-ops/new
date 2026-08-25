# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/phase8-design-audit.txt`
- **Member SHA-256:** `45849598c1ddbf9c16968347b1c08fa71b938a7c40dea7ea81738b0cae44042d`
- **Line count:** 727
- **Read range:** `1-727`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: components-next/login-form.module.css:30:.field input::placeholder { color: var(--color-ink-subtle); }`
- `4: app/[locale]/consultations/doctors/page.tsx:17:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("su`
- `5: app/[locale]/consultations/specialties/page.tsx:31:    <form className={styles.search} method="get" role="search"><Search size={18} aria-hidden="true" /><label className="sr-only" htmlFor="specialty-search">{t("searchLabel")}</label><input `
- `50: app/[locale]/articles/page.tsx:11:export default async function ArticlesPage({params,searchParams}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Articles");const C`
- `60: app/[locale]/home-care/services/page.tsx:22:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subti`
- `61: app/[locale]/diagnostics/packages/page.tsx:24:    <form className={styles.filters} method="get" role="search"><label className={styles.search}><Search size={18} aria-hidden="true" /><span className="sr-only">{t("searchLabel")}</span><input `
- `62: app/[locale]/diagnostics/labs/page.tsx:24:    <form className={styles.filters} method="get" role="search"><label className={styles.search}><Search size={18} aria-hidden="true" /><span className="sr-only">{t("searchLabel")}</span><input name`
- `63: app/[locale]/diagnostics/radiology/page.tsx:21:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title"`
- `77: app/globals.css:92:@media (prefers-reduced-motion:no-preference) { .main:not(.premium-landing) { animation:page-enter var(--motion-enter) var(--ease-premium) both; }.brand-mark { transition:transform var(--motion-standard) var(--ease-premiu`
- `94: app/globals.css:92:@media (prefers-reduced-motion:no-preference) { .main:not(.premium-landing) { animation:page-enter var(--motion-enter) var(--ease-premium) both; }.brand-mark { transition:transform var(--motion-standard) var(--ease-premiu`
- `98: app/[locale]/wishlist/wishlist.module.css:1:.page{display:grid;gap:24px}.hero{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:28px;border:1px solid var(--line);border-radius:28px;background:linear-gradient(135`
- `99: app/[locale]/wishlist/page.tsx:23:  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Heart size={26} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody`
### backend_consumers_or_contracts
- `60: app/[locale]/home-care/services/page.tsx:22:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subti`
- `62: app/[locale]/diagnostics/labs/page.tsx:24:    <form className={styles.filters} method="get" role="search"><label className={styles.search}><Search size={18} aria-hidden="true" /><span className="sr-only">{t("searchLabel")}</span><input name`
- `63: app/[locale]/diagnostics/radiology/page.tsx:21:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title"`
- `122: app/[locale]/consultations/specialties/page.tsx:32:    {filtered.length === 0 ? <section className={styles.state}><span className={styles.stateIcon}><Search size={26} aria-hidden="true" /></span><h2>{t("emptyTitle")}</h2><p>{specialties.len`
- `179: app/[locale]/appointments/page.tsx:32:  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><CalendarDays size={25} aria-hidden="true" /></span><`
- `180: app/[locale]/appointments/page.tsx:42:  return <main className={`main ${styles.page}`}><section className={styles.header}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><Link className={styles.specialtiesLink} hre`
- `184: app/[locale]/orders/page.tsx:35:  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><PackageSearch size={25} aria-hidden="true" /></span><h1>{t`
- `185: app/[locale]/orders/page.tsx:40:  return <main className={`main ${styles.page}`}><section className={styles.intro}><div className={styles.introText}><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p>{orders.length ? t(`
- `186: app/[locale]/insurance/page.tsx:27:  if (!policyResponse.ok || !benefitsResponse.ok || !claimsResponse.ok) return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p`
- `187: app/[locale]/insurance/page.tsx:30:  if (!summary) return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p></section></main>;`
- `188: app/[locale]/insurance/page.tsx:33:    <section className={styles.hero}><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("notice")}</p></section>`
- `189: app/[locale]/insurance/page.tsx:35:    <section className={styles.claimsSection} aria-labelledby="claims-title"><div className={styles.claimsHeading}><div><p className={styles.eyebrow}><FileCheck2 size={15} aria-hidden="true" />{t("claimsEy`
### auth_ownership
- `3: components-next/login-form.module.css:30:.field input::placeholder { color: var(--color-ink-subtle); }`
- `4: app/[locale]/consultations/doctors/page.tsx:17:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("su`
- `5: app/[locale]/consultations/specialties/page.tsx:31:    <form className={styles.search} method="get" role="search"><Search size={18} aria-hidden="true" /><label className="sr-only" htmlFor="specialty-search">{t("searchLabel")}</label><input `
- `50: app/[locale]/articles/page.tsx:11:export default async function ArticlesPage({params,searchParams}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Articles");const C`
- `60: app/[locale]/home-care/services/page.tsx:22:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subti`
- `61: app/[locale]/diagnostics/packages/page.tsx:24:    <form className={styles.filters} method="get" role="search"><label className={styles.search}><Search size={18} aria-hidden="true" /><span className="sr-only">{t("searchLabel")}</span><input `
- `62: app/[locale]/diagnostics/labs/page.tsx:24:    <form className={styles.filters} method="get" role="search"><label className={styles.search}><Search size={18} aria-hidden="true" /><span className="sr-only">{t("searchLabel")}</span><input name`
- `63: app/[locale]/diagnostics/radiology/page.tsx:21:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title"`
- `70: app/globals.css:73:.session-actions { display: inline-flex; align-items: center; gap: .45rem; }.header-account, .header-signout { display: inline-flex; align-items: center; justify-content: center; gap: .4rem; min-height: 2.45rem; padding: `
- `77: app/globals.css:92:@media (prefers-reduced-motion:no-preference) { .main:not(.premium-landing) { animation:page-enter var(--motion-enter) var(--ease-premium) both; }.brand-mark { transition:transform var(--motion-standard) var(--ease-premiu`
- `81: app/icon.svg:1:<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Nabd Plus">`
- `87: app/globals.css:73:.session-actions { display: inline-flex; align-items: center; gap: .45rem; }.header-account, .header-signout { display: inline-flex; align-items: center; justify-content: center; gap: .4rem; min-height: 2.45rem; padding: `
### state_transitions
- `4: app/[locale]/consultations/doctors/page.tsx:17:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("su`
- `50: app/[locale]/articles/page.tsx:11:export default async function ArticlesPage({params,searchParams}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Articles");const C`
- `60: app/[locale]/home-care/services/page.tsx:22:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subti`
- `63: app/[locale]/diagnostics/radiology/page.tsx:21:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title"`
- `65: app/globals.css:1::root { color-scheme: light; --ink: #102334; --muted: #526473; --line: #d9e4ea; --surface: #ffffff; --canvas: #f5fafb; --brand: #0b98ae; --brand-deep: #087486; --mint: #dff7f2; --danger: #b4232c; } * { box-sizing: border-b`
- `82: app/globals.css:1::root { color-scheme: light; --ink: #102334; --muted: #526473; --line: #d9e4ea; --surface: #ffffff; --canvas: #f5fafb; --brand: #0b98ae; --brand-deep: #087486; --mint: #dff7f2; --danger: #b4232c; } * { box-sizing: border-b`
- `98: app/[locale]/wishlist/wishlist.module.css:1:.page{display:grid;gap:24px}.hero{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:28px;border:1px solid var(--line);border-radius:28px;background:linear-gradient(135`
- `99: app/[locale]/wishlist/page.tsx:23:  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Heart size={26} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody`
- `100: app/[locale]/wishlist/page.tsx:26:    <section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{items.length ? t("notice") : t("empty")}</p></d`
- `101: app/[locale]/wishlist/page.tsx:27:    {items.length ? <section className={styles.grid} aria-label={t("title")}>{items.map((item) => { const name = locale === "ar" ? item.nameAr || item.nameEn || t("untitled") : item.nameEn || item.nameAr ||`
- `102: components-next/call-token-launcher.module.css:1:.panel{display:grid;gap:.8rem;margin-top:1rem;padding:1.1rem;border:1px solid rgba(8,127,140,.15);border-radius:var(--radius-xl);background:rgba(255,255,255,.84);box-shadow:var(--shadow-sm)}.`
- `103: components-next/call-token-launcher.tsx:13:  return <section className={styles.panel} aria-labelledby="call-token-title"><div className={styles.heading}><ShieldCheck size={17} aria-hidden="true"/><h2 id="call-token-title">{labels.title}</h2`
### payment_insurance_relevance
- `4: app/[locale]/consultations/doctors/page.tsx:17:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("su`
- `50: app/[locale]/articles/page.tsx:11:export default async function ArticlesPage({params,searchParams}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Articles");const C`
- `60: app/[locale]/home-care/services/page.tsx:22:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subti`
- `63: app/[locale]/diagnostics/radiology/page.tsx:21:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title"`
- `65: app/globals.css:1::root { color-scheme: light; --ink: #102334; --muted: #526473; --line: #d9e4ea; --surface: #ffffff; --canvas: #f5fafb; --brand: #0b98ae; --brand-deep: #087486; --mint: #dff7f2; --danger: #b4232c; } * { box-sizing: border-b`
- `66: app/globals.css:13:.appointment-card { display: grid; gap: .65rem; min-width: 0; padding: 1.15rem; border: 1px solid var(--line); border-radius: 1rem; background: var(--surface); box-shadow: 0 14px 32px rgba(22,71,84,.06); transition: trans`
- `67: app/globals.css:15:.appointment-card:focus-visible { outline: 3px solid rgba(11,152,174,.25); outline-offset: 3px; }`
- `68: app/globals.css:23:.medicine-card { display: grid; gap: .6rem; min-width: 0; padding: 1.15rem; border: 1px solid var(--line); border-radius: 1rem; background: var(--surface); box-shadow: 0 14px 32px rgba(22,71,84,.06); transition: transform`
- `69: app/globals.css:25:.medicine-card:focus-visible { outline: 3px solid rgba(11,152,174,.25); outline-offset: 3px; }`
- `74: app/globals.css:85:@media (prefers-reduced-motion: no-preference) { .topbar, .trust-card, .premium-trust-card, .quickTile, .featureCard, .moreLink, .medicine-card, .appointment-card, .notification-card, .reminder-card, .order-card, .button,`
- `82: app/globals.css:1::root { color-scheme: light; --ink: #102334; --muted: #526473; --line: #d9e4ea; --surface: #ffffff; --canvas: #f5fafb; --brand: #0b98ae; --brand-deep: #087486; --mint: #dff7f2; --danger: #b4232c; } * { box-sizing: border-b`
- `83: app/globals.css:13:.appointment-card { display: grid; gap: .65rem; min-width: 0; padding: 1.15rem; border: 1px solid var(--line); border-radius: 1rem; background: var(--surface); box-shadow: 0 14px 32px rgba(22,71,84,.06); transition: trans`
### error_empty_loading_retry_cancel
- `4: app/[locale]/consultations/doctors/page.tsx:17:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("su`
- `50: app/[locale]/articles/page.tsx:11:export default async function ArticlesPage({params,searchParams}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Articles");const C`
- `60: app/[locale]/home-care/services/page.tsx:22:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subti`
- `63: app/[locale]/diagnostics/radiology/page.tsx:21:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title"`
- `65: app/globals.css:1::root { color-scheme: light; --ink: #102334; --muted: #526473; --line: #d9e4ea; --surface: #ffffff; --canvas: #f5fafb; --brand: #0b98ae; --brand-deep: #087486; --mint: #dff7f2; --danger: #b4232c; } * { box-sizing: border-b`
- `82: app/globals.css:1::root { color-scheme: light; --ink: #102334; --muted: #526473; --line: #d9e4ea; --surface: #ffffff; --canvas: #f5fafb; --brand: #0b98ae; --brand-deep: #087486; --mint: #dff7f2; --danger: #b4232c; } * { box-sizing: border-b`
- `99: app/[locale]/wishlist/page.tsx:23:  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Heart size={26} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody`
- `100: app/[locale]/wishlist/page.tsx:26:    <section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{items.length ? t("notice") : t("empty")}</p></d`
- `101: app/[locale]/wishlist/page.tsx:27:    {items.length ? <section className={styles.grid} aria-label={t("title")}>{items.map((item) => { const name = locale === "ar" ? item.nameAr || item.nameEn || t("untitled") : item.nameEn || item.nameAr ||`
- `102: components-next/call-token-launcher.module.css:1:.panel{display:grid;gap:.8rem;margin-top:1rem;padding:1.1rem;border:1px solid rgba(8,127,140,.15);border-radius:var(--radius-xl);background:rgba(255,255,255,.84);box-shadow:var(--shadow-sm)}.`
- `103: components-next/call-token-launcher.tsx:13:  return <section className={styles.panel} aria-labelledby="call-token-title"><div className={styles.heading}><ShieldCheck size={17} aria-hidden="true"/><h2 id="call-token-title">{labels.title}</h2`
- `104: components-next/appointment-reschedule-form.module.css:1:.panel{display:grid;gap:.8rem;margin-top:1rem;padding:1.1rem;border:1px solid rgba(8,127,140,.15);border-radius:var(--radius-xl);background:rgba(255,255,255,.84);box-shadow:var(--shad`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
