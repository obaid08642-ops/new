# Phase 0B semantic evidence — Admin heatmap data schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/admin-web-core/schemas/heatmap-data.schema.ts:1–24`

`HeatmapData` is a timestamped schema containing required `clusterId`, latitude, longitude, intensity and a type enum limited to `home_care`, `diabetes_program` and `pharmacy_drop` (`heatmap-data.schema.ts:6–21`). Latitude/longitude have no numeric range, precision, geofence, coordinate reference system or quantization requirement. `intensity` has no non-negative/range/unit/source definition. `clusterId` has no uniqueness, derivation or anonymization contract. The schema has no tenant/facility ownership, source timestamp, retention, aggregation threshold or privacy policy, so precise location clusters could enable re-identification if exposed in admin/public analytics. No product code was changed and no tests/builds were executed during this semantic read.
