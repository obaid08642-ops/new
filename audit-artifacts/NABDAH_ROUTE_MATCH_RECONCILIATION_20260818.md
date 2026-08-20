# Nabdah route match reconciliation — initial compiled pass

The direct Nabdah Backend source produced 933 composed controller routes after combining class-level and method-level decorators. The consumer inventory produced 587 path-like records in this first pass; 235 matched a compiled backend route and 352 require review.

The 352 review records are not a defect count. The extractor also captured client navigation destinations such as `/(tabs)` and `/(auth)`, plus dynamic/template expressions that are not API calls. The next pass must filter navigation-only paths and recover HTTP methods from the actual `apiFetch`, Axios, or client helper call before assigning PASS, FIX, BLOCKED, or INCONCLUSIVE.
