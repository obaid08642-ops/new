# Catalogue pictures backfill from the bucket listing (issue 1556)

The CDN bucket (R2 behind cdn.nabd.plus) holds 1-5 pictures per product as `<code>_<n>.<ext>` or `<code>_img_<n>.<ext>`
(`code` = the product's `source_product_id`). The v14 import kept one per product. The backfill reads the **bucket
listing** (S3 ListObjectsV2 against the R2 endpoint), never guessed URLs, and writes every picture in order of `n`
into `images[]`, `image`, `image_1`…`image_5`. Picture entries that are not bucket keys (admin uploads) are kept after them.
No new or stock pictures are added: a product with no key in the bucket is listed as `products_without_bucket_keys`
and its pictures are the owner's to supply.

Run on the API server (it needs read access to the bucket and the production database):

```sh
cd backend
export MONGODB_URI=... DB_NAME=...
export S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com S3_REGION=auto S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=...
export CATALOGUE_IMAGES_BUCKET=<catalogue bucket>   # default S3_BUCKET
export CATALOGUE_IMAGES_PREFIX=                      # key prefix inside the bucket, if any
# 1. dry run: prints pictures per product before / in the bucket / after, and how many rows would change
npx ts-node --transpile-only scripts/migrations/2026-10-catalogue-images-from-bucket.ts
# optional: a few products first
npx ts-node --transpile-only scripts/migrations/2026-10-catalogue-images-from-bucket.ts --codes=231925,509743
# 2. write, then purge the "medicines" cache tag (Cloudflare Cache-Tag + Next revalidateTag;
#    needs CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID, NEXT_REVALIDATE_URL, NEXT_REVALIDATE_SECRET)
npx ts-node --transpile-only scripts/migrations/2026-10-catalogue-images-from-bucket.ts --apply --purge
# 3. run the dry run again: would_change must be 0
```

The script is idempotent (a product already holding the bucket list in order is not written) and can be stopped
and run again. Paste the before/after report lines on issue 1556.
