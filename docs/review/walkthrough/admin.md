# Admin dashboard walkthrough (2026-10-16)

Method: `tools/live/admin_walkthrough.py` signs in as the seeded admin (`admin@nabd.test`) and super admin (`owner@nabd.test`) on the live-gate stack and visits every admin route, clicks every non-destructive control, and records HTTP 4xx/5xx, JS errors, error text, empty pages, dead links, overflow and slow loads. Destructive and emergency-switch buttons are listed as not clicked (API journeys cover them).

## Raw counts (run adw2, main at 8e5c80325 + crawler)
| role | routes | links checked | buttons clicked | buttons not clicked (destructive) | selects | searches | rows | tabs |
|---|---|---|---|---|---|---|---|---|
| admin | 67 | 66 | 253 | 65 | 259 | 15 | 28 | 0 |
| super_admin | 67 | 69 | 255 | 64 | 259 | 15 | 28 | 0 |

Crawler output: 35 defect lines (7 admin, 28 super_admin). After triage: 6 distinct real defects (D1-D6 below, D1 is 25 of the 28 super_admin lines), 5 reclassified as not defects.

## Confirmed defects
| id | page / control | what happens | what should happen | file:line | class |
|---|---|---|---|---|---|
| D1 | `/admin/approvals`, `/admin/catalog-manager` as super_admin: load and every button | `GET labs/admin/catalog`, `radiology/admin/catalog`, `nursing/admin/catalog` -> 403; the catalogue screens show "failed to load" | a super admin can do everything an admin can: lists load, approve/edit/delete work | `backend/src/modules/labs/labs.service.ts:799-850`, `radiology/radiology.service.ts:630-690`, `home-care/home-care.service.ts:179-200,280-312` (`user.role !== 'admin'` / `getEffectiveRoles(user).includes('admin')`); the controller `@Roles(ADMIN)` already lets super_admin in, the service refuses | broken |
| D2 | `/admin/orders` "تصدير CSV" | link `/api/admin/orders/export` -> 404 (verified live); the working path is `/api/admin/admin/orders/export` (200) | the CSV downloads | `admin/src/pages/admin/orders/index.tsx:41` (`exportUrl`) | broken |
| D3 | `/admin/orders` export with a "problem" filter (stuck, SLA, failed payment, refund) | the filter is dropped, the CSV holds all orders | the CSV matches what the table shows | `admin/src/pages/admin/orders/index.tsx:41`; backend `admin-orders.controller.ts:40-55` and `exportCsv` take no `problem` | wrong |
| D4 | `/admin/locations` search with no match | blank table, no message | an empty-state sentence | `admin/src/pages/admin/locations.tsx:70` (`emptyText=""`) | missing |
| D5 | `/admin/locations` "تعطيل" on a region/city with active children | backend answers 400 `has_active_children`; the page shows the raw code / generic failure | an Arabic reason ("disable the districts first") | `admin/src/pages/admin/locations.tsx:42-44` | copy |
| D6 | `/admin/orders` status filter | free-text input; the table shows raw backend status values (English codes) | a select of real statuses with Arabic labels | `admin/src/pages/admin/orders/index.tsx:53,67` | illogical |

## Reclassified (not defects)
- `/admin/loyalty-config` "إضافة" and "إضافة تحدٍ" (400): the crawler clicked with an empty required title; server validation is right.
- `/admin/segments` "معاينة الجمهور" (400): empty rule value, validation is right.
- `/admin/command-center` "never network-idle, 8.1 s": the page holds an `EventSource` to `/api/admin/admin/stream` (`command-center.tsx:36`), so the network is never idle by design; the load event itself is fast. The crawler now times the load event only.
- Crawler fixes: a 400/422 on a write from a button is recorded as a note, not a defect.

## Static findings (read from the code)
| finding | status |
|---|---|
| Admin has no i18n; all strings are hard-coded Arabic (`admin/src`) | confirmed (grep: no i18n library or locale files) |
| 135 native `alert`/`confirm`/`prompt` calls although `ConfirmDialog` exists | confirmed (grep) |
| 183 `any` casts in pages/components | confirmed (grep) |
| Two order detail pages: `pages/admin/order-detail.tsx` (dashboard) and `pages/admin/orders/[kind]/[id].tsx` (orders list) | confirmed |
| `dashboard.tsx:194` falls back to `href='#'` when an order has no kind/id | confirmed in code, not seen live (seed orders have both) |
| ~180 other backend services test `user.role !== 'admin'` (see `grep "role !== 'admin'" backend/src/modules`), so super_admin is refused outside the catalogue too (e.g. home-care booking reads, labs sample reads, support, medical reports) | confirmed in code, not exercised live; remaining after D1 |

## Not covered by this run
Tabs (the admin has none), destructive buttons, form flows with filled data (only API journeys cover them), mobile width, dark mode.
