# Nabd+ Copy Guide

**Version:** 1.0  
**Owner:** Content / Product  
**Applies to:** Home, Product, Doctor, Service, Checkout, Onboarding, Notifications, Emails, SMS, PDFs, Legal texts

---

## Core Principles

### DO

| Principle | Detail | Example |
|-----------|--------|---------|
| **Benefit before feature** | Lead with what the user gains, not what the product does | "Get your medicine in 30 minutes" not "We deliver medicines" |
| **One idea per section** | 1–3 bullets max per section; no mixed concepts | Each section answers one user question |
| **Specific headlines** | Concrete, measurable, user-centric | "Same-day delivery to Riyadh" not "Fast delivery" |
| **Short, scannable paragraphs** | 1–2 sentences max; bullet points for lists | Max 160 chars per paragraph |
| **Clear CTA = verb + outcome** | Action + result in one phrase | "اطلب الآن ويصلك اليوم" / "Order now, delivered today" |
| **Answer objections before CTA** | Address: delivery time, licensed pharmacist, refund, insurance | "Licensed pharmacists review every order" |
| **Proof next to claims** | Ratings count, license number, real delivery data | "4.8★ (12,400 reviews) · MOH License 12345" |
| **First screen = what / price / speed** | Value prop, cost, timeline immediately visible | Header: "Nabd+ — Medicine delivery in 30 min. From 15 SAR." |
| **Write to one person** | Second person ("you/your"), singular, conversational | "Your prescription, delivered" not "Prescriptions delivered" |

### NEVER

| Violation | Why | Instead |
|-----------|-----|---------|
| **Fabricated medical claims (SFDA)** | Illegal; "cure", "heals permanently", "100% effective", "best" | "Supports treatment of…" / "Clinically proven to…" |
| **Generic openers** | Wastes prime real estate | Start with the specific benefit |
| **Em dashes (—)** | Hard to scan; inconsistent in RTL | Use periods, colons, or bullets |
| **Aphorisms / slogans** | Vague; no actionable info | Replace with concrete value |
| **"Not X but Y" formulas** | Negative framing; confusing in translation | State the positive directly |

---

## Banned Phrases (Per Locale)

### Arabic (ar)
- يشفي نهائيًا
- يعالج تماماً
- 100% فعال
- الأفضل
- رقم 1
- مضمون 100%
- معجزة
- علاج سحري

### English (en)
- cures completely
- 100% effective
- best
- #1
- guaranteed
- miracle
- magic cure
- permanently heals

### Urdu (ur)
- مکمل علاج
- 100% اثر
- بہترین
- یقینی
- معجزہ

### Hindi (hi)
- पूर्ण इलाज
- 100% प्रभावी
- सर्वश्रेष्ठ
- गारंटी
- चमत्कार

### Bengali (bn)
- সম্পূর্ণ চিকিত্সা
- ১০০% কার্যকর
- সেরা
- গ্যারান্টি
- চমৎকার

### Filipino (fil)
- lubusang gamot
- 100% epektibo
- pinakamahusay
- garantisado
- himala

---

## Component Length Limits

| Component | Max Characters (ar/en/ur/hi/bn/fil) | Notes |
|-----------|-------------------------------------|-------|
| **Page Title** | 60 | SEO + tab title |
| **Meta Description** | 160 | Search snippet |
| **H1 Headline** | 70 | Primary heading |
| **Sub-headline** | 120 | Supporting text |
| **CTA Button** | 25 | Verb + outcome |
| **Toast / Snackbar** | 100 | One line, no wrapping |
| **Push Notification** | 90 (title), 180 (body) | Platform limits |
| **SMS** | 160 (GSM-7) / 70 (Unicode) | Single segment |
| **Email Subject** | 50 | Preview text adds ~100 |
| **Email Preheader** | 100 | Shown in inbox list |
| **Error Message** | 140 | Actionable, not technical |
| **Empty State** | 200 | Guidance + CTA |
| **Onboarding Screen** | 140 (headline), 280 (body) | Per screen |

---

## Application by Surface

### Home
- Hero: What + Price + Speed in first viewport
- Value props: 3 max, benefit-first
- Social proof: Real numbers, recent dates

### Product / Medicine Catalog
- Name: Generic + Brand (no superlatives)
- Description: Indication + dosage form + strength
- Price: Per unit, inclusive
- Badges: Only verified (MOH, SFDA, in-stock)

### Doctor / Provider Profiles
- Headline: Specialty + Location + Availability
- Credentials: Verified badges from source
- Reviews: Count + average + recency
- CTA: "Book for [date]" not "Book now"

### Service Pages (Lab, Radiology, Nursing, etc.)
- What it is + Who it's for + How fast + Price
- Preparation steps (bulleted)
- Insurance coverage note
- CTA: "Schedule [service]"

### Checkout
- Progress: Step X of Y
- Summary: Items, fees, insurance applied, total
- Trust: Secure payment icons, license
- CTA per step: "Continue to payment" → "Place order"

### Onboarding
- One question per screen
- Skip option visible
- Progress indicator
- Benefit reminder at each step

### Notifications (Push / In-app)
- Title: Action required / Benefit delivered
- Body: One fact + CTA
- Deep link to exact screen
- Respect quiet hours

### Emails
- Subject: Benefit or urgency (no "Newsletter #5")
- Preheader: Extends subject
- One primary CTA
- Unsubscribe + preferences link

### Legal / Compliance
- Plain language first, legalese second
- Section summaries in bold
- No marketing claims in ToS/Privacy

---

## Review Checklist (Pre-merge)

- [ ] No banned phrases in any locale
- [ ] All length limits respected
- [ ] Benefit before feature in every section
- [ ] CTA = verb + outcome
- [ ] Objections answered before CTA
- [ ] Proof next to claims
- [ ] First screen: what / price / speed
- [ ] Brand name: "نبض بلس / Nabd+" (patient), "نبض بلس للأعمال / Nabd+ Business" (provider)
- [ ] Zero em dashes, aphorisms, "not X but Y"
- [ ] RTL-checked (Arabic/Urdu/Filipino)