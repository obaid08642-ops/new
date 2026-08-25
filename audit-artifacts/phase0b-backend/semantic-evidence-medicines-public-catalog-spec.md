# Phase 0B semantic evidence — Medicines public catalog contract spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/medicines/medicines.public-catalog.contract.spec.ts:1–39`

The Jest unit spec constructs `MedicinesService` with a mocked model query chain, emitter, connection and cache (`4–12`). It verifies that a Filipino locale fragment for a medication category returns a bounded localized projection from a record marked not deleted, publicly eligible, indexing eligible and medically approved; the assertion includes localized name/form/strength, price, image, prescription requirement and availability status (`14–31`). It also verifies unsupported locale and path-like category input are rejected before querying (`33–38`).

This provides useful regression evidence for category/locale allowlisting, selected public projection and publication/review filters. It does not prove all supported locales, category vocabulary completeness, fallback policy, image/URL safety, price currency/provenance, inventory freshness, prescription rules, deleted/stale/withdrawn lifecycle, pagination bounds/order, cache invalidation, rate limits, HTTP controller/auth behavior, live catalog parity, SEO/indexing metadata or JSON-LD (`15–30`).

The fixture uses `any` and a mocked `.sort().limit()` chain; it does not assert limit value, sort order, query projection completeness, count/has-more semantics or empty/error behavior (`4–11,15–30`). The test contains an example asset URL and availability `'none'` but does not establish production asset existence or truthful stock/price state. No test was run and no product code was changed during this semantic read.
