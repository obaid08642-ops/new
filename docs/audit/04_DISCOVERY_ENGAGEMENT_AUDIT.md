# Discovery and engagement audit: notifications, deep links, SEO and AI search (reviewer, 2026-09-29)

**Method.** Everything below was tested on a local stack at `main` (`f5e3353`):
- backend, the patient website and the admin panel were running;
- the catalog was loaded through the production importer (`mapV14Row`) with sample medicines in all 6 languages;
- the live gate data was used for notifications.

The production domains (`nabd.plus`, `api.nabd.plus`, `mcp.nabd.plus`) are blocked by this environment's network policy. The real catalog size and the live pages were therefore not checked here.

The tasks for the agent are in the execution plan as **PHASE 7E** (`02_AGENT_EXECUTION_PLAN.md`). This file holds the evidence.

## Fixed by the reviewer in this PR (tested live)
| Problem | Evidence before | After |
|---|---|---|
| The MCP server rejected every request from real AI clients. The DTO typed the JSON-RPC `id` as a string; ChatGPT, Claude and others send a number. | `{"id":1,"method":"tools/list"}` returned 400. | 9 tools listed, `id:1` echoed. Test: `mcp.dto.spec.ts`. |
| The full private API spec was public at `https://nabd.plus/openapi.json`: 1,487 paths, 351 of them admin. The backend build copied it into `patient-web/public`. | `/openapi.json` returned 200, 921 KB. | Returns 404. The copy was removed from the build script and the file deleted. Agents use the curated `/.well-known/openapi.json`. |
| The sitemap index was prerendered at build time, when the backend is unreachable. **It listed no product sitemaps**, so none of the medicine pages were in it. | The index had 9 fixed entries and 0 `products/*`. | Now `force-dynamic`: it lists `products/{ar,en,ur,hi,bn,fil}/N.xml`. |
| Product sitemap hreflang reused one locale's slug for all 6 locales. These alternates are non-canonical, and Google ignores hreflang that points to non-canonical URLs. | `/en/…/panadol` listed `ar → /ar/p/panadol`, while the canonical is `/ar/p/ar-panadol`. | The backend returns each locale's slug; the sitemap emits each locale's canonical URL plus `x-default`. |
| `<html lang="ar" dir="rtl">` was set on every locale: English, Hindi and Filipino pages declared themselves Arabic and RTL. | `/en/p/panadol` → `lang="ar"`. | `lang`/`dir` follow the locale (en→ltr, ur→rtl, …). |
| Admin could not send a notification to any group: `/notification-center/broadcasts` required `audience_confirmed`, but `BroadcastDto` rejected that field (dead end). | Both variants returned 400. | patients 18, providers 33, pharmacy 4, doctor 10, lab 6, nurse 3, hospital 3, ambulance 3 (gate DB). The UI now asks for confirmation. |
| Segment roles did not match stored roles: nurses are `home_care`/`nursing`, and hospital and ambulance were missing. The `role:admin` option was rejected by the server. | `role:nurse` returned an empty audience; providers reached 24 of 33. | Role aliases added; the UI offers lab, radiology, nurse, hospital and ambulance. |
| The provider app never registered its push token: it fetched the token and threw it away. **Providers received no push at all, not even for new orders.** | No call to `registerForPushNotificationsAsync`. | Registered on `appState === 'logged_in'`. The provider JWT `id` equals the account id, which is the id the server pushes to. |
| Provider pushes (`notifyProviderAccount`) had no title and no body. | `sendPush({type, action})` only. | Sends the bell text (ar, en fallback). Test added. |
| The catalog importer wrote to the legacy `medicines_master`; every reader uses `medicines` (P5.1). A re-import of the 21k catalog would not have reached the site. | `collection('medicines_master')`. | Uses `CATALOG_COLLECTIONS.medicines`. |

## What works today (verified)
- **Medicine page `/{locale}/p/{slug}`:**
  - public, SSR, `index,follow`;
  - title and description in the page language;
  - canonical, 6 hreflang links plus `x-default`, OG image;
  - JSON-LD: Product (Offer: price, availability, shipping, return policy), MedicalDrug, BreadcrumbList, FAQPage and HowTo;
  - all 6 languages render translated text.
- **Search** finds medicines by Arabic name, English name and active ingredient (`بنادول`, `panadol` and `paracetamol` all find Panadol).
- **MCP tools** `search_medicines`, `get_entity_detail`, `prepare_transaction` and the others return real prices and canonical URLs, now that the id bug is fixed.
- **`robots.txt`** allows the public catalog to all search and AI crawlers. `llms.txt` is present.

## Open, for the agent: see PHASE 7E in the execution plan
The groups are:
- notifications (routing on tap, provider inbox, dead events, admin control);
- deep links (the iOS app ID, locale-prefixed links, provider app);
- SEO (sitemap correctness, doorway pages, the medicine page showing only about 5 of 21 fields per language, articles);
- AI commerce (the checkout links end on a 404, VAT added on medicines, streamable-HTTP MCP, product feeds).

## Needs the owner (cannot be done in code)
- Allow `nabd.plus`, `api.nabd.plus` and `mcp.nabd.plus` in this environment's network access, so the reviewer can check production (real catalog count, live pages, Rich Results).
- Confirm the Apple Team ID (`6AT2W85DBC`?) and the Play **App Signing** SHA-256 fingerprint (Play Console → App integrity). The current fingerprint is a placeholder shared by all packages.
- Google Search Console and Bing Webmaster Tools: verify `nabd.plus`, submit `https://nabd.plus/sitemap.xml`, watch Coverage and Enhancements.
- Google Business Profile for the company, and for partner pharmacies, clinics and labs if they allow it (local ranking).
- Merchant listings (Google Merchant Center free listings, Microsoft Merchant Center, and the OpenAI/ChatGPT product feed program if you want shopping answers). Online pharmacies need SFDA-compliant listings; prescription drugs cannot be advertised. Decide which OTC categories to list.
- Content credibility (E-E-A-T): a named pharmacist or doctor as medical reviewer, shown on pages with `reviewedBy` and `lastReviewed`, and an "About / editorial policy" page. Google and AI assistants weigh this heavily for health topics.

**No one can guarantee first place on Google or in AI answers.** What we control is to be:
- technically perfect: crawlable, fast, one canonical URL per language, correct structured data;
- the most complete and trustworthy page for each medicine, doctor and service in all 6 languages;
- easy for AI agents to query and transact with (MCP and product feeds).
