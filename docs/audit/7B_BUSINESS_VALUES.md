# 7B — Business Values Inventory

Every business setting moved out of code into admin-editable, validated and
audited config. No hardcoded business values remain in the earn/redeem path.

## Commission & VAT

| Value | Default | Collection | Endpoint |
|---|---|---|---|
| Platform commission rate | 12% | `finance_config` | `PUT /admin/finance/commissions/config` |
| VAT rate | 15% | `finance_config` | `PUT /admin/finance/commissions/config` |
| Settlement delay | 7 days | `finance_config` | `PUT /admin/finance/commissions/config` |
| Payout minimum | 100 SAR | `finance_config` | `PUT /admin/finance/commissions/config` |

## Dispute & Compensation

| Value | Default | Collection | Endpoint |
|---|---|---|---|
| Max refund per dispute | 2000 SAR | `system_configs` (key `dispute_config`) | `PUT /admin/disputes/config` |
| Max goodwill compensation | 500 SAR | `system_configs` (key `orders_console_config`) | `PUT /admin/orders-console/config` |
| Refund window | 14 days | `system_configs` (key `returns_policy`) | via admin config |

## Loyalty

| Value | Default | Collection | Endpoint |
|---|---|---|---|
| Max redeem percent | 10% | `loyalty_config` (key `global`) | `PUT /admin/loyalty/config` |
| Point value | 0.1 SAR | `loyalty_config` (key `global`) | `PUT /admin/loyalty/config` |
| Redeem enabled | true | `loyalty_config` (key `global`) | `PUT /admin/loyalty/config` |
| Earn points (booking) | 50 | `loyalty_config` (key `global`) | `PUT /admin/loyalty/config` |
| Earn points (order) | 30 | `loyalty_config` (key `global`) | `PUT /admin/loyalty/config` |
| Earn points (review) | 20 | `loyalty_config` (key `global`) | `PUT /admin/loyalty/config` |
| Earn points (referral) | 100 | `loyalty_config` (key `global`) | `PUT /admin/loyalty/config` |
| Daily earn caps | per-activity | `loyalty_config` (key `global`) | `PUT /admin/loyalty/config` |
| Monthly earn caps | per-activity | `loyalty_config` (key `global`) | `PUT /admin/loyalty/config` |

## Feature Flags

| Flag | Default | Collection | Endpoint |
|---|---|---|---|
| `video_calls` | true | `system_configs` (key `features`) | `PUT /admin/config/features` |
| `wearables_enabled` | false | `system_configs` (key `features`) | `PUT /admin/config/features` |
| `redeem_enabled` | true | `loyalty_config` (key `global`) | `PUT /admin/loyalty/config` |

## Audit

Every change writes an entry to `audit_logs` with actor, old value, new value
and timestamp. The admin audit log viewer (`/admin/audit-logs`) filters by
actor, entity, action and date.
