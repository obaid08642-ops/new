# 14.20 Media: where each part stands

| Bullet | State | Where |
|---|---|---|
| Resized on the fly, AVIF/WebP, `srcset`/`sizes` | done for product pictures; **doctor, clinic and insurance pictures now too (this PR)** | Next's optimizer (`next.config.ts` `images.formats: avif, webp`). Product: `CatalogImage` (stage, thumbnails) and the cards (#1515). This PR: `lib/media/optimized-image.ts` for the plain `<img>` the CSP needs (no inline style): doctor cards (128 px box), the doctor/clinic profile photo (88 px), the doctor's clinic gallery (192 px, lazy), the clinic cover (phone width), insurer logos (44 px, lazy). Each address is the 2x rendition, quality 75 |
| Lazy below the fold; placeholders | done | `loading="lazy"` + `decoding="async"` on gallery, logos and thumbnails; a picture-less card shows the service glyph in its tone box (no layout shift: fixed boxes) |
| LCP image preloaded | **this PR** | `CatalogImage` with `priority` (the product page's stage picture) now puts `<link rel="preload" as="image" imagesrcset imagesizes fetchpriority="high">` in the head (`react-dom` `preload`; `<Image priority>` would do it but carries an inline style the CSP refuses) |
| Originals in object storage | done | uploads go to R2 (`backend/src/modules/storage`), served from `cdn.nabd.plus`; the optimizer reads them from there |
| EXIF/GPS stripped on upload (16.5) | done | `backend/src/modules/storage/upload-security.service.ts` (re-encoded with sharp, no metadata) |

Budget (14.20 Verify: product and doctor pictures ≤ 60 KB on mobile): a doctor card now loads a 256 px AVIF/WebP
instead of the original upload; a product card 256 px (#1515); the product stage picture is sized by `sizes`
(`100vw` on a phone, up to 828 px). The number per picture is measured on production after the deploy with
`curl -s -o /dev/null -w '%{size_download}' -H 'Accept: image/avif' 'https://nabd.plus/_next/image?url=…&w=256&q=75'`.
