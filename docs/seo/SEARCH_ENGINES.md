# Search engines: what is set up and what the owner adds

## IndexNow (Bing, Yandex, Seznam, Naver and others)
Already live, nothing new to build:
- Key file: `https://nabd.plus/indexnow-key.txt` (patient-web `app/indexnow-key.txt`, value from `INDEXNOW_KEY`, default `nabdplusindexnowkey`).
- Ping on publish/update: `SeoIndexingListener` → `SeoIndexingService` → `IndexNowService.submitUrls` (api.indexnow.org, which shares the URL with every participating engine) with the six language URLs of each medicine, lab, radiology, nursing service, provider, facility, pharmacy or article that is added, changed or removed.
- Optional hardening: set `INDEXNOW_KEY` in the backend and web env to a random 32-character key (the default is a public constant). Both services read the same variable.

## Google Merchant Center and Microsoft Merchant Center
- Feed URLs, one per language: `https://nabd.plus/feeds/google-merchant/{ar,en,ur,hi,bn,fil}.xml` (RSS 2.0 with `g:` fields; Microsoft Merchant Center accepts the same file).
- Contents: only over-the-counter, non-controlled, indexable products with a price. A prescription medicine is never in the feed (also a Merchant policy). Each item: id (SKU), title, description, link (canonical product page), image link (CDN), availability, price in SAR, condition, brand (manufacturer), GTIN when the barcode is a valid GTIN-8/12/13/14, otherwise `identifier_exists=no`; items without a picture are left out.
- Product pages already carry schema.org `Product` + `Offer` (price, currency, availability, GTIN).
- Owner: in Merchant Center add a primary feed per target country/language with the URL above, set it to fetch daily, and check its health/policy review for the pharmacy category.

## Search Console and Bing Webmaster verification (DNS)
Task pair `tools/ops/cf/51-search-verification-{check,apply}.sh` adds the records from GitHub secrets (values are never printed) and removes what it added if DNS does not show it.

| Secret (GitHub → Settings → Secrets) | Where the owner gets the value |
|---|---|
| `GSC_VERIFICATION_TOKEN` | Search Console → Add property → **Domain** `nabd.plus` → it shows `google-site-verification=XXXX`; paste the whole string or only `XXXX` |
| `BING_VERIFICATION_CNAME` | Bing Webmaster Tools → Add site → verify by **CNAME**; paste the host label Bing shows (32 hex characters) |

Bing can alternatively import the site from Search Console, then only the Google secret is needed.
The `review/server-inspect` workflow's Cloudflare step must pass both secrets as env (`GSC_VERIFICATION_TOKEN: ${{ secrets.GSC_VERIFICATION_TOKEN }}`, `BING_VERIFICATION_CNAME: ${{ secrets.BING_VERIFICATION_CNAME }}`), like `EMAIL_ROUTING_DEST`. Then run `cf:51-search-verification-check`, `cf:51-search-verification-apply`, and press Verify in each console. After verifying, submit `https://nabd.plus/sitemap.xml`.

## Sitemap / hreflang / canonical check
`node tools/seo/verify-discovery.mjs [--site https://nabd.plus] [--per-sitemap 3]` reads the live sitemap index and samples each child sitemap: six language alternates + `x-default` in the sitemap, self-canonical, page hreflang equal to the sitemap's, alternates answer 200 and point back. Exit 1 on any problem.
